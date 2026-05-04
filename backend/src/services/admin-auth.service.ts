import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { ApiError } from '../middleware/error.middleware.js';

const SALT_ROUNDS = 12;

export const adminAuthService = {
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  async getAdminByEmail(email: string) {
    return prisma.superAdmin.findUnique({
      where: { email: email.toLowerCase() },
    });
  },

  async getAdminById(id: string) {
    return prisma.superAdmin.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        lastLoginAt: true,
        lastLoginIP: true,
        createdAt: true,
      },
    });
  },

  async handleFailedLogin(adminId: string, currentAttempts: number) {
    const attempts = currentAttempts + 1;
    let lockedUntil: Date | null = null;

    if (attempts >= 5) {
      // Lock for 15 minutes
      lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }

    await prisma.superAdmin.update({
      where: { id: adminId },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil,
      },
    });

    if (lockedUntil) {
      throw new ApiError(403, 'Account locked due to too many failed attempts. Try again in 15 minutes.');
    } else {
      throw new ApiError(401, 'Invalid credentials');
    }
  },

  async handleSuccessfulLogin(adminId: string, ipAddress: string) {
    await prisma.superAdmin.update({
      where: { id: adminId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIP: ipAddress,
      },
    });
  },
};
