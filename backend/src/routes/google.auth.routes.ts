import { Router, Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../config/database.js';
import { config } from '../config/env.js';
import { ApiError } from '../middleware/error.middleware.js';
import { ApiResponseHandler } from '../utils/response.js';
import { generateToken, generateRefreshToken, generateSecureToken } from '../utils/helpers.js';
import { hashToken } from '../utils/token.helpers.js';

const router = Router();
const googleClient = new OAuth2Client(config.googleClientId);

// Helper to set cookies
const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, 
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (default remember me for social login)
  });
};

router.post(
  '/google',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { credential } = req.body;

      if (!credential) {
        throw new ApiError(400, 'Google ID token is required.');
      }

      if (!config.googleClientId) {
       console.warn("GOOGLE_CLIENT_ID is not set in environment variables.");
      }

      // Verify token
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: config.googleClientId,
      });

      const payload = ticket.getPayload();
      
      if (!payload || !payload.email) {
        throw new ApiError(401, 'Invalid Google token payload.');
      }

      const { email, given_name, family_name, picture, sub } = payload;
      const normalizedEmail = email.toLowerCase();

      // Find user
      let user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        // Register new user
        // Generate a random password for social login users (they won't use it)
        const dummyPassword = generateSecureToken().hash.substring(0, 32); 

        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            // We still need a password field in the DB due to schema constraints, 
            // though we could make it optional in schema.prisma. For now, random string.
            password: dummyPassword, 
            firstName: given_name || 'User',
            lastName: family_name || '',
            avatarUrl: picture,
            role: 'BUYER',
            status: 'ACTIVE',
            emailVerified: true, // Google verifies emails
            cart: { create: {} },
          },
        });
      } else {
        // Update user if they haven't verified email or don't have avatar
        const updates: any = {};
        if (!user.emailVerified) updates.emailVerified = true;
        if (!user.avatarUrl && picture) updates.avatarUrl = picture;
        updates.lastLoginAt = new Date();

        if (Object.keys(updates).length > 0) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: updates,
          });
        }
      }

      if (user.status !== 'ACTIVE') {
        throw new ApiError(403, 'Your account has been suspended or deactivated.');
      }

      // Generate tokens
      const accessToken = generateToken({
        userId: user.id,
        email: user.email,
        roles: [user.role],
        emailVerified: user.emailVerified,
      });

      const refreshToken = generateRefreshToken({ userId: user.id });
      const refreshTokenHash = hashToken(refreshToken);

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshTokenHash,
          expiresAt: new Date(Date.now() + config.refreshTokenExpiresIn),
        },
      });

      setAuthCookies(res, accessToken, refreshToken);

      return ApiResponseHandler.success(res, {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          emailVerified: user.emailVerified,
          avatarUrl: user.avatarUrl,
        },
        accessToken,
      }, 'Google login successful!');

    } catch (error) {
      console.error('Google Auth Error:', error);
      next(error);
    }
  }
);

export default router;
