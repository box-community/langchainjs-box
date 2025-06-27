import { BoxAuth, BoxAuthType, BoxAuthConfigType } from './types';

/**
 * Helper function to create BoxAuth from environment variables
 */
export function createBoxAuthFromEnv(): BoxAuth {
  const developerToken = process.env.BOX_DEVELOPER_TOKEN;
  
  if (developerToken) {
    return new BoxAuth({
      authType: BoxAuthType.TOKEN,
      boxDeveloperToken: developerToken
    });
  }

  // Check for JWT configuration
  const jwtPath = process.env.BOX_JWT_PATH;
  const userId = process.env.BOX_USER_ID;
  
  if (jwtPath) {
    return new BoxAuth({
      authType: BoxAuthType.JWT,
      boxJwtPath: jwtPath,
      boxUserId: userId
    });
  }

  // Check for CCG configuration
  const clientId = process.env.BOX_CLIENT_ID;
  const clientSecret = process.env.BOX_CLIENT_SECRET;
  const enterpriseId = process.env.BOX_ENTERPRISE_ID;
  
  if (clientId && clientSecret) {
    return new BoxAuth({
      authType: BoxAuthType.CCG,
      boxClientId: clientId,
      boxClientSecret: clientSecret,
      boxEnterpriseId: enterpriseId,
      boxUserId: userId
    });
  }

  throw new Error(
    'No Box authentication configuration found in environment variables. ' +
    'Set BOX_DEVELOPER_TOKEN, or provide JWT/CCG configuration.'
  );
}

/**
 * Helper function to validate file extension for text content
 */
export function isTextFile(filename: string): boolean {
  const textExtensions = [
    '.txt', '.md', '.json', '.xml', '.csv', '.html', '.htm', 
    '.js', '.ts', '.py', '.java', '.cpp', '.c', '.h', '.css',
    '.scss', '.sass', '.less', '.sql', '.yaml', '.yml', '.toml',
    '.ini', '.cfg', '.conf', '.log', '.rtf'
  ];
  
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return textExtensions.includes(extension);
}

/**
 * Helper function to get file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Helper function to sanitize folder ID (handle root folder variations)
 */
export function sanitizeFolderId(folderId: string | number): string {
  // Box root folder can be represented as '0', 0, or 'root'
  if (folderId === 'root' || folderId === '0' || folderId === 0) {
    return '0';
  }
  return folderId.toString();
} 