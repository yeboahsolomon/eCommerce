
import axios from 'axios';
import { ApiError } from '../middleware/error.middleware.js';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

interface InitializePaymentParams {
  email: string;
  amount: number; // in pesewas
  callbackUrl?: string; // Optional override
  metadata?: any;
  currency?: string; // GHS
  channels?: string[]; // ['card', 'mobile_money']
}

interface PaystackResponse {
  status: boolean;
  message: string;
  data: any;
}

export class PaymentService {
  
  constructor() {
    if (!PAYSTACK_SECRET_KEY) {
      console.warn('PAYSTACK_SECRET_KEY is not defined in environment variables.');
    }
  }

  /**
   * Initialize a transaction
   */
  async initializeTransaction(params: InitializePaymentParams) {
    try {
      const response = await axios.post<PaystackResponse>(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          email: params.email,
          amount: params.amount.toString(), // Paystack expects string or number, check docs. Usually number in lowest denomination (kobo/pesewas).
          currency: params.currency || 'GHS',
          callback_url: params.callbackUrl,
          metadata: params.metadata,
          channels: params.channels || ['card', 'mobile_money'],
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data.status) {
        throw new Error(response.data.message || 'Payment initialization failed');
      }

      return response.data.data; // { authorization_url, access_code, reference }
    } catch (error: any) {
      console.error('Paystack Initialize Error:', error.response?.data || error.message);
      throw new ApiError(500, 'Payment server error. Please try again later.');
    }
  }

  /**
   * Verify a transaction
   */
  async verifyTransaction(reference: string) {
    try {
      const response = await axios.get<PaystackResponse>(
        `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      if (!response.data.status) {
        throw new Error(response.data.message || 'Verification failed');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Paystack Verify Error:', error.response?.data || error.message);
      throw new ApiError(400, 'Could not verify payment.');
    }
  }
}

export const paymentService = new PaymentService();
