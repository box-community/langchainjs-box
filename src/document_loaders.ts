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
    }

    if (this.boxFolderId) {
      // Load files from folder
      const folderDocs = await this.loadFromFolder(this.boxFolderId, this.recursive);
      documents.push(...folderDocs);
    }

    return documents;
  }

  /**
   * Load a single file by ID
   */
  private async loadFileById(fileId: string): Promise<Document | null> {
    try {
      const client = await this.getClient();
      
      // Get file info
      const fileInfo = await client.files.getFileById(fileId);
      
      // Get file content
      let content = '';
      const fileName = fileInfo.name || '';
      const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
      
      try {
        const contentStream = await client.downloads.downloadFile(fileId);

        content = await this.streamToString(contentStream);
        
      } catch (error) {
        content = `[Error reading file: ${fileName}]`;
      }

      // Apply character limit if specified
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
   * Convert stream to string
   */
  private async streamToString(stream: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
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