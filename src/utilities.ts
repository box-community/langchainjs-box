import { BoxAuth, BoxAuthType } from './types';

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
    // Document formats
    '.doc', '.docx', '.gdoc', '.gsheet', '.numbers', '.ods', '.odt', '.pages', 
    '.pdf', '.rtf', '.wpd',
    
    // Spreadsheet formats
    '.xls', '.xlsm', '.xlsx', '.xlsb',
    
    // Presentation formats
    '.gslide', '.gslides', '.key', '.odp', '.ppt', '.pptx',
    
    // Programming and markup languages
    '.as', '.as3', '.asm', '.bat', '.c', '.cc', '.cmake', '.cpp', '.cs', 
    '.css', '.csv', '.cxx', '.diff', '.erb', '.groovy', '.h', '.haml', 
    '.hh', '.htm', '.html', '.java', '.js', '.json', '.less', '.log', 
    '.m', '.make', '.md', '.ml', '.mm', '.msg', '.php', '.pl', 
    '.properties', '.py', '.rb', '.rst', '.sass', '.scala', '.scm', 
    '.script', '.sh', '.sml', '.sql', '.txt', '.vi', '.vim', '.webdoc', 
    '.xhtml', '.xml', '.xsd', '.xsl', '.yaml', '.yml',
    
    // Additional formats
    '.ts', '.scss', '.toml', '.ini', '.cfg', '.conf',
    
    // Box-specific formats
    '.boxnote'
  ];
  
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return textExtensions.includes(extension);
}

export function isImageFile(filename: string): boolean {
  const imageExtensions = [
    // Common web formats
    '.gif', '.jpeg', '.jpg', '.png', '.svg',
    
    // Professional formats
    '.bmp', '.eps', '.tif', '.tiff', '.tga',
    
    // RAW camera formats
    '.arw', '.cr2', '.dng', '.nef',
    
    // High dynamic range
    '.exr',
    
    // Mobile formats
    '.heic',
    
    // Medical imaging
    '.dcm', '.dicm', '.dicom', '.svs',
    
    // Adobe formats
    '.indd', '.indml', '.indt', '.inx'
  ];
  
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return imageExtensions.includes(extension);
}

export function isVideoFile(filename: string): boolean {
  const videoExtensions = [
    '.mp4', '.m4v', '.mov', '.avi', '.mkv', '.webm', '.wmv', '.flv', '.mpeg', '.mpg', '.m2ts', '.mts', '.3gp'
  ];

  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return videoExtensions.includes(extension);
}