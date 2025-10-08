import { BaseDocumentLoader } from '@langchain/core/document_loaders/base';
import { Document } from '@langchain/core/documents';
import { BoxAuth, BoxLoaderOptions, BoxClient, BoxAuthType } from './types';
import type { Item } from 'box-node-sdk/lib/schemas/item.js';
import { isImageFile, isVideoFile } from './utilities';

const BOX_AI_LIBRARY = 'langchain.js';

/**
 * Box document loader that can load files by ID or from folders
 */
export class BoxLoader extends BaseDocumentLoader {
  private boxAuth?: BoxAuth;
  private boxClient?: BoxClient;
  private boxFileIds?: string[];
  private boxFolderId?: string;
  private recursive: boolean = false;
  private characterLimit?: number;

  constructor(options: BoxLoaderOptions) {
    super();
    
    if (!options.boxAuth && !options.boxClient) {
      // Try to get developer token from environment
      const developerToken = process.env.BOX_DEVELOPER_TOKEN;
      if (developerToken) {
        this.boxAuth = new BoxAuth({
          authType: BoxAuthType.TOKEN,
          boxDeveloperToken: developerToken
        });
      } else {
        throw new Error('Must provide either boxAuth or boxClient, or set BOX_DEVELOPER_TOKEN environment variable');
      }
    }

    // Preserve env-created auth/client when options don't provide one
    this.boxAuth = options.boxAuth ?? this.boxAuth;
    this.boxClient = options.boxClient ?? this.boxClient;
    this.boxFileIds = options.boxFileIds;
    this.boxFolderId = options.boxFolderId;
    this.recursive = options.recursive || false;
    this.characterLimit = options.characterLimit;

    if (!this.boxFileIds && !this.boxFolderId) {
      throw new Error('Must provide either boxFileIds or boxFolderId');
    }
  }

  /**
   * Get the Box client instance
   */
  private async getClient(): Promise<BoxClient> {
    if (this.boxClient) {
      return this.boxClient;
    }
    if (this.boxAuth) {
      return await this.boxAuth.getClient();
    }
    throw new Error('No Box client or auth configuration available');
  }

  /**
   * Load documents from Box
   */
  async load(): Promise<Document[]> {
    const documents: Document[] = [];
    
    if (this.boxFileIds) {
      // Load specific files by ID
      for (const fileId of this.boxFileIds) {
        const doc = await this.loadFileById(fileId);
        if (doc) {
          documents.push(doc);
        } else {
          console.warn(`Failed to load file ${fileId}. Check previous error logs for details.`);
        }
      }
    } else if (this.boxFolderId) {
      // Load files from folder
      const folderDocs = await this.loadFromFolder(this.boxFolderId, this.recursive);
      documents.push(...folderDocs);
    } else {
      throw new Error('No boxFileIds or boxFolderId provided');
    }

    return documents;
  }

  /**
   * Load a single file by ID
   */
  private async loadFileById(fileId: string): Promise<Document | null> {
    try {
      const client = await this.getClient();
      const token = await (client as any).auth.retrieveToken();

      const fileInfo = await client.files.getFileById(fileId, {
        headers: { 'x-box-ai-library': BOX_AI_LIBRARY }
      } as any);

      const fileName = fileInfo.name || '';
      if (isImageFile(fileName) || isVideoFile(fileName)) {
        console.warn(`Skipping non-text file ${fileName} (ID: ${fileId})`);
        return null;
      }

      const repType = this.getRepresentationTypeForFilename(fileName);

      let content = '';
      try {
        const { rep, content: repContent } = await this.getReadyRepresentation(client, fileId, token, fileName, repType);
        if (!rep) {
          content = repContent || '';
        } else {
          const { url, content: urlContent } = await this.getRepresentationUrlFromInfo(rep.info?.url, token, fileName, fileId, repType);
          if (!url) {
            content = urlContent || '';
          } else {
            const { text, content: textContent } = await this.fetchFromRepresentationUrl(url, token, fileName, repType);
            content = text ?? textContent ?? '';

            // If representation content is empty on first try, refresh status and retry fetch
            if ((content ?? '').trim().length === 0) {
              console.warn(`Empty ${repType} content received for ${fileName}. Rechecking representation status and retrying...`);
              const maxEmptyRetries = 2;
              for (let attempt = 1; attempt <= maxEmptyRetries; attempt++) {
                const delayMs = 1000 * attempt;
                await new Promise((resolve) => setTimeout(resolve, delayMs));
                try {
                  const refreshed = await this.getReadyRepresentation(client, fileId, token, fileName, repType);
                  if (!refreshed.rep) {
                    continue;
                  }
                  const { url: retryUrl } = await this.getRepresentationUrlFromInfo(refreshed.rep.info?.url, token, fileName, fileId, repType);
                  if (!retryUrl) {
                    continue;
                  }
                  const { text: retryText } = await this.fetchFromRepresentationUrl(retryUrl, token, fileName, repType);
                  if ((retryText ?? '').trim().length > 0) {
                    content = retryText as string;
                    break;
                  }
                } catch (retryError) {
                  console.warn(`Retry ${attempt}/${maxEmptyRetries} failed to retrieve non-empty ${repType} content for ${fileName}.`, retryError);
                }
              }
            }
          }
        }
      } catch (error) {
        const anyError = error as any;
        const status = anyError?.statusCode || anyError?.response?.status;
        if (status === 401 || status === 403) {
          console.error(`Authentication error accessing file ${fileName} (ID: ${fileId}): invalid or expired token.`, error);
        } else {
          console.error(`Error accessing file ${fileName} (ID: ${fileId}):`, error);
        }
        content = `[Error reading file: ${fileName}]`;
      }

      if (this.characterLimit && content.length > this.characterLimit) {
        content = content.substring(0, this.characterLimit);
      }

      return new Document({
        pageContent: content,
        metadata: {
          source: `box://file/${fileId}`,
          file_id: fileId,
          file_name: fileInfo.name || '',
          file_type: fileInfo.extension || '',
          file_size: fileInfo.size || 0,
          created_at: fileInfo.createdAt || '',
          modified_at: fileInfo.modifiedAt || '',
          box_url: `https://app.box.com/file/${fileId}`
        }
      });
    } catch (error) {
      const anyError = error as any;
      const status = anyError?.statusCode || anyError?.response?.status || anyError?.status;
      const message = anyError?.message || anyError?.response?.body?.message;
      if (status === 401 || status === 403) {
        console.error(`Authentication error loading file ${fileId}: invalid or expired token.`, { status, message, error: anyError });
      } else {
        console.error(`Error loading file ${fileId}.`, { status, message, error: anyError });
      }
      return null;
    }
  }

  private getRepresentationTypeForFilename(fileName: string): string {
    const lower = (fileName || '').toLowerCase();
    const dotIndex = lower.lastIndexOf('.');
    const ext = dotIndex >= 0 ? lower.substring(dotIndex) : '';
    const markdownExts = ['.docx', '.pptx', '.xls', '.xlsx', '.xlsm', '.gdoc', '.gslide', '.gslides', '.gsheet', '.pdf'];
    return markdownExts.includes(ext) ? "markdown" : "extracted_text";
  }

  /**
   * Retrieve a ready representation or return a descriptive content message
   */
  private async getReadyRepresentation(client: BoxClient, fileId: string, token: any, fileName: string, repType: string): Promise<{ rep?: any; content?: string }> {
    const fileWithReps = await client.files.getFileById(fileId, {
      headers: {
        'x-rep-hints': repType,
        'x-box-ai-library': BOX_AI_LIBRARY,
        "Authorization": `Bearer ${token?.accessToken}`
      },
      queryParams: { fields: ['name', 'representations', 'type'] },
    } as any);

    if (!fileWithReps.representations || !fileWithReps.representations.entries) {
      console.error(`Representations list is empty for ${fileName} (ID: ${fileId})`);
      return { content: `[Error: No representations available for ${fileName}]` };
    }

    const found = fileWithReps.representations.entries.find((rep: any) => rep.representation === repType);
    if (!found) {
      console.error(`No ${repType} representation found for ${fileName} (ID: ${fileId})`);
      return { content: `[Error: No ${repType} representation available for ${fileName}]` };
    }

    let workingRep: any = found;
    let state: string | undefined = workingRep.status?.state as string | undefined;
    let isReady = (!state && !!workingRep.info?.url) || state === 'success' || state === 'viewable';

    if (!isReady && (state === 'pending' || state === 'processing')) {
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const delayMs = 1500 * attempt;
        console.warn(`${repType} representation not ready for ${fileName} (ID: ${fileId}). Retrying in ${delayMs}ms (${attempt}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        const refreshed = await client.files.getFileById(fileId, {
          headers: {
            'x-rep-hints': repType,
            'x-box-ai-library': BOX_AI_LIBRARY,
            "Authorization": `Bearer ${token?.accessToken}`
          },
          queryParams: { fields: ['name', 'representations', 'type'] },
        } as any);
        const refreshedRep = refreshed.representations?.entries?.find((rep: any) => rep.representation === repType);
        if (refreshedRep) {
          workingRep = refreshedRep;
          state = workingRep.status?.state as string | undefined;
          isReady = (!state && !!workingRep.info?.url) || state === 'success' || state === 'viewable';
          if (isReady) break;
        }
      }
    }

    if (isReady && workingRep.info?.url) {
      return { rep: workingRep };
    }

    if (state === 'pending' || state === 'processing') {
      const statusMessage = (workingRep.status as any)?.message as string | undefined;
      console.warn(`${repType} representation is not ready for ${fileName} (ID: ${fileId}) yet: ${state}${statusMessage ? ` - ${statusMessage}` : ''}`);
      return { content: `[Info: ${repType} representation still processing for ${fileName}]` };
    }
    if (state === 'none') {
      console.warn(`No ${repType} representation available for ${fileName} (ID: ${fileId}).`);
      return { content: `[Error: No ${repType} representation available for ${fileName}]` };
    }
    if (state === 'error' || state === 'failed') {
      const statusMessage = (workingRep.status as any)?.message as string | undefined;
      console.error(`${repType} representation generation failed for ${fileName} (ID: ${fileId})${statusMessage ? `: ${statusMessage}` : ''}`);
      return { content: `[Error: ${repType} extraction failed for ${fileName}]` };
    }

    console.warn(`Unknown ${repType} representation state for ${fileName} (ID: ${fileId}): ${state ?? 'unknown'}`);
    return { content: `[Error: Unknown ${repType} representation state for ${fileName}]` };
  }

  /**
   * Fetch representation template URL from info URL
   */
  private async getRepresentationUrlFromInfo(infoUrl: string | undefined, token: any, fileName: string, fileId: string, repType: string): Promise<{ url?: string; content?: string }> {
    if (!infoUrl) {
      console.error(`Missing representation info URL for ${fileName} (ID: ${fileId})`);
      return { content: `[Error: No ${repType} representation URL available for ${fileName}]` };
    }

    const response = await fetch(infoUrl, {
      headers: { "Authorization": `Bearer ${token?.accessToken}`, 'x-box-ai-library': BOX_AI_LIBRARY },
    });
    if (response.status !== 200) {
      console.error(`Failed to fetch ${repType} representation URL for ${fileName}: ${response.status} ${response.statusText}`);
      return { content: `[Error: Failed to get ${repType} representation URL for ${fileName} - Status: ${response.status}]` };
    }
    try {
      const representationData = await response.text();
      const parsedData = JSON.parse(representationData);
      const urlTemplate = parsedData?.content?.url_template;
      if (!urlTemplate) {
        console.error(`No url_template found in representation data for ${fileName} (ID: ${fileId})`);
        return { content: `[Error: No ${repType} representation URL available for ${fileName}]` };
      }
      const representationUrl = urlTemplate.replace('{+asset_path}', '');
      return { url: representationUrl };
    } catch (parseError) {
      console.error(`Error parsing representation data for ${fileName}:`, parseError);
      return { content: `[Error: Invalid representation data format for ${fileName}]` };
    }
  }

  /**
   * Download final text from representation URL
   */
  private async fetchFromRepresentationUrl(representationUrl: string, token: any, fileName: string, repType: string): Promise<{ text?: string; content?: string }> {
    try {
      const textResponse = await fetch(representationUrl, {
        headers: { "Authorization": `Bearer ${token?.accessToken}`, 'x-box-ai-library': BOX_AI_LIBRARY },
      });
      if (!textResponse.ok) {
        console.error(`Failed to fetch text from URL template for ${fileName}: ${textResponse.status} ${textResponse.statusText}`);
        return { content: `[Error: Failed to fetch ${repType} content for ${fileName} - Status: ${textResponse.status}]` };
      }
      const text = await textResponse.text();
      console.log(`Successfully extracted ${repType} content from ${fileName}`);
      return { text };
    } catch (fetchError) {
      console.error(`Network error fetching representation for ${fileName}:`, fetchError);
      return { content: `[Error: Network error while fetching ${repType} representation for ${fileName}]` };
    }
  }

  /**
   * Load files from a folder
   */
  private async loadFromFolder(folderId: string, recursive: boolean = false): Promise<Document[]> {
    const documents: Document[] = [];
    const client = await this.getClient();

    try {
      const items = await this.getFolderItems(client, folderId);
      
      for (const item of items) {
        if (item.type === 'file') {
          const doc = await this.loadFileById(item.id);
          if (doc) {
            documents.push(doc);
          }
        } else if (item.type === 'folder' && recursive) {
          const subfolderDocs = await this.loadFromFolder(item.id, recursive);
          documents.push(...subfolderDocs);
        }
      }
    } catch (error) {
      console.error(`Error loading folder ${folderId}:`, error);
    }

    return documents;
  }

  /**
   * Get items from a folder
   */
  private async getFolderItems(client: BoxClient, folderId: string): Promise<Item[]> {
    const items: Item[] = [];
    let offset = 0;
    const limit = 100;

    // Iterate until fewer than limit items are returned
    // to avoid using a constant condition in the loop
    // and satisfy ESLint's no-constant-condition rule
    // by breaking when the page is smaller than the limit
    // or there are no more entries.
    // Using a do-while pattern with a guard variable.
    let hasMore = true;
    while (hasMore) {
      const response = await (client.folders as any).getFolderItems(folderId, {
        offset,
        limit,
        fields: ['id', 'name', 'type', 'size', 'created_at', 'modified_at', 'extension'],
        headers: {
          'x-box-ai-library': BOX_AI_LIBRARY
        }
      });

      const entries = response.entries ?? [];

      if (entries.length === 0) {
        hasMore = false;
        continue;
      }

      items.push(...entries);
      offset += entries.length;

      if (entries.length < limit) {
        hasMore = false;
      }
    }

    return items;
  }

  /**
   * Lazy load implementation
   */
  async *lazyLoad(): AsyncGenerator<Document> {
    // Stream per item without preloading all documents
    if (this.boxFileIds && this.boxFileIds.length > 0) {
      for (const fileId of this.boxFileIds) {
        const doc = await this.loadFileById(fileId);
        if (doc) {
          yield doc;
        } else {
          console.warn(`Skipping file ${fileId} due to previous errors.`);
        }
      }
      return;
    }

    if (this.boxFolderId) {
      const client = await this.getClient();
      for await (const fileId of this.iterateFolderFiles(client, this.boxFolderId, this.recursive)) {
        const doc = await this.loadFileById(fileId);
        if (doc) {
          yield doc;
        } else {
          console.warn(`Skipping file ${fileId} due to previous errors.`);
        }
      }
      return;
    }

    throw new Error('No boxFileIds or boxFolderId provided');
  }

  /**
   * Iterate files within a folder, optionally recursing into subfolders
   */
  private async *iterateFolderFiles(client: BoxClient, folderId: string, recursive: boolean): AsyncGenerator<string> {
    try {
      for await (const item of this.getFolderItemsGenerator(client, folderId)) {
        if (item.type === 'file') {
          yield item.id as string;
        } else if (item.type === 'folder' && recursive) {
          for await (const subFileId of this.iterateFolderFiles(client, item.id as string, recursive)) {
            yield subFileId;
          }
        }
      }
    } catch (error) {
      console.error(`Error iterating folder ${folderId}:`, error);
    }
  }

  /**
   * Generator that yields folder items page by page without buffering all results
   */
  private async *getFolderItemsGenerator(client: BoxClient, folderId: string): AsyncGenerator<Item> {
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    while (hasMore) {
      try {
        const response = await (client.folders as any).getFolderItems(folderId, {
          offset,
          limit,
          fields: ['id', 'name', 'type', 'size', 'created_at', 'modified_at', 'extension'],
          headers: {
            'x-box-ai-library': BOX_AI_LIBRARY
          }
        });

        const entries: Item[] = response.entries ?? [];
        if (entries.length === 0) {
          hasMore = false;
          continue;
        }

        for (const entry of entries) {
          yield entry;
        }

        offset += entries.length;
        if (entries.length < limit) {
          hasMore = false;
        }
      } catch (error) {
        console.error(`Error fetching items for folder ${folderId}:`, error);
        break;
      }
    }
  }
} 