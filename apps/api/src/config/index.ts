import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || 'dailydrop_super_secure_jwt_secret_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dbPath: process.env.DB_PATH || path.resolve(__dirname, '../../dailydrop_restaurant.db'),
  uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads/attachments'),
  emailMode: process.env.EMAIL_MODE || 'development', // 'development' logs to console & local db/file
  corsOrigins: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8081', '*'],
  appUrl: process.env.APP_URL || 'http://localhost:5173',
};
