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
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',

  // Refresh token expiry (ms)
  refreshTokenExpiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // Frontend URL (for email links)
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Email (Nodemailer / SMTP)
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  emailFrom: process.env.EMAIL_FROM || 'GhanaMarket <noreply@ghanamarket.com>',

  // Token expiry (ms)
  emailVerificationExpiresIn: 24 * 60 * 60 * 1000,  // 24 hours
  passwordResetExpiresIn: 60 * 60 * 1000,            // 1 hour
} as const;

// Validate required env vars
if (!config.databaseUrl) {
  console.warn('⚠️  DATABASE_URL is not set. Database operations will fail.');
}

if (config.jwtSecret === 'default-secret-change-in-production' && config.nodeEnv === 'production') {
  throw new Error('JWT_SECRET must be set in production!');
}

