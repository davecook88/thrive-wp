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

export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  environment: process.env.NODE_ENV || 'development',

  database: {
    type: 'mysql' as const,
    host: process.env.DB_HOST || 'db',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'wordpress',
    password: process.env.DB_PASSWORD || 'wordpress',
    database: process.env.DB_DATABASE || 'wordpress',
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
});
