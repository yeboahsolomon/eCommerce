import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { paymentLimiter } from "../middleware/rate-limit.middleware.js";
import { paystackService } from "../services/paystack.service.js";
import { z } from "zod";
import { validate } from "../middleware/validate.middleware.js";
import { paymentService } from "../services/payment.service.js";

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const momoPaymentSchema = z.object({
  orderId: z.string().cuid("Invalid order ID"),
  phoneNumber: z
    .string()
    .regex(/^0(24|54|55|59)\d{7}$/, "Invalid MTN Ghana phone number"),
});

const paystackPaymentSchema = z.object({
  orderId: z.string().cuid("Invalid order ID"),
  email: z.string().email("Valid email required"),
  callbackUrl: z.string().url().optional(),
  paymentMethod: z.enum(["card", "mobile_money"]).optional().default("card"),
  mobileMoneyProvider: z
    .enum(["mtn", "telecel", "vodafone", "airteltigo"])
    .optional(),
  mobileMoneyNumber: z
    .string()
    .regex(/^0\d{9}$/, "Invalid Ghana phone number")
    .optional(),
});

const refundSchema = z.object({
  reason: z.string().min(5, "Refund reason must be at least 5 characters"),
  amountInPesewas: z.number().int().positive().optional(),
});

// ==================== MTN MOMO (Direct) ====================

router.post(
  "/momo/initialize",
  authMiddleware,
  paymentLimiter,
  validate(momoPaymentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId, phoneNumber } = req.body;
      const userId = (req as any).user.id;

      const data = await paymentService.initializeMomoPayment(
        orderId,
        phoneNumber,
        userId,
      );
      res.json({
        success: true,
        message: "Approve the payment on your phone",
        data,
      });
    } catch (error: any) {
      if (
        error.message === "Order not found or already paid" ||
        error.message === "Payment already in progress"
      ) {
        res
          .status(
            error.message === "Order not found or already paid" ? 404 : 400,
          )
          .json({ success: false, message: error.message });
        return;
      }
      next(error);
    }
  },
);

router.get(
  "/momo/verify/:reference",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reference } = req.params;
      const userId = (req as any).user.id;

      const data = await paymentService.verifyMomoPayment(reference, userId);
      res.json({ success: data.status !== "FAILED", data });
    } catch (error: any) {
      if (error.message === "Payment not found") {
        res.status(404).json({ success: false, message: error.message });
        return;
      }
      next(error);
    }
  },
);

// ==================== PAYSTACK (Card + Mobile Money) ====================

router.post(
  "/paystack/initialize",
  authMiddleware,
  paymentLimiter,
  validate(paystackPaymentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        orderId,
        email,
        callbackUrl,
        paymentMethod,
        mobileMoneyProvider,
        mobileMoneyNumber,
      } = req.body;
      const userId = (req as any).user.id;

      const data = await paymentService.initializePaystackPayment(
        orderId,
        email,
        callbackUrl,
        paymentMethod,
        mobileMoneyProvider,
        mobileMoneyNumber,
        userId,
      );
      res.json({ success: true, data });
    } catch (error: any) {
      if (
        [
          "Order not found",
          "Payment already in progress",
          "Mobile money provider and phone number are required for MoMo payments",
        ].includes(error.message)
      ) {
        res
          .status(error.message === "Order not found" ? 404 : 400)
          .json({ success: false, message: error.message });
        return;
      }
      next(error);
    }
  },
);

router.get(
  "/paystack/verify/:reference",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reference } = req.params;
      const userId = (req as any).user.id;

      const data = await paymentService.verifyPaystackPayment(
        reference,
        userId,
      );
      res.json({ success: data.status !== "FAILED", data });
    } catch (error: any) {
      if (error.message === "Payment not found") {
        res.status(404).json({ success: false, message: error.message });
        return;
      }
      next(error);
    }
  },
);

// ==================== PAYSTACK WEBHOOK ====================

router.post("/paystack/webhook", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-paystack-signature"] as string;
    if (
      !paystackService.verifyWebhookSignature(
        JSON.stringify(req.body),
        signature,
      )
    ) {
      console.warn("⚠️ Invalid Paystack webhook signature");
      return res.status(401).json({ message: "Invalid signature" });
    }

    const event = req.body;
    console.log(`📬 Paystack webhook: ${event.event}`, {
      reference: event.data?.reference,
    });

    await paymentService.handlePaystackWebhook(event);

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(200).json({ received: true });
  }
});

// ==================== PAYSTACK CONFIG & BANKS ====================

router.get("/paystack/config", (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      publicKey: paystackService.getPublicKey(),
      currency: "GHS",
      channels: ["card", "mobile_money"],
      momoProviders: [
        { id: "mtn", name: "MTN Mobile Money", code: "MPS" },
        { id: "telecel", name: "Telecel Cash (Vodafone)", code: "VDF" },
        { id: "airteltigo", name: "AirtelTigo Money", code: "ATL" },
      ],
    },
  });
});

router.get("/paystack/banks", async (req: Request, res: Response) => {
  const banks = await paystackService.getBanks();
  res.json({ success: true, data: { banks } });
});

// ==================== SHARED ENDPOINTS ====================

router.get(
  "/order/:orderId",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.params;
      const userId = (req as any).user.id;

      const data = await paymentService.getPaymentForOrder(orderId, userId);
      res.json({ success: true, data });
    } catch (error: any) {
      if (error.message === "Payment not found") {
        res.status(404).json({ success: false, message: error.message });
        return;
      }
      next(error);
    }
  },
);

router.get(
  "/history",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

      const data = await paymentService.getPaymentHistory(userId, page, limit);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/:paymentId/cancel",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { paymentId } = req.params;
      const userId = (req as any).user.id;

      await paymentService.cancelPayment(paymentId, userId);
      res.json({ success: true, message: "Payment cancelled" });
    } catch (error: any) {
      if (error.message === "Cannot cancel payment") {
        res.status(404).json({ success: false, message: error.message });
        return;
      }
      next(error);
    }
  },
);

router.get("/methods", (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      methods: [
        {
          id: "paystack_card",
          name: "Card Payment",
          description: "Pay with Visa or Mastercard",
          icon: "credit-card",
          paymentMethod: "card",
          provider: "paystack",
        },
        {
          id: "paystack_momo",
          name: "Mobile Money",
          description: "MTN MoMo, Telecel Cash, AirtelTigo Money",
          icon: "smartphone",
          paymentMethod: "mobile_money",
          provider: "paystack",
          subOptions: [
            { id: "mtn", name: "MTN Mobile Money" },
            { id: "telecel", name: "Telecel Cash" },
            { id: "airteltigo", name: "AirtelTigo Money" },
          ],
        },
        {
          id: "momo_mtn_direct",
          name: "MTN MoMo (Direct)",
          description: "Direct MTN Mobile Money prompt",
          icon: "phone",
          paymentMethod: "momo_direct",
          provider: "mtn_momo",
        },
      ],
      defaultMethod: "paystack_card",
      currency: "GHS",
    },
  });
});

// ==================== REFUNDS ====================

router.post(
  "/refund/:orderId",
  authMiddleware,
  validate(refundSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.params;
      const user = (req as any).user;

      if (user.role !== "ADMIN") {
        return res
          .status(403)
          .json({ success: false, message: "Admin access required" });
      }

      const { reason, amountInPesewas } = req.body;

      const data = await paymentService.processRefund(
        orderId,
        reason,
        amountInPesewas,
        user.id,
      );
      res.json({
        success: true,
        message: "Refund processed successfully",
        data,
      });
    } catch (error: any) {
      if (
        error.message === "Order not found" ||
        error.message === "No successful payment to refund" ||
        error.message.startsWith("Maximum refundable")
      ) {
        res
          .status(error.message === "Order not found" ? 404 : 400)
          .json({ success: false, message: error.message });
        return;
      }
      // Specific error handling for gateway failed
      if (error.message.startsWith("Refund processing failed")) {
        res.status(500).json({ success: false, message: error.message });
        return;
      }
      next(error);
    }
  },
);

router.get(
  "/refunds/:orderId",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.params;
      const user = (req as any).user;

      const data = await paymentService.getRefundsForOrder(orderId, user);
      res.json({ success: true, data: { refunds: data } });
    } catch (error: any) {
      if (error.message === "Order not found") {
        res.status(404).json({ success: false, message: error.message });
        return;
      }
      next(error);
    }
  },
);

router.get(
  "/refunds",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (user.role !== "ADMIN") {
        return res
          .status(403)
          .json({ success: false, message: "Admin access required" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

      const data = await paymentService.getAllRefunds(page, limit);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
