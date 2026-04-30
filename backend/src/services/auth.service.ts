import prisma from '../config/database.js';
import { config } from '../config/env.js';
import { ApiError } from '../middleware/error.middleware.js';
import { emailService } from './email.service.js';
import { RegisterInput, LoginInput, ChangePasswordInput } from '../utils/validators.js';
import { hashPassword, comparePassword, generateToken, generateRefreshToken, generateSecureToken } from '../utils/helpers.js';
import { hashToken } from '../utils/token.helpers.js';
import jwt from 'jsonwebtoken';
import admin from '../config/firebase.js';

export class AuthService {
  async register(input: RegisterInput) {
    const { email, password, firstName, lastName, phone } = input;
    
    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      throw new ApiError(409, 'An account with this email already exists.');
    }
    
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: 'BUYER',
        status: 'ACTIVE',
        cart: { create: {} },
      },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        role: true, status: true, emailVerified: true, createdAt: true,
      },
    });
    
    const accessToken = generateToken({ userId: user.id, email: user.email, roles: [user.role], emailVerified: user.emailVerified });
    const refreshToken = generateRefreshToken({ userId: user.id });
    const refreshTokenHash = hashToken(refreshToken);

    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshTokenHash, expiresAt: new Date(Date.now() + config.refreshTokenExpiresIn) },
    });

    const { token: verifyToken, hash: verifyHash } = generateSecureToken();
    await prisma.emailVerificationToken.create({
      data: { userId: user.id, token: verifyHash, expiresAt: new Date(Date.now() + config.emailVerificationExpiresIn) },
    });

    emailService.sendVerificationEmail(user.email, user.firstName, verifyToken).catch(console.error);

    return { user, accessToken, refreshToken };
  }

  async login(input: LoginInput & { ipAddress?: string, userAgent?: string }) {
    const { email, password, ipAddress = 'unknown', userAgent = 'unknown' } = input;
    
    // Check if IP is blocked
    const failedAttempts = await prisma.securityLog.count({
      where: {
        ipAddress,
        status: 'FAILED',
        timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }
    });

    if (failedAttempts >= 5) {
      await prisma.securityLog.create({
        data: { email: email.toLowerCase(), ipAddress, status: 'BLOCKED', userAgent }
      });
      throw new ApiError(403, 'Your IP has been temporarily blocked due to too many failed login attempts.');
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      await prisma.securityLog.create({
        data: { email: email.toLowerCase(), ipAddress, status: 'FAILED', userAgent }
      });
      throw new ApiError(401, 'Invalid email or password.');
    }

    if (user.status !== 'ACTIVE') {
      await prisma.securityLog.create({
        data: { email: email.toLowerCase(), ipAddress, status: 'FAILED', userAgent: `Suspended account: ${userAgent}` }
      });
      throw new ApiError(403, 'Your account has been suspended or deactivated.');
    }
    
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      await prisma.securityLog.create({
        data: { email: email.toLowerCase(), ipAddress, status: 'FAILED', userAgent }
      });
      throw new ApiError(401, 'Invalid email or password.');
    }
    
    // Log success
    await prisma.securityLog.create({
      data: { email: email.toLowerCase(), ipAddress, status: 'SUCCESS', userAgent }
    });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    
    if (user.role === 'SUPERADMIN') {
      const preAuthToken = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '5m' });
      return {
        otpRequired: true,
        preAuthToken,
        user: { id: user.id, email: user.email, phone: user.phone, role: user.role, firstName: user.firstName, lastName: user.lastName, emailVerified: user.emailVerified },
      };
    }

    const accessToken = generateToken({ userId: user.id, email: user.email, roles: [user.role], emailVerified: user.emailVerified });
    const refreshToken = generateRefreshToken({ userId: user.id });
    const refreshTokenHash = hashToken(refreshToken);

    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshTokenHash, expiresAt: new Date(Date.now() + config.refreshTokenExpiresIn) },
    });

    return {
      otpRequired: false,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone, role: user.role, emailVerified: user.emailVerified },
      accessToken,
      refreshToken,
    };
  }

  async verifyAdminOtp(preAuthToken: string, firebaseIdToken: string) {
    // 1. Verify the preAuthToken
    let decodedPreAuth: any;
    try {
      decodedPreAuth = jwt.verify(preAuthToken, config.jwtSecret);
    } catch (error) {
      throw new ApiError(401, 'Session expired or invalid. Please login again.');
    }

    // 2. Fetch the user
    const user = await prisma.user.findUnique({ where: { id: decodedPreAuth.userId } });
    if (!user || user.role !== 'SUPERADMIN') throw new ApiError(403, 'Access denied.');

    // 3. Verify Firebase ID Token
    let decodedFirebaseToken: any;
    try {
      decodedFirebaseToken = await admin.auth().verifyIdToken(firebaseIdToken);
    } catch (error) {
      throw new ApiError(401, 'Invalid OTP or phone verification failed.');
    }

    // 4. Enforce exact phone match (normalized)
    let normalizedUserPhone = user.phone ? user.phone.replace(/\s+/g, '') : '';
    if (normalizedUserPhone.startsWith('0')) {
      normalizedUserPhone = '+233' + normalizedUserPhone.substring(1);
    }
    if (!normalizedUserPhone.startsWith('+') && normalizedUserPhone.length > 0) {
      normalizedUserPhone = '+' + normalizedUserPhone;
    }

    if (normalizedUserPhone !== decodedFirebaseToken.phone_number) {
      throw new ApiError(401, 'The verified phone number does not match the registered superadmin phone number.');
    }

    // 5. Generate final tokens
    const accessToken = generateToken({ userId: user.id, email: user.email, roles: [user.role], emailVerified: user.emailVerified });
    const refreshToken = generateRefreshToken({ userId: user.id });
    const refreshTokenHash = hashToken(refreshToken);

    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshTokenHash, expiresAt: new Date(Date.now() + config.refreshTokenExpiresIn) },
    });

    return {
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone, role: user.role, emailVerified: user.emailVerified },
      accessToken,
      refreshToken,
    };
  }

  async verifyEmail(token: string) {
    const tokenHash = hashToken(token);
    const storedToken = await prisma.emailVerificationToken.findUnique({ where: { token: tokenHash }, include: { user: true } });

    if (!storedToken) throw new ApiError(400, 'Invalid or expired verification link.');
    if (new Date() > storedToken.expiresAt) {
      await prisma.emailVerificationToken.delete({ where: { id: storedToken.id } });
      throw new ApiError(400, 'Verification link has expired. Please request a new one.');
    }
    if (storedToken.user.emailVerified) {
      await prisma.emailVerificationToken.delete({ where: { id: storedToken.id } });
      return { alreadyVerified: true };
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: storedToken.userId }, data: { emailVerified: true } }),
      prisma.emailVerificationToken.deleteMany({ where: { userId: storedToken.userId } }),
    ]);

    emailService.sendWelcomeEmail(storedToken.user.email, storedToken.user.firstName).catch(console.error);
    return { alreadyVerified: false };
  }

  async resendVerification(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, firstName: true, emailVerified: true } });
    if (!user) throw new ApiError(404, 'User not found.');
    if (user.emailVerified) return { alreadyVerified: true };

    await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });

    const { token, hash } = generateSecureToken();
    await prisma.emailVerificationToken.create({
      data: { userId: user.id, token: hash, expiresAt: new Date(Date.now() + config.emailVerificationExpiresIn) },
    });

    await emailService.sendVerificationEmail(user.email, user.firstName, token);
    return { alreadyVerified: false };
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true, email: true, firstName: true, status: true } });
    if (!user || user.status !== 'ACTIVE') return;

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const { token, hash } = generateSecureToken();
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token: hash, expiresAt: new Date(Date.now() + config.passwordResetExpiresIn) },
    });

    emailService.sendPasswordResetEmail(user.email, user.firstName, token).catch(console.error);
  }

  async resetPassword(token: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) throw new ApiError(400, 'New password must be at least 6 characters.');

    const tokenHash = hashToken(token);
    const storedToken = await prisma.passwordResetToken.findUnique({ where: { token: tokenHash } });

    if (!storedToken) throw new ApiError(400, 'Invalid or expired reset link.');
    if (storedToken.used) throw new ApiError(400, 'This reset link has already been used.');
    if (new Date() > storedToken.expiresAt) {
      await prisma.passwordResetToken.delete({ where: { id: storedToken.id } });
      throw new ApiError(400, 'Reset link has expired. Please request a new one.');
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({ where: { id: storedToken.userId }, data: { password: hashedPassword } }),
      prisma.passwordResetToken.update({ where: { id: storedToken.id }, data: { used: true } }),
      prisma.refreshToken.deleteMany({ where: { userId: storedToken.userId } }),
    ]);
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const { currentPassword, newPassword } = input;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, password: true, role: true, emailVerified: true } });
    
    if (!user) throw new ApiError(404, 'User not found.');

    const isValid = await comparePassword(currentPassword, user.password);
    if (!isValid) throw new ApiError(401, 'Current password is incorrect.');

    const isSamePassword = await comparePassword(newPassword, user.password);
    if (isSamePassword) throw new ApiError(400, 'New password must be different from your current password.');

    const hashedPassword = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } }),
      prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    ]);

    const accessToken = generateToken({ userId: user.id, email: user.email, roles: [user.role], emailVerified: user.emailVerified });
    const refreshToken = generateRefreshToken({ userId: user.id });
    const refreshTokenHash = hashToken(refreshToken);

    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshTokenHash, expiresAt: new Date(Date.now() + config.refreshTokenExpiresIn) },
    });

    return { accessToken, refreshToken };
  }

  async stepUpAuth(userId: string, passwordInput: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, password: true } });
    if (!user) throw new ApiError(404, 'User not found.');

    const isValid = await comparePassword(passwordInput, user.password);
    if (!isValid) throw new ApiError(401, 'Invalid password.');

    const stepUpToken = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '15m' });
    return stepUpToken;
  }

  async refreshToken(refreshTokenCookie: string | undefined) {
    if (!refreshTokenCookie) throw new ApiError(401, 'No refresh token provided.');

    const refreshTokenHash = hashToken(refreshTokenCookie);
    const storedToken = await prisma.refreshToken.findUnique({ where: { token: refreshTokenHash }, include: { user: true } });

    if (!storedToken) throw new ApiError(401, 'Invalid refresh token.');
    if (storedToken.revoked) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new ApiError(401, 'Token revoked.');
    }
    if (new Date() > storedToken.expiresAt) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new ApiError(401, 'Session expired. Please login again.');
    }

    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    const newRefreshToken = generateRefreshToken({ userId: storedToken.userId });
    const newRefreshTokenHash = hashToken(newRefreshToken);

    await prisma.refreshToken.create({
      data: { userId: storedToken.userId, token: newRefreshTokenHash, expiresAt: new Date(Date.now() + config.refreshTokenExpiresIn) },
    });

    const newAccessToken = generateToken({
      userId: storedToken.user.id, email: storedToken.user.email, roles: [storedToken.user.role], emailVerified: storedToken.user.emailVerified,
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshTokenCookie: string | undefined) {
    if (!refreshTokenCookie) return;
    try {
      const refreshTokenHash = hashToken(refreshTokenCookie);
      const storedToken = await prisma.refreshToken.findUnique({ where: { token: refreshTokenHash } });
      if (storedToken) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      }
    } catch {
      // ignore
    }
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true, role: true, status: true,
        emailVerified: true, phoneVerified: true, avatarUrl: true, createdAt: true, lastLoginAt: true,
        addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] },
      },
    });
    if (!user) throw new ApiError(404, 'User not found.');
    return user;
  }

  async updateMe(userId: string, data: { firstName?: string; lastName?: string; phone?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, status: true, avatarUrl: true },
    });
    return user;
  }
}

export const authService = new AuthService();
