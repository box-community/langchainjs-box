import { 
  BoxClient,
  BoxDeveloperTokenAuth,
  BoxJwtAuth,
  JwtConfig,
  BoxCcgAuth,
  CcgConfig,
} from 'box-typescript-sdk-gen';

// Re-export the BoxClient type for convenience
export type { BoxClient };

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
          if (this.config.boxJwtConfig && this.config.boxUserId) {
            console.error('JWT authentication requires either boxJwtPath or boxJwtConfig')
          } else if (this.config.boxJwtPath) {
            // Read JWT config from file  
            const jwtConfig = JwtConfig.fromConfigFile(this.config.boxJwtPath);
            auth = new BoxJwtAuth({ config: jwtConfig } as any);

            if (this.config.boxUserId) {
              auth = auth.withUserSubject(this.config.boxUserId);
            } else {
              auth = auth.withEnterpriseSubject(jwtConfig.enterpriseId);
            }
          } else if (this.config.boxJwtConfig) {
            const jwtConfig = this.config.boxJwtConfig;
            console.log(jwtConfig);
            
            const jwtAuth = new BoxJwtAuth({
              config: jwtConfig
            } as any);
            
            if (this.config.boxUserId) {
              auth = jwtAuth.withUserSubject(this.config.boxUserId);
            } else {
              auth = jwtAuth.withEnterpriseSubject(jwtConfig.enterpriseId);
            }
          } else {
            console.error('JWT authentication requires either boxJwtPath or boxJwtConfig')
          }
          break;

        case BoxAuthType.CCG:
          if (this.config.boxEnterpriseId && this.config.boxUserId) {
            console.error('CCG authentication requires either boxEnterpriseId or boxUserId')
          } else if (this.config.boxEnterpriseId) {
            const ccgConfig = new CcgConfig({
              clientId: this.config.boxClientId,
              clientSecret: this.config.boxClientSecret,
              enterpriseId: this.config.boxEnterpriseId,
            });
            auth = new BoxCcgAuth({ config: ccgConfig });
          } else if (this.config.boxUserId) {
            const ccgConfig = new CcgConfig({
              clientId: this.config.boxClientId,
              clientSecret: this.config.boxClientSecret,
              userId: this.config.boxUserId
            });
            auth = new BoxCcgAuth({ config: ccgConfig });
          } else {
            console.error('CCG authentication requires either boxEnterpriseId or boxUserId')
          }
          break;

        default:
          throw new Error(`Unsupported authentication type: ${(this.config as any).authType}`);
      }

      this.client = new BoxClient({ auth });
      return this.client;
    } catch (error) {
      throw new Error(`Failed to initialize Box client: ${error}`);
    }
  }
}