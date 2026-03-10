import cron from 'node-cron';
import prisma from '../config/database.js';
import { emailService } from '../services/email.service.js';
import { config } from '../config/env.js';

export const startCartRecoveryJob = () => {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Running Abandoned Cart Recovery Job...');
    try {
      // Find carts that:
      // 1. Belong to a user (userId is not null)
      // 2. Have items in them
      // 3. Last activity was between 24 and 25 hours ago 
      //    (to avoid sending twice, we use a 1-hour window matching the cron schedule)
      
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);

      const abandonedCarts = await prisma.cart.findMany({
         where: {
            lastActivityAt: {
                lte: twentyFourHoursAgo,
                gt: twentyFiveHoursAgo,
            },
            items: {
                some: {} // Cart must have at least one item
            },
            user: {
                 email: { not: "" },
            }
         },
         include: {
             user: true,
             items: {
                 include: { product: true }
             }
         }
      });

      if (abandonedCarts.length === 0) {
          console.log('[Cron] No new abandoned carts found.');
          return;
      }

      console.log(`[Cron] Found ${abandonedCarts.length} abandoned carts. Sending emails...`);

      for (const cart of abandonedCarts) {
          if (!cart.user) continue;

          const checkoutUrl = `${config.frontendUrl}/cart`;
          await emailService.sendAbandonedCartEmail(cart.user.email, cart.user.firstName, checkoutUrl);
      }

      console.log('[Cron] Abandoned cart emails sent.');
    } catch (error) {
      console.error('[Cron Error] Failed to process abandoned carts:', error);
    }
  });
  console.log('[Jobs] Cart recovery cron job scheduled.');
};
