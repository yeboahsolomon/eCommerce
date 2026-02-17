import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

// ============================================================
// Email Service
// Sends verification and password reset emails.
// In development mode, logs to console instead of sending.
// ============================================================

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isDev: boolean;

  constructor() {
    this.isDev = config.nodeEnv === 'development' || !config.smtpUser;

    if (!this.isDev) {
      this.transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
      });
    }
  }

  /**
   * Send an email. In dev mode, logs to console.
   */
  private async send(options: EmailOptions): Promise<void> {
    if (this.isDev) {
      console.log('\n📧 ──────────────────────────────────────────');
      console.log(`   To:      ${options.to}`);
      console.log(`   Subject: ${options.subject}`);
      console.log('   ──────────────────────────────────────────');
      // Extract plain text link from HTML for easy testing
      const linkMatch = options.html.match(/href="([^"]+)"/);
      if (linkMatch) {
        console.log(`   🔗 Link: ${linkMatch[1]}`);
      }
      console.log('──────────────────────────────────────────────\n');
      return;
    }

    try {
      await this.transporter!.sendMail({
        from: config.emailFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send email. Please try again later.');
    }
  }

  /**
   * Send email verification link
   */
  async sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
    const verifyUrl = `${config.frontendUrl}/verify-email?token=${token}`;

    await this.send({
      to,
      subject: 'Verify your GhanaMarket account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">Welcome to GhanaMarket! 🇬🇭</h2>
          <p>Hi ${name},</p>
          <p>Thanks for creating your account. Please verify your email address to get the most out of GhanaMarket.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" 
               style="background-color: #e94560; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Verify My Email
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Or copy and paste this link into your browser:<br/>
            <a href="${verifyUrl}" style="color: #e94560;">${verifyUrl}</a>
          </p>
          <p style="color: #666; font-size: 12px;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 11px;">GhanaMarket — Your trusted online marketplace</p>
        </div>
      `,
    });
  }

  /**
   * Send password reset link
   */
  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;

    await this.send({
      to,
      subject: 'Reset your GhanaMarket password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">Password Reset Request</h2>
          <p>Hi ${name},</p>
          <p>We received a request to reset your password. Click the button below to choose a new password.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #e94560; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Or copy and paste this link:<br/>
            <a href="${resetUrl}" style="color: #e94560;">${resetUrl}</a>
          </p>
          <p style="color: #666; font-size: 12px;">This link expires in 1 hour. If you didn't request this, your account is safe — just ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 11px;">GhanaMarket — Your trusted online marketplace</p>
        </div>
      `,
    });
  }

  /**
   * Send welcome email (after verification)
   */
  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const shopUrl = `${config.frontendUrl}/shop`;

    await this.send({
      to,
      subject: 'Welcome to GhanaMarket! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">You're all set, ${name}! 🎉</h2>
          <p>Your email has been verified. You now have full access to GhanaMarket.</p>
          <p>Here's what you can do:</p>
          <ul style="line-height: 2;">
            <li>🛍️ Browse products from sellers across Ghana</li>
            <li>💳 Pay securely with MTN MoMo, Telecel Cash, or Card</li>
            <li>🏪 Apply to become a seller and grow your business</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${shopUrl}" 
               style="background-color: #e94560; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Start Shopping
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 11px;">GhanaMarket — Your trusted online marketplace</p>
        </div>
      `,
    });
  }
}

// Singleton instance
export const emailService = new EmailService();
