export interface DatabaseConfig {
  type: 'mysql';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  logging: boolean;
  entities: string[];
  migrations: string[];
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
}

export interface StripeConfig {
  secretKey: string;
  publishableKey: string;
}

export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  environment: process.env.NODE_ENV || 'development',

  database: {
    type: 'mysql' as const,
    host: process.env.DB_HOST || 'db',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'wordpress',
    password: process.env.DB_PASSWORD || 'wordpress',
    // Use dedicated test database when running under NODE_ENV==='test'
    database: (() => {
      const nodeEnv = process.env.NODE_ENV;
      const testDb = process.env.DB_DATABASE_TEST || 'wordpress_test';
      const normalDb = process.env.DB_DATABASE || 'wordpress';
      const chosen = nodeEnv === 'test' ? testDb : normalDb;
      const isTestLike = /test/i.test(chosen);
      if (nodeEnv === 'test' && !isTestLike) {
        throw new Error(
          `SAFETY CHECK FAILED: In test environment but database name ("${chosen}") does not contain 'test'. Set DB_DATABASE_TEST properly.`,
        );
      }
      if (nodeEnv !== 'test' && isTestLike) {
        throw new Error(
          `SAFETY CHECK FAILED: In ${nodeEnv} environment but database name ("${chosen}") looks like a test DB. Refusing to start.`,
        );
      }
      // Extra logging in test mode to confirm correct database
      if (nodeEnv === 'test') {
        console.log(`[CONFIG] Test mode detected - Using database: ${chosen}`);
      }
      return chosen;
    })(),
    // Schema synchronization logic:
    // If DB_SYNCHRONIZE is explicitly set ("true" / "false"), respect it.
    // Otherwise default to true only in development. This allows disabling sync in dev
    // to rely solely on migrations (recommended once schema stabilizes).
    synchronize: (() => {
      if (process.env.DB_SYNCHRONIZE !== undefined) {
        return process.env.DB_SYNCHRONIZE === 'true';
      }
      return process.env.NODE_ENV === 'development';
    })(),
    logging: process.env.NODE_ENV === 'development',
    entities: ['dist/**/*.entity{.ts,.js}'],
    migrations: ['dist/migrations/*{.ts,.js}'],
  } as DatabaseConfig,

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '30m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  } as JwtConfig,

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  } as GoogleOAuthConfig,

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  } as StripeConfig,
});
