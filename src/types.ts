import { 
  BoxClient as BoxTSClient,
  BoxDeveloperTokenAuth,
  BoxJwtAuth,
  BoxCcgAuth
} from 'box-typescript-sdk-gen';

// Re-export the BoxClient type for convenience
export type BoxClient = BoxTSClient;

/**
 * Enum for Box authentication types
 */
export enum BoxAuthType {
  TOKEN = 'TOKEN',
  JWT = 'JWT',
  CCG = 'CCG'
}

/**
 * Base interface for Box authentication configuration
 */
export interface BoxAuthConfig {
  authType: BoxAuthType;
}

/**
 * Configuration for token-based authentication
 */
export interface BoxTokenAuthConfig extends BoxAuthConfig {
  authType: BoxAuthType.TOKEN;
  boxDeveloperToken: string;
}

/**
 * Configuration for JWT authentication
 */
export interface BoxJWTAuthConfig extends BoxAuthConfig {
  authType: BoxAuthType.JWT;
  boxJwtPath?: string;
  boxJwtConfig?: any; // JWT config object
  boxUserId?: string; // Optional user ID for JWT user authentication
}

/**
 * Configuration for CCG (Client Credentials Grant) authentication
 */
export interface BoxCCGAuthConfig extends BoxAuthConfig {
  authType: BoxAuthType.CCG;
  boxClientId: string;
  boxClientSecret: string;
  boxEnterpriseId?: string; // For enterprise/service account
  boxUserId?: string; // For user authentication
}

/**
 * Union type for all authentication configurations
 */
export type BoxAuthConfigType = BoxTokenAuthConfig | BoxJWTAuthConfig | BoxCCGAuthConfig;

/**
 * Options for BoxLoader
 */
export interface BoxLoaderOptions {
  boxAuth?: BoxAuth;
  boxClient?: BoxClient;
  boxFileIds?: string[];
  boxFolderId?: string;
  recursive?: boolean;
  characterLimit?: number;
}

/**
 * Box authentication helper class
 */
export class BoxAuth {
  private config: BoxAuthConfigType;
  private client?: BoxClient;

  constructor(config: BoxAuthConfigType) {
    this.config = config;
  }

  /**
   * Get or create a Box client instance
   */
  async getClient(): Promise<BoxClient> {
    if (this.client) {
      return this.client;
    }

    try {
      let auth: any;

      switch (this.config.authType) {
        case BoxAuthType.TOKEN:
          auth = new BoxDeveloperTokenAuth({
            token: this.config.boxDeveloperToken
          });
          break;

        case BoxAuthType.JWT:
          if (this.config.boxJwtPath) {
            // Read JWT config from file
            const fs = await import('fs');
            const jwtConfig = JSON.parse(fs.readFileSync(this.config.boxJwtPath, 'utf8'));
            auth = new (BoxJwtAuth as any)({
              clientId: jwtConfig.boxAppSettings.clientID,
              clientSecret: jwtConfig.boxAppSettings.clientSecret,
              jwtKeyId: jwtConfig.boxAppSettings.appAuth.publicKeyID,
              privateKey: jwtConfig.boxAppSettings.appAuth.privateKey,
              privateKeyPassphrase: jwtConfig.boxAppSettings.appAuth.passphrase,
              enterpriseId: jwtConfig.enterpriseID,
              userId: this.config.boxUserId
            });
          } else if (this.config.boxJwtConfig) {
            const jwtConfig = this.config.boxJwtConfig;
            auth = new (BoxJwtAuth as any)({
              clientId: jwtConfig.boxAppSettings.clientID,
              clientSecret: jwtConfig.boxAppSettings.clientSecret,
              jwtKeyId: jwtConfig.boxAppSettings.appAuth.publicKeyID,
              privateKey: jwtConfig.boxAppSettings.appAuth.privateKey,
              privateKeyPassphrase: jwtConfig.boxAppSettings.appAuth.passphrase,
              enterpriseId: jwtConfig.enterpriseID,
              userId: this.config.boxUserId
            });
          } else {
            throw new Error('JWT authentication requires either boxJwtPath or boxJwtConfig');
          }
          break;

        case BoxAuthType.CCG:
          auth = new (BoxCcgAuth as any)({
            clientId: this.config.boxClientId,
            clientSecret: this.config.boxClientSecret,
            enterpriseId: this.config.boxEnterpriseId,
            userId: this.config.boxUserId
          });
          break;

        default:
          throw new Error(`Unsupported authentication type: ${(this.config as any).authType}`);
      }

      this.client = new BoxTSClient({ auth });
      return this.client;
    } catch (error) {
      throw new Error(`Failed to initialize Box client: ${error}`);
    }
  }
}