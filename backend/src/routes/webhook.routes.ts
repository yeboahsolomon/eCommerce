
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/database.js';

const router = Router();
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

router.post('/paystack', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-paystack-signature'] as string;
    
    // Verify signature
    if (!PAYSTACK_SECRET_KEY) {
        console.warn("Paystack Secret Key missing, cannot verify webhook");
        return res.status(500).send("Server config error");
    }

    const hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY)
                       .update(JSON.stringify(req.body))
                       .digest('hex');

    if (hash !== signature) {
        return res.status(401).send("Invalid signature");
    }

    const event = req.body;
    
    // Handle specific events
    if (event.event === 'charge.success') {
        const { reference, metadata, status } = event.data;
        const { orderId } = metadata || {};

        if (orderId && status === 'success') {
            // Update Payment Status
            await prisma.payment.updateMany({
                where: { orderId: orderId },
                data: { status: 'SUCCESS' }
            });

            // Update Order Status
            // If payment successful, order is now PROCESSING (or CONFIRMED)
            // Depending on business logic. 
            // Default "PENDING" -> "PROCESSING"
            await prisma.order.update({
                where: { id: orderId },
                data: { 
                    status: 'PROCESSING', 
                    confirmedAt: new Date()
                }
            });
            
            // Notify User? (TODO)
        }
    }
    
    // Always return 200
    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.sendStatus(500);
  }
});

export default router;
