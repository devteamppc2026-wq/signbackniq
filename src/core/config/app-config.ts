import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
const projectRoot = fileURLToPath(new URL('../../../', import.meta.url));
export const APP_CONFIG = Symbol('AppConfig');

export function loadConfig() {
  dotenv.config({ path: resolve(projectRoot, '.env'), quiet: true });
  const env = process.env;
  const sslMode = env.DB_SSL_MODE || 'disabled';
  if (!['disabled', 'required', 'verify_identity'].includes(sslMode)) {
    throw new Error('Invalid DB_SSL_MODE');
  }
  const inlineCa = env.DB_SSL_CA?.replace(/\\n/g, '\n').trim();
  const caFile = env.DB_SSL_CA_FILE;
  if (sslMode === 'verify_identity' && !inlineCa && !caFile) {
    throw new Error('DB_SSL_CA or DB_SSL_CA_FILE is required for verify_identity');
  }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (
    (cloudName || apiKey || apiSecret) &&
    (!cloudName || !/^[a-z0-9-]+$/.test(cloudName) || !apiKey || !apiSecret)
  ) {
    throw new Error('Invalid or incomplete Cloudinary configuration');
  }
  const config = {
    port: Number(process.env.PORT || 3100),
    production: process.env.NODE_ENV === 'production',
    origin: process.env.APP_ORIGIN || 'http://127.0.0.1:3100',
    displayOrigin: process.env.DISPLAY_ORIGIN || undefined,
    trustProxy: process.env.TRUST_PROXY === '1',
    cloudinary: cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : undefined,
    uploads: process.env.UPLOAD_DIR
      ? resolve(process.env.UPLOAD_DIR)
      : resolve(projectRoot, 'uploads'),
    database: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      database: process.env.DB_NAME || 'union_display',
      user: process.env.DB_USER || 'union_app',
      password: process.env.DB_PASSWORD || '',
      connectionLimit: 10,
      timezone: 'Z' as const,
      charset: 'utf8mb4',
      multipleStatements: false,
      enableKeepAlive: true,
      ssl:
        sslMode === 'disabled'
          ? undefined
          : {
              rejectUnauthorized: sslMode === 'verify_identity',
              verifyIdentity: sslMode === 'verify_identity',
              ca:
                sslMode === 'verify_identity'
                  ? inlineCa ||
                    (caFile ? readFileSync(resolve(projectRoot, caFile), 'utf8') : undefined)
                  : undefined,
            },
    },
  };
  if (
    config.production &&
    (!process.env.DB_PASSWORD || !process.env.APP_ORIGIN?.startsWith('https://'))
  )
    throw new Error('Production requires DB_PASSWORD and HTTPS APP_ORIGIN');
  return config;
}

export type AppConfig = ReturnType<typeof loadConfig>;
