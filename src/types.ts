import {
  BoxClient,
  BoxDeveloperTokenAuth,
  BoxJwtAuth,
  JwtConfig,
  BoxCcgAuth,
  CcgConfig,
} from 'box-node-sdk';

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
  boxJwtConfig?: JwtConfig; // JWT config object
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
      const auth: BoxDeveloperTokenAuth | BoxJwtAuth | BoxCcgAuth = (() => {
        switch (this.config.authType) {
          case BoxAuthType.TOKEN: {
            return new BoxDeveloperTokenAuth({
              token: (this.config as BoxTokenAuthConfig).boxDeveloperToken
            });
          }

          case BoxAuthType.JWT: {
            // Prevent ambiguous configuration
            const { boxJwtPath, boxJwtConfig, boxUserId } = this.config as BoxJWTAuthConfig;
            if (!boxJwtPath && !boxJwtConfig) {
              throw new Error('JWT authentication requires either boxJwtPath or boxJwtConfig');
            }

            if (boxJwtPath && boxJwtConfig) {
              throw new Error('Provide either boxJwtPath or boxJwtConfig, not both, for JWT auth');
            }

            if (boxJwtPath) {
              const jwtConfig = JwtConfig.fromConfigFile(boxJwtPath);
              const baseAuth = new BoxJwtAuth({ config: jwtConfig });
              if (boxUserId) {
                return baseAuth.withUserSubject(boxUserId);
              }
              const enterpriseId = jwtConfig.enterpriseId;
              if (!enterpriseId) {
                throw new Error('JWT config missing enterpriseId for enterprise subject');
              }
              return baseAuth.withEnterpriseSubject(enterpriseId);
            }

            // boxJwtConfig path
            const jwtConfig = (boxJwtConfig as JwtConfig);
            const baseAuth = new BoxJwtAuth({ config: jwtConfig });
            if (boxUserId) {
              return baseAuth.withUserSubject(boxUserId);
            }
            const enterpriseId = jwtConfig.enterpriseId;
            if (!enterpriseId) {
              throw new Error('JWT config missing enterpriseId for enterprise subject');
            }
            return baseAuth.withEnterpriseSubject(enterpriseId);
          }

          case BoxAuthType.CCG: {
            const { boxClientId, boxClientSecret, boxEnterpriseId, boxUserId } = this.config as BoxCCGAuthConfig;
            if (boxEnterpriseId && boxUserId) {
              throw new Error('CCG requires either boxEnterpriseId or boxUserId, not both');
            }
            if (boxEnterpriseId) {
              const ccgConfig = new CcgConfig({
                clientId: boxClientId,
                clientSecret: boxClientSecret,
                enterpriseId: boxEnterpriseId,
              });
              return new BoxCcgAuth({ config: ccgConfig });
            }
            if (boxUserId) {
              const ccgConfig = new CcgConfig({
                clientId: boxClientId,
                clientSecret: boxClientSecret,
                userId: boxUserId
              });
              return new BoxCcgAuth({ config: ccgConfig });
            }
            throw new Error('CCG requires either boxEnterpriseId or boxUserId');
          }

          default: {
            throw new Error('Unsupported authentication type');
          }
        }
      })();

      this.client = new BoxClient({ auth });
      return this.client;
    } catch (error) {
      throw new Error(`Failed to initialize Box client: ${error}`);
    }
  }
}