import { BaseDocumentLoader } from '@langchain/core/document_loaders/base';
import { Document } from '@langchain/core/documents';
import { BoxAuth, BoxLoaderOptions, BoxClient } from './types';

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
          authType: 'TOKEN' as any,
          boxDeveloperToken: developerToken
        });
      } else {
        throw new Error('Must provide either boxAuth or boxClient, or set BOX_DEVELOPER_TOKEN environment variable');
      }
    }

    this.boxAuth = options.boxAuth;
    this.boxClient = options.boxClient;
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

      // Get file info
      const fileInfo = await client.files.getFileById(fileId);
      
      // Get file content using representations following Box guide
      let content = '';
      const fileName = fileInfo.name || '';
      
      try {
        // List all representations with x-rep-hints header
        const fileWithReps = await client.files.getFileById(fileId, {
          headers: {
            'x-rep-hints': '[extracted_text]',
            "Authorization": `Bearer ${token?.accessToken}`
          },
          queryParams: {
            fields: ['name', 'representations', 'type'],
          },
        } as any);
    
        // Check if text representation is available
        if (fileWithReps.representations && fileWithReps?.representations.entries) {
          const textRep = fileWithReps.representations.entries.find((rep: any) => 
            rep.representation === 'extracted_text'
          );

          if (textRep && textRep.status === undefined && textRep.info?.url) {
            const response = await fetch(textRep.info.url, {
              headers: {
                "Authorization": `Bearer ${token?.accessToken}`
              },
            });

            if (response.status === 200) {
              let resprezentation_data = await response.text();
              console.log(JSON.parse(resprezentation_data));
              const representation_url = JSON.parse(resprezentation_data)?.content?.url_template.replace('{+asset_path}', '');
              console.log(representation_url);
              const textResponse = await fetch(representation_url, {
                headers: {
                  "Authorization": `Bearer ${token?.accessToken}`
                },
              });

              if (textResponse.ok) {
                content = await textResponse.text();
                console.log('Successfully extracted text content from URL template');
              } else {
                console.error('Failed to fetch text from URL template:', textResponse.status);
              }
            } else {
              console.error('Failed to fetch text representation url:', response.status, response.statusText);
            }
          }
        }
      } catch (error) {
        content = `[Error reading file: ${fileName}]`;
      }

      // Apply character limit if specified
      if (this.characterLimit && content.length > this.characterLimit) {
        content = content.substring(0, this.characterLimit);
      }
      console.log(content);

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
      return null;
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
  private async getFolderItems(client: BoxClient, folderId: string): Promise<any[]> {
    const items: any[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await (client.folders as any).getFolderItems(folderId, {
        offset,
        limit,
        fields: ['id', 'name', 'type', 'size', 'created_at', 'modified_at', 'extension']
      });

      if (!response.entries || response.entries.length === 0) {
        break;
      }

      items.push(...response.entries);
      offset += response.entries.length;

      if (response.entries.length < limit) {
        break;
      }
    }

    return items;
  }

  /**
   * Lazy load implementation
   */
  async *lazyLoad(): AsyncGenerator<Document> {
    const documents = await this.load();
    for (const doc of documents) {
      yield doc;
    }
  }
} 