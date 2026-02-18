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

  // ============================================================
  // SELLER APPLICATION EMAILS
  // ============================================================

  /**
   * Send confirmation email after seller application submission
   */
  async sendApplicationReceivedEmail(to: string, name: string, storeName: string): Promise<void> {
    const statusUrl = `${config.frontendUrl}/seller/application-status`;

    await this.send({
      to,
      subject: 'Seller Application Received — GhanaMarket 🏪',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">Application Received! 📋</h2>
          <p>Hi ${name},</p>
          <p>We've received your application to sell on GhanaMarket as <strong>"${storeName}"</strong>.</p>
          
          <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; color: #1e40af;">What happens next?</p>
            <ul style="margin: 8px 0 0; padding-left: 20px; color: #1e3a5f; line-height: 1.8;">
              <li>Our team will review your application within <strong>1-3 business days</strong></li>
              <li>We'll verify your Ghana Card and business details</li>
              <li>You'll receive an email once your application is reviewed</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${statusUrl}" 
               style="background-color: #e94560; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Check Application Status
            </a>
          </div>
          <p style="color: #666; font-size: 13px;">If you have questions, reply to this email or contact our support team.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 11px;">GhanaMarket — Your trusted online marketplace 🇬🇭</p>
        </div>
      `,
    });
  }

  /**
   * Notify admin about new seller application
   */
  async sendNewApplicationAdminEmail(adminEmail: string, applicantName: string, storeName: string, applicationId: string): Promise<void> {
    await this.send({
      to: adminEmail,
      subject: `New Seller Application: ${storeName} — GhanaMarket Admin`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">New Seller Application 🔔</h2>
          <p>A new seller application has been submitted and is awaiting your review.</p>
          
          <div style="background-color: #fefce8; border: 1px solid #fde68a; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px;"><strong>Applicant:</strong> ${applicantName}</p>
            <p style="margin: 0 0 8px;"><strong>Store Name:</strong> ${storeName}</p>
            <p style="margin: 0;"><strong>Application ID:</strong> ${applicationId}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${config.frontendUrl}/admin/seller-applications/${applicationId}" 
               style="background-color: #1a1a2e; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Review Application
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 11px;">GhanaMarket Admin Panel</p>
        </div>
      `,
    });
  }

  /**
   * Send approval email to seller
   */
  async sendApplicationApprovedEmail(to: string, name: string, storeName: string): Promise<void> {
    const dashboardUrl = `${config.frontendUrl}/seller/products`;

    await this.send({
      to,
      subject: 'Congratulations! Your Seller Application is Approved 🎉 — GhanaMarket',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #059669;">You're Approved! 🎉🇬🇭</h2>
          <p>Hi ${name},</p>
          <p>Great news! Your seller application for <strong>"${storeName}"</strong> has been approved.</p>
          
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; color: #065f46;">You can now:</p>
            <ul style="margin: 8px 0 0; padding-left: 20px; color: #064e3b; line-height: 1.8;">
              <li>🏪 Access your Seller Dashboard</li>
              <li>📦 List your products for sale</li>
              <li>💰 Receive Mobile Money payments directly</li>
              <li>📊 Track your orders and analytics</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" 
               style="background-color: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Go to Seller Dashboard
            </a>
          </div>
          <p style="color: #666; font-size: 13px;">Welcome to the GhanaMarket seller community! 🤝</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 11px;">GhanaMarket — Your trusted online marketplace 🇬🇭</p>
        </div>
      `,
    });
  }

  /**
   * Send rejection email with reason
   */
  async sendApplicationRejectedEmail(to: string, name: string, reason: string): Promise<void> {
    const reapplyUrl = `${config.frontendUrl}/seller/register`;

    await this.send({
      to,
      subject: 'Seller Application Update — GhanaMarket',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626;">Application Not Approved</h2>
          <p>Hi ${name},</p>
          <p>Thank you for your interest in selling on GhanaMarket. Unfortunately, we are unable to approve your application at this time.</p>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0 0 8px; font-weight: bold; color: #991b1b;">Reason:</p>
            <p style="margin: 0; color: #7f1d1d;">${reason}</p>
          </div>

          <p>You are welcome to address the issues above and submit a new application.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${reapplyUrl}" 
               style="background-color: #e94560; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Submit New Application
            </a>
          </div>
          <p style="color: #666; font-size: 13px;">If you believe this was an error, please contact our support team.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 11px;">GhanaMarket — Your trusted online marketplace 🇬🇭</p>
        </div>
      `,
    });
  }

  /**
   * Send request for more information/documents
   */
  async sendInfoRequestedEmail(to: string, name: string, notes: string): Promise<void> {
    const statusUrl = `${config.frontendUrl}/seller/application-status`;

    await this.send({
      to,
      subject: 'Additional Information Needed — GhanaMarket Seller Application',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #d97706;">Additional Information Needed 📝</h2>
          <p>Hi ${name},</p>
          <p>We are reviewing your seller application, but we need some additional information before we can proceed.</p>
          
          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0 0 8px; font-weight: bold; color: #92400e;">What we need:</p>
            <p style="margin: 0; color: #78350f;">${notes}</p>
          </div>

          <p>Please reply to this email with the requested information, or update your application.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${statusUrl}" 
               style="background-color: #d97706; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              View Application Status
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 11px;">GhanaMarket — Your trusted online marketplace 🇬🇭</p>
        </div>
      `,
    });
  }
}

// Singleton instance
export const emailService = new EmailService();

