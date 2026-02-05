import crypto from 'crypto';

// ==================== PAYSTACK SERVICE ====================
// Paystack payment gateway integration for Ghana

export interface PaystackInitializeRequest {
  email: string;
  amount: number; // In pesewas (kobo equivalent)
  reference: string;
  currency?: string;
  callback_url?: string;
  metadata?: {
    orderId: string;
    userId: string;
    custom_fields?: Array<{
      display_name: string;
      variable_name: string;
      value: string;
    }>;
  };
  channels?: ('card' | 'bank' | 'mobile_money' | 'qr' | 'ussd')[];
}

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: 'success' | 'failed' | 'abandoned' | 'pending';
    reference: string;
    amount: number;
    gateway_response: string;
    paid_at: string | null;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: {
      orderId: string;
      userId: string;
    };
    customer: {
      id: number;
      email: string;
      phone: string | null;
    };
    authorization: {
      authorization_code: string;
      card_type: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      bank: string | null;
      channel: string;
      reusable: boolean;
    };
  };
}

export interface PaystackWebhookEvent {
  event: string;
  data: {
    reference: string;
    status: string;
    amount: number;
    metadata: {
      orderId: string;
      userId: string;
    };
  };
}

export interface PaystackRefundResponse {
  status: boolean;
  message: string;
  data: any;
}

class PaystackService {
  private secretKey: string;
  private publicKey: string;
  private baseUrl: string;

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || '';
    this.publicKey = process.env.PAYSTACK_PUBLIC_KEY || '';
    this.baseUrl = 'https://api.paystack.co';
  }

  // Generate unique transaction reference
  generateReference(prefix = 'GHM'): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // Initialize a payment transaction
  async initializeTransaction(
    request: PaystackInitializeRequest
  ): Promise<PaystackInitializeResponse> {
    // In development mode, simulate the response
    if (!this.secretKey || process.env.NODE_ENV !== 'production') {
      console.log('💳 [Paystack Sandbox] Initializing payment:', {
        reference: request.reference,
        amount: request.amount / 100, // Convert pesewas to cedis
        email: request.email,
      });

      return {
        status: true,
        message: 'Authorization URL created',
        data: {
          authorization_url: `http://localhost:3000/payment/verify?reference=${request.reference}&demo=true`,
          access_code: `ACCESS_${Date.now()}`,
          reference: request.reference,
        },
      };
    }

    // Production: Make actual API call
    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.secretKey}`,
        },
        body: JSON.stringify({
          email: request.email,
          amount: request.amount, // Paystack expects amount in smallest unit
          reference: request.reference,
          currency: request.currency || 'GHS',
          callback_url: request.callback_url,
          metadata: request.metadata,
          channels: request.channels || ['card', 'mobile_money'],
        }),
      });

      const data = await response.json();
      return data as PaystackInitializeResponse;
    } catch (error) {
      console.error('Paystack initialize error:', error);
      throw error;
    }
  }

  // Verify a transaction
  async verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
    // In development mode, simulate verification
    if (!this.secretKey || process.env.NODE_ENV !== 'production') {
      console.log('💳 [Paystack Sandbox] Verifying payment:', reference);

      // Simulate success/failure (90% success rate)
      const isSuccess = Math.random() > 0.1;

      return {
        status: true,
        message: 'Verification successful',
        data: {
          id: Date.now(),
          status: isSuccess ? 'success' : 'failed',
          reference,
          amount: 10000, // Sample amount
          gateway_response: isSuccess ? 'Successful' : 'Declined',
          paid_at: isSuccess ? new Date().toISOString() : null,
          channel: 'mobile_money',
          currency: 'GHS',
          ip_address: '127.0.0.1',
          metadata: {
            orderId: 'demo-order',
            userId: 'demo-user',
          },
          customer: {
            id: 1,
            email: 'demo@example.com',
            phone: null,
          },
          authorization: {
            authorization_code: `AUTH_${Date.now()}`,
            card_type: 'visa',
            last4: '1234',
            exp_month: '12',
            exp_year: '25',
            bank: null,
            channel: 'mobile_money',
            reusable: false,
          },
        },
      };
    }

    // Production: Make actual API call
    try {
      const response = await fetch(
        `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      const data = await response.json();
      return data as PaystackVerifyResponse;
    } catch (error) {
      console.error('Paystack verify error:', error);
      throw error;
    }
  }

  // Verify webhook signature
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.secretKey) {
      console.warn('Paystack secret key not configured');
      return true; // Allow in development
    }

    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(payload)
      .digest('hex');

    return hash === signature;
  }

  // Get list of supported banks (for bank transfer)
  async getBanks(): Promise<{ name: string; code: string }[]> {
    if (!this.secretKey || process.env.NODE_ENV !== 'production') {
      // Return sample Ghana banks
      return [
        { name: 'Access Bank', code: '044' },
        { name: 'Ecobank Ghana', code: '130' },
        { name: 'Fidelity Bank', code: '240' },
        { name: 'First Atlantic Bank', code: '080' },
        { name: 'GCB Bank', code: '040' },
        { name: 'Stanbic Bank', code: '190' },
        { name: 'Standard Chartered', code: '050' },
        { name: 'UBA Ghana', code: '060' },
        { name: 'Zenith Bank', code: '120' },
      ];
    }

    try {
      const response = await fetch(`${this.baseUrl}/bank?country=ghana`, {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      });

      const data = await response.json() as { data: any[] };
      return data.data || [];
    } catch (error) {
      console.error('Paystack get banks error:', error);
      return [];
    }
  }

  // Create a refund
  async createRefund(reference: string, amount?: number): Promise<boolean> {
    if (!this.secretKey || process.env.NODE_ENV !== 'production') {
      console.log('💳 [Paystack Sandbox] Refund created for:', reference);
      return true;
    }

    try {
      const response = await fetch(`${this.baseUrl}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.secretKey}`,
        },
        body: JSON.stringify({
          transaction: reference,
          ...(amount && { amount }),
        }),
      });

      const data = await response.json() as PaystackRefundResponse;
      return data.status === true;
    } catch (error) {
      console.error('Paystack refund error:', error);
      return false;
    }
  }

  // Get public key (for frontend)
  getPublicKey(): string {
    return this.publicKey || 'pk_test_xxxxxxxxxxxxxxxxxxxxxx';
  }
}

// Export singleton instance
export const paystackService = new PaystackService();
