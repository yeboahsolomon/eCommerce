import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // R2 Storage
  R2_ACCOUNT_ID: z.string().min(1, 'R2_ACCOUNT_ID is required'),
  R2_ACCESS_KEY_ID: z.string().min(1, 'R2_ACCESS_KEY_ID is required'),
  R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2_SECRET_ACCESS_KEY is required'),
  R2_BUCKET_NAME: z.string().min(1, 'R2_BUCKET_NAME is required'),
  R2_PUBLIC_URL: z.string().url('R2_PUBLIC_URL must be a valid URL'),

  // Paystack
  PAYSTACK_SECRET_KEY: z.string().min(1, 'PAYSTACK_SECRET_KEY is required'),
  PAYSTACK_PUBLIC_KEY: z.string().min(1, 'PAYSTACK_PUBLIC_KEY is required'),

  // Email
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('GhanaMarket <noreply@ghanamarket.com>'),

  // Admin
  ADMIN_EMAIL: z.string().email().default('admin@ghanamarket.com'),

  // Google Auth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Uploads
  UPLOADS_BASE_URL: z.string().default('http://localhost:3001'),

  // MoMo (MTN Mobile Money)
  MOMO_API_URL: z.string().default('https://sandbox.momodeveloper.mtn.com'),
  MOMO_SUBSCRIPTION_KEY: z.string().optional(),
  MOMO_API_USER: z.string().optional(),
  MOMO_API_KEY: z.string().optional(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:\n', _env.error.format());
  throw new Error('Invalid environment variables');
}

const env = _env.data;

export const config = {
  port: parseInt(env.PORT, 10),
  nodeEnv: env.NODE_ENV,
  databaseUrl: env.DATABASE_URL,
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  refreshTokenExpiresIn: 7 * 24 * 60 * 60 * 1000,
  corsOrigin: env.CORS_ORIGIN,
  frontendUrl: env.FRONTEND_URL,
  
  smtpHost: env.SMTP_HOST,
  smtpPort: parseInt(env.SMTP_PORT, 10),
  smtpUser: env.SMTP_USER,
  smtpPass: env.SMTP_PASS,
  emailFrom: env.EMAIL_FROM,
  
  emailVerificationExpiresIn: 24 * 60 * 60 * 1000,
  passwordResetExpiresIn: 60 * 60 * 1000,
  
  adminEmail: env.ADMIN_EMAIL,
  uploadsBaseUrl: env.UPLOADS_BASE_URL,
  googleClientId: env.GOOGLE_CLIENT_ID,
  googleClientSecret: env.GOOGLE_CLIENT_SECRET,

  r2: {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucketName: env.R2_BUCKET_NAME,
    publicUrl: env.R2_PUBLIC_URL,
  },
  
  paystack: {
    secretKey: env.PAYSTACK_SECRET_KEY,
    publicKey: env.PAYSTACK_PUBLIC_KEY,
  },

  momo: {
    apiUrl: env.MOMO_API_URL,
    subscriptionKey: env.MOMO_SUBSCRIPTION_KEY,
    apiUser: env.MOMO_API_USER,
    apiKey: env.MOMO_API_KEY,
  },

  redisUrl: env.REDIS_URL,
} as const;
