import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  databaseUrl: process.env.DATABASE_URL || '',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
} as const;

// Validate required env vars
if (!config.databaseUrl) {
  console.warn('⚠️  DATABASE_URL is not set. Database operations will fail.');
}

if (config.jwtSecret === 'default-secret-change-in-production' && config.nodeEnv === 'production') {
  throw new Error('JWT_SECRET must be set in production!');
}
