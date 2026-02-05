import { v4 as uuidv4 } from 'uuid';

// ==================== MTN MOMO SERVICE ====================
// This is a simulation of MTN MoMo API for development
// In production, you would integrate with the actual MTN MoMo API

export interface MoMoPaymentRequest {
  amount: number; // In pesewas
  currency: string;
  externalId: string; // Your order reference
  payer: {
    partyIdType: 'MSISDN';
    partyId: string; // Phone number (e.g., 0244123456)
  };
  payerMessage: string;
  payeeNote: string;
}

export interface MoMoPaymentResponse {
  referenceId: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  financialTransactionId?: string;
  reason?: string;
}

export interface PaymentStatusResponse {
  amount: number;
  currency: string;
  financialTransactionId: string;
  externalId: string;
  payer: {
    partyIdType: string;
    partyId: string;
  };
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  reason?: {
    code: string;
    message: string;
  };
}

// Simulated payment storage (in production, this would be stored in the database)
const pendingPayments = new Map<string, {
  request: MoMoPaymentRequest;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  createdAt: Date;
  financialTransactionId?: string;
}>();

class MoMoService {
  private apiBaseUrl: string;
  private subscriptionKey: string;
  private apiUser: string;
  private apiKey: string;

  constructor() {
    // These would come from environment variables in production
    this.apiBaseUrl = process.env.MOMO_API_URL || 'https://sandbox.momodeveloper.mtn.com';
    this.subscriptionKey = process.env.MOMO_SUBSCRIPTION_KEY || '';
    this.apiUser = process.env.MOMO_API_USER || '';
    this.apiKey = process.env.MOMO_API_KEY || '';
  }

  // Generate a unique reference ID for the payment
  generateReferenceId(): string {
    return uuidv4();
  }

  // Format phone number for MoMo (Ghana format)
  formatPhoneNumber(phone: string): string {
    // Remove any spaces or dashes
    let cleaned = phone.replace(/[\s-]/g, '');
    
    // Convert 0XX to 233XX format
    if (cleaned.startsWith('0')) {
      cleaned = '233' + cleaned.substring(1);
    }
    
    // Remove + if present
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }
    
    return cleaned;
  }

  // Validate Ghana MTN phone number
  isValidMTNNumber(phone: string): boolean {
    const cleaned = phone.replace(/[\s-]/g, '');
    // MTN Ghana prefixes: 024, 054, 055, 059
    const mtnPrefixes = ['024', '054', '055', '059', '0244', '0544', '0554', '0594'];
    return mtnPrefixes.some(prefix => cleaned.startsWith(prefix));
  }

  // Request to pay (initiate payment)
  async requestToPay(request: MoMoPaymentRequest): Promise<MoMoPaymentResponse> {
    const referenceId = this.generateReferenceId();
    
    // In development mode, simulate the API call
    if (process.env.NODE_ENV !== 'production' || !this.subscriptionKey) {
      console.log('📱 [MoMo Sandbox] Payment request:', {
        referenceId,
        amount: request.amount / 100, // Convert pesewas to cedis for display
        phone: request.payer.partyId,
      });

      // Store the pending payment
      pendingPayments.set(referenceId, {
        request,
        status: 'PENDING',
        createdAt: new Date(),
      });

      // Simulate async payment completion (in 5-10 seconds)
      setTimeout(() => {
        const payment = pendingPayments.get(referenceId);
        if (payment && payment.status === 'PENDING') {
          // 90% success rate simulation
          const isSuccess = Math.random() > 0.1;
          payment.status = isSuccess ? 'SUCCESSFUL' : 'FAILED';
          payment.financialTransactionId = isSuccess ? `FT_${Date.now()}` : undefined;
          console.log(`📱 [MoMo Sandbox] Payment ${referenceId}: ${payment.status}`);
        }
      }, 5000 + Math.random() * 5000);

      return {
        referenceId,
        status: 'PENDING',
      };
    }

    // Production: Make actual API call to MTN MoMo
    try {
      const response = await fetch(`${this.apiBaseUrl}/collection/v1_0/requesttopay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Reference-Id': referenceId,
          'X-Target-Environment': 'sandbox',
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          'Authorization': `Basic ${Buffer.from(`${this.apiUser}:${this.apiKey}`).toString('base64')}`,
        },
        body: JSON.stringify({
          amount: String(request.amount / 100), // Convert to cedis
          currency: request.currency,
          externalId: request.externalId,
          payer: request.payer,
          payerMessage: request.payerMessage,
          payeeNote: request.payeeNote,
        }),
      });

      if (response.status === 202) {
        return {
          referenceId,
          status: 'PENDING',
        };
      } else {
        const error = await response.text();
        throw new Error(`MoMo API error: ${error}`);
      }
    } catch (error) {
      console.error('MoMo API error:', error);
      throw error;
    }
  }

  // Check payment status
  async getPaymentStatus(referenceId: string): Promise<PaymentStatusResponse> {
    // In development mode, check our simulated storage
    if (process.env.NODE_ENV !== 'production' || !this.subscriptionKey) {
      const payment = pendingPayments.get(referenceId);
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      return {
        amount: payment.request.amount,
        currency: payment.request.currency,
        financialTransactionId: payment.financialTransactionId || '',
        externalId: payment.request.externalId,
        payer: payment.request.payer,
        status: payment.status,
        reason: payment.status === 'FAILED' ? {
          code: 'INSUFFICIENT_FUNDS',
          message: 'The payer does not have sufficient funds',
        } : undefined,
      };
    }

    // Production: Make actual API call
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/collection/v1_0/requesttopay/${referenceId}`,
        {
          method: 'GET',
          headers: {
            'X-Target-Environment': 'sandbox',
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Authorization': `Basic ${Buffer.from(`${this.apiUser}:${this.apiKey}`).toString('base64')}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data as PaymentStatusResponse;
      } else {
        throw new Error('Failed to get payment status');
      }
    } catch (error) {
      console.error('MoMo status check error:', error);
      throw error;
    }
  }

  // Cancel a pending payment (cleanup)
  cancelPayment(referenceId: string): boolean {
    return pendingPayments.delete(referenceId);
  }
}

// Export singleton instance
export const momoService = new MoMoService();
