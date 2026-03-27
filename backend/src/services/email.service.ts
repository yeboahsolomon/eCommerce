import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env.js';
import { prisma } from '../config/database.js';

// ============================================================
// Email Service — Template-based with Handlebars
// Supports logging, retry queue, and Ghana-specific branding
// ============================================================

// ==================== HANDLEBARS HELPERS ====================

Handlebars.registerHelper('formatCedis', (pesewas: number) => {
  return (pesewas / 100).toFixed(2);
});

Handlebars.registerHelper('formatPhone', (phone: string) => {
  if (!phone) return '';
  // Convert 0241234567 → +233 24 123 4567
  if (phone.startsWith('0') && phone.length === 10) {
    return `+233 ${phone.slice(1, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
  }
  return phone;
});

Handlebars.registerHelper('formatPaymentMethod', (method: string) => {
  const map: Record<string, string> = {
    MOMO_MTN: 'MTN Mobile Money',
    MOMO_VODAFONE: 'Telecel Cash',
    MOMO_AIRTELTIGO: 'AirtelTigo Money',
    CARD: 'Card Payment',
    BANK_TRANSFER: 'Bank Transfer',
    CASH_ON_DELIVERY: 'Cash on Delivery',
  };
  return map[method] || method?.replace(/_/g, ' ') || 'N/A';
});

Handlebars.registerHelper('formatDate', (date: string | Date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Accra',
  });
});

Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
Handlebars.registerHelper('gt', (a: any, b: any) => a > b);

// ==================== TYPES ====================

interface SendOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
  metadata?: Record<string, any>;
}

interface RetryJob {
  options: SendOptions;
  attempts: number;
  logId: string;
}

// ==================== TEMPLATE CACHE ====================

const templateCache = new Map<string, Handlebars.TemplateDelegate>();
let baseLayoutTemplate: Handlebars.TemplateDelegate | null = null;

function getTemplatesDir(): string {
  return path.join(__dirname, '..', 'templates');
}

function loadBaseLayout(): Handlebars.TemplateDelegate {
  if (baseLayoutTemplate) return baseLayoutTemplate;

  const layoutPath = path.join(getTemplatesDir(), 'layouts', 'base.hbs');
  if (fs.existsSync(layoutPath)) {
    const source = fs.readFileSync(layoutPath, 'utf-8');
    baseLayoutTemplate = Handlebars.compile(source);
  } else {
    // Fallback: simple wrapper
    baseLayoutTemplate = Handlebars.compile(
      '<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">{{{body}}}</div>'
    );
  }
  return baseLayoutTemplate;
}

function loadTemplate(name: string): Handlebars.TemplateDelegate {
  if (templateCache.has(name)) return templateCache.get(name)!;

  const templatePath = path.join(getTemplatesDir(), `${name}.hbs`);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Email template not found: ${name}`);
  }

  const source = fs.readFileSync(templatePath, 'utf-8');
  const compiled = Handlebars.compile(source);
  templateCache.set(name, compiled);
  return compiled;
}

function renderEmail(template: string, context: Record<string, any>): string {
  // Common context variables
  const fullContext = {
    ...context,
    currentYear: new Date().getFullYear(),
    platformName: 'GhanaMarket',
    platformUrl: config.frontendUrl,
    supportEmail: 'support@ghanamarket.com',
  };

  // Render content template
  const contentTemplate = loadTemplate(template);
  const body = contentTemplate(fullContext);

  // Wrap in base layout
  const layout = loadBaseLayout();
  return layout({ ...fullContext, body });
}

// ==================== RETRY QUEUE ====================

const retryQueue: RetryJob[] = [];
let retryTimerActive = false;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 5000;

function scheduleRetry(job: RetryJob) {
  retryQueue.push(job);
  if (!retryTimerActive) {
    retryTimerActive = true;
    processRetryQueue();
  }
}

async function processRetryQueue() {
  while (retryQueue.length > 0) {
    const job = retryQueue.shift()!;
    const delay = BASE_DELAY_MS * Math.pow(2, job.attempts - 1); // Exponential backoff
    await new Promise((r) => setTimeout(r, delay));

    try {
      await emailService.sendDirect(job.options);
      // Update log on success
      await (prisma as any).emailLog.update({
        where: { id: job.logId },
        data: { status: 'sent', sentAt: new Date(), attempts: job.attempts + 1 },
      }).catch(() => {});
    } catch (error: any) {
      if (job.attempts + 1 < MAX_RETRIES) {
        scheduleRetry({ ...job, attempts: job.attempts + 1 });
      } else {
        // Final failure
        await (prisma as any).emailLog.update({
          where: { id: job.logId },
          data: { status: 'failed', errorMessage: error.message, attempts: job.attempts + 1 },
        }).catch(() => {});
        console.error(`❌ Email permanently failed after ${MAX_RETRIES} attempts:`, job.options.to, job.options.template);
      }
    }
  }
  retryTimerActive = false;
}

// ==================== EMAIL SERVICE ====================

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

  // ==================== CORE SEND ====================

  /**
   * Send an email using a Handlebars template.
   * Logs to DB, retries on failure, logs to console in dev.
   */
  async sendTemplateEmail(options: SendOptions): Promise<void> {
    const { to, subject, template, context, metadata } = options;

    // Create log entry
    let logId: string | undefined;
    try {
      const log = await (prisma as any).emailLog.create({
        data: {
          recipient: to,
          subject,
          template,
          status: 'queued',
          metadata: metadata || {},
        },
      });
      logId = log.id;
    } catch (e) {
      // DB logging is non-critical
      console.warn('Email log creation failed:', e);
    }

    try {
      await this.sendDirect(options);

      // Update log
      if (logId) {
        await (prisma as any).emailLog.update({
          where: { id: logId },
          data: { status: 'sent', sentAt: new Date(), attempts: 1 },
        }).catch(() => {});
      }
    } catch (error: any) {
      console.error(`Email send failed (${template} → ${to}):`, error.message);

      // Update log
      if (logId) {
        await (prisma as any).emailLog.update({
          where: { id: logId },
          data: { status: 'failed', errorMessage: error.message, attempts: 1 },
        }).catch(() => {});

        // Schedule retry
        scheduleRetry({ options, attempts: 1, logId });
      }
    }
  }

  /**
   * Direct send (no retry, no logging). Used internally.
   */
  async sendDirect(options: SendOptions): Promise<void> {
    const { to, subject, template, context } = options;
    const html = renderEmail(template, context);

    if (this.isDev) {
      console.log('\n📧 ──────────────────────────────────────────');
      console.log(`   To:       ${to}`);
      console.log(`   Subject:  ${subject}`);
      console.log(`   Template: ${template}`);
      console.log('   ──────────────────────────────────────────');
      // Extract plain text link from HTML for easy testing
      const linkMatch = html.match(/href="([^"]+)"/);
      if (linkMatch) {
        console.log(`   🔗 Link: ${linkMatch[1]}`);
      }
      console.log('──────────────────────────────────────────────\n');
      return;
    }

    const info = await this.transporter!.sendMail({
      from: config.emailFrom,
      to,
      subject,
      html,
    });

    console.log(`✅ Email sent: ${template} → ${to} (${info.messageId})`);
  }

  // ==================== AUTH EMAILS ====================

  async sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
    const verificationUrl = `${config.frontendUrl}/verify-email?token=${token}`;
    await this.sendTemplateEmail({
      to,
      subject: 'Verify your GhanaMarket account',
      template: 'email-verification',
      context: { name, verificationUrl },
      metadata: { type: 'verification' },
    });
  }

  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
    const resetUrl = `${config.frontendUrl}/auth/reset-password/${token}`;
    await this.sendTemplateEmail({
      to,
      subject: 'Reset your GhanaMarket password',
      template: 'password-reset',
      context: { name, resetUrl },
      metadata: { type: 'password_reset' },
    });
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    await this.sendTemplateEmail({
      to,
      subject: 'Welcome to GhanaMarket! 🎉',
      template: 'welcome',
      context: { name },
      metadata: { type: 'welcome' },
    });
  }

  // ==================== SELLER APPLICATION EMAILS ====================

  async sendApplicationReceivedEmail(to: string, name: string, storeName: string): Promise<void> {
    await this.sendTemplateEmail({
      to,
      subject: 'Seller Application Received — GhanaMarket 🏪',
      template: 'seller-application-received',
      context: { name, storeName },
      metadata: { type: 'seller_application', storeName },
    });
  }

  async sendNewApplicationAdminEmail(adminEmail: string, applicantName: string, storeName: string, applicationId: string): Promise<void> {
    // Admin emails use inline HTML (simple notification)
    await this.sendTemplateEmail({
      to: adminEmail,
      subject: `New Seller Application: ${storeName} — GhanaMarket Admin`,
      template: 'seller-application-received',
      context: {
        name: 'Admin',
        storeName,
        isAdminNotification: true,
        applicantName,
        applicationId,
      },
      metadata: { type: 'admin_notification', applicationId },
    });
  }

  async sendApplicationApprovedEmail(to: string, name: string, storeName: string): Promise<void> {
    await this.sendTemplateEmail({
      to,
      subject: 'Congratulations! Your Seller Application is Approved 🎉 — GhanaMarket',
      template: 'seller-approved',
      context: { name, storeName },
      metadata: { type: 'seller_approved', storeName },
    });
  }

  async sendApplicationRejectedEmail(to: string, name: string, reason: string): Promise<void> {
    await this.sendTemplateEmail({
      to,
      subject: 'Seller Application Update — GhanaMarket',
      template: 'seller-rejected',
      context: { name, reason },
      metadata: { type: 'seller_rejected' },
    });
  }

  async sendInfoRequestedEmail(to: string, name: string, notes: string): Promise<void> {
    // Reuse seller-application-received with different context
    await this.sendTemplateEmail({
      to,
      subject: 'Additional Information Needed — GhanaMarket Seller Application',
      template: 'seller-application-received',
      context: { name, storeName: 'your application', isInfoRequest: true, notes },
      metadata: { type: 'info_requested' },
    });
  }

  // ==================== PAYMENT EMAILS ====================

  async sendPaymentConfirmationEmail(
    to: string,
    name: string,
    orderNumber: string,
    amountInCedis: string,
    paymentMethod: string
  ): Promise<void> {
    await this.sendTemplateEmail({
      to,
      subject: `Payment Confirmed — Order ${orderNumber}`,
      template: 'payment-confirmation',
      context: { name, orderNumber, amountInCedis, paymentMethod },
      metadata: { type: 'payment_confirmation', orderNumber },
    });
  }

  // ==================== ORDER LIFECYCLE EMAILS ====================

  async sendAbandonedCartEmail(to: string, name: string, checkoutUrl: string): Promise<void> {
    await this.sendTemplateEmail({
       to,
       subject: "Your cart misses you! 🛒 — GhanaMarket",
       template: "abandoned-cart",
       context: { name, checkoutUrl },
       metadata: { type: "abandoned_cart" },
    });
  }

  async sendOrderConfirmationEmail(params: {
    to: string;
    customerName: string;
    orderNumber: string;
    orderDate: string;
    totalAmount: string;
    subtotal: string;
    shippingFee: string;
    paymentMethod: string;
    paymentStatus: string;
    items: Array<{ name: string; quantity: number; price: string; image?: string; sellerName?: string }>;
    deliveryName: string;
    deliveryAddress: string;
    deliveryCity: string;
    deliveryRegion: string;
    deliveryPhone: string;
  }): Promise<void> {
    await this.sendTemplateEmail({
      to: params.to,
      subject: `Order Confirmed — #${params.orderNumber}`,
      template: 'order-confirmation',
      context: params,
      metadata: { type: 'order_confirmation', orderNumber: params.orderNumber },
    });
  }

  async sendOrderShippedEmail(params: {
    to: string;
    customerName: string;
    orderNumber: string;
    sellerName: string;
    items: Array<{ name: string; quantity: number }>;
    trackingNumber?: string;
    trackingUrl?: string;
    shippingMethod?: string;
    estimatedDelivery?: string;
  }): Promise<void> {
    await this.sendTemplateEmail({
      to: params.to,
      subject: `Order Shipped — #${params.orderNumber}`,
      template: 'order-shipped',
      context: params,
      metadata: { type: 'order_shipped', orderNumber: params.orderNumber },
    });
  }

  async sendOrderDeliveredEmail(params: {
    to: string;
    customerName: string;
    orderNumber: string;
    sellerName: string;
    totalAmount: string;
    deliveredDate: string;
  }): Promise<void> {
    await this.sendTemplateEmail({
      to: params.to,
      subject: `Order Delivered — #${params.orderNumber}`,
      template: 'order-delivered',
      context: params,
      metadata: { type: 'order_delivered', orderNumber: params.orderNumber },
    });
  }

  async sendNewOrderSellerEmail(params: {
    to: string;
    sellerName: string;
    orderNumber: string;
    customerName: string;
    customerRegion: string;
    orderTotal: string;
    payoutAmount: string;
    items: Array<{ name: string; quantity: number; sku?: string }>;
    deliveryName: string;
    deliveryAddress: string;
    deliveryCity: string;
    deliveryRegion: string;
    deliveryPhone: string;
  }): Promise<void> {
    await this.sendTemplateEmail({
      to: params.to,
      subject: `New Order — #${params.orderNumber}`,
      template: 'new-order-seller',
      context: params,
      metadata: { type: 'new_order_seller', orderNumber: params.orderNumber },
    });
  }

  async sendLowStockAlertEmail(params: {
    to: string;
    sellerName: string;
    productName: string;
    variantName?: string;
    currentStock: number;
    threshold: number;
  }): Promise<void> {
    const itemName = params.variantName ? `${params.productName} (${params.variantName})` : params.productName;
    await this.sendTemplateEmail({
       to: params.to,
       subject: `Low Stock Alert: ${itemName} — GhanaMarket`,
       template: "low-stock-alert",
       context: { ...params, itemName },
       metadata: { type: "low_stock_alert", productName: params.productName },
    });
  }

  // ==================== PAYOUT EMAILS ====================

  async sendPayoutProcessedEmail(params: {
    to: string;
    sellerName: string;
    amount: string;
    provider: string;
    phoneNumber: string;
    reference: string;
    processedDate: string;
    availableBalance: string;
    pendingBalance: string;
  }): Promise<void> {
    await this.sendTemplateEmail({
      to: params.to,
      subject: `Payout Processed — GH₵${params.amount}`,
      template: 'payout-processed',
      context: params,
      metadata: { type: 'payout_processed', reference: params.reference },
    });
  }
}

// Singleton instance
export const emailService = new EmailService();
