import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    // 5GB max dosya boyutu (3-4GB videolar için yeterli margin)
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5368709120', 10), // 5GB
    // Chunk boyutu (streaming upload için)
    chunkSize: parseInt(process.env.UPLOAD_CHUNK_SIZE || '10485760', 10), // 10MB chunks
  },

  database: {
    url: process.env.DATABASE_URL,
  },

  // Request timeout ayarları (büyük dosyalar için)
  timeout: {
    upload: parseInt(process.env.UPLOAD_TIMEOUT || '3600000', 10), // 1 saat
    request: parseInt(process.env.REQUEST_TIMEOUT || '300000', 10), // 5 dakika
  },
} as const;

export const uploadPath = path.resolve(config.upload.dir);
