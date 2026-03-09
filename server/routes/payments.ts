import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { asyncHandler, requireAuth } from "../middleware";
import * as razorpay from "../services/razorpay";

function log(message: string): void {
  const t = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
  console.log(`${t} [payments] ${message}`);
}

export function registerPaymentRoutes(app: Express): void {
  /**
   * POST /api/payments/create-order
   * Body: { amount, currency?, receipt? }
   * Returns: { orderId, amount, currency, transactionId }
   */
  app.post(
    "/api/payments/create-order",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.auth!.userId;
      const { amount, currency = "INR", receipt } = req.body;

      if (typeof amount !== "number" || amount < 1) {
        res.status(400).json({ message: "amount (number, in paise) is required" });
        return;
      }
      const receiptStr = (() => {
        if (typeof receipt === "string" && receipt.trim()) {
          return receipt.trim().slice(0, 40);
        }
        const suffix = Date.now().toString(36).slice(-8);
        const idPart = userId.length > 20 ? userId.slice(-20) : userId;
        return `enroll_${idPart}_${suffix}`.slice(0, 40);
      })();

      const created = await razorpay.createOrder({
        amount: Math.round(amount),
        currency: typeof currency === "string" ? currency : "INR",
        receipt: receiptStr,
      });

      const transaction = await storage.createTransaction({
        orderId: created.orderId,
        userId,
        amount: created.amount,
        currency: created.currency,
        status: "CREATED",
        receipt: receiptStr,
        metadata: null,
      });

      log(`Order created orderId=${created.orderId} transactionId=${transaction.id} userId=${userId}`);
      res.json({
        orderId: created.orderId,
        amount: created.amount,
        currency: created.currency,
        transactionId: transaction.id,
      });
    })
  );

  /**
   * POST /api/payments/verify
   * Body: { razorpay_payment_id, razorpay_order_id, razorpay_signature, transactionId }
   */
  app.post(
    "/api/payments/verify",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.auth!.userId;
      const {
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        razorpay_signature: signature,
        transactionId,
      } = req.body;

      if (!paymentId || !orderId || !signature || !transactionId) {
        res.status(400).json({ message: "razorpay_payment_id, razorpay_order_id, razorpay_signature and transactionId are required" });
        return;
      }

      const transaction = await storage.getTransactionById(transactionId);
      if (!transaction) {
        log(`Verify: transaction not found transactionId=${transactionId}`);
        res.status(404).json({ message: "Transaction not found" });
        return;
      }
      if (transaction.userId !== userId) {
        res.status(403).json({ message: "Transaction does not belong to you" });
        return;
      }
      if (transaction.orderId !== orderId) {
        res.status(400).json({ message: "Order ID mismatch" });
        return;
      }

      const valid = razorpay.verifyPaymentSignature(orderId, paymentId, signature);
      if (!valid) {
        await storage.updateTransaction(transactionId, { status: "FAILED" });
        log(`Verify failed (invalid signature) transactionId=${transactionId} orderId=${orderId}`);
        res.status(400).json({ message: "Payment verification failed", verified: false });
        return;
      }

      await storage.updateTransaction(transactionId, {
        status: "SUCCESS",
        paymentId,
        signature,
      });
      log(`Payment verified transactionId=${transactionId} orderId=${orderId} paymentId=${paymentId}`);
      res.json({ verified: true, transactionId });
    })
  );

  /**
   * POST /api/payments/webhook
   * Raw body required for signature verification. Handles payment.captured, payment.failed, order.paid.
   */
  app.post(
    "/api/payments/webhook",
    asyncHandler(async (req: Request, res: Response) => {
      const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
      if (!rawBody) {
        log("Webhook: no raw body available");
        res.status(400).json({ message: "Invalid request" });
        return;
      }
      const sig = req.headers["x-razorpay-signature"] as string | undefined;
      if (sig && !razorpay.verifyWebhookSignature(rawBody, sig)) {
        log("Webhook: invalid signature");
        res.status(400).json({ message: "Invalid signature" });
        return;
      }

      let payload: { event: string; payload?: { payment?: { entity?: { id: string; order_id: string; status?: string } }; order?: { entity?: { id: string } } } };
      try {
        payload = JSON.parse(rawBody.toString("utf8"));
      } catch {
        res.status(400).json({ message: "Invalid JSON" });
        return;
      }

      const event = payload?.event;
      if (!event) {
        res.status(200).json({ received: true });
        return;
      }

      const paymentEntity = payload.payload?.payment?.entity;
      const orderEntity = payload.payload?.order?.entity;
      const orderId = paymentEntity?.order_id || orderEntity?.id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        const transaction = await storage.getTransactionByOrderId(orderId);
        if (transaction) {
          if (event === "payment.captured" || event === "order.paid") {
            await storage.updateTransaction(transaction.id, {
              status: "SUCCESS",
              ...(paymentId && { paymentId }),
            });
            log(`Webhook ${event} -> SUCCESS transactionId=${transaction.id} orderId=${orderId}`);
          } else if (event === "payment.failed") {
            await storage.updateTransaction(transaction.id, { status: "FAILED" });
            log(`Webhook ${event} -> FAILED transactionId=${transaction.id} orderId=${orderId}`);
          }
        }
      }

      res.status(200).json({ received: true });
    })
  );

  /**
   * PATCH /api/payments/transactions/:id/set-pending
   * Set transaction status to PENDING when checkout is opened (optional lifecycle step).
   */
  app.patch(
    "/api/payments/transactions/:id/set-pending",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.auth!.userId;
      const { id } = req.params;
      const transaction = await storage.getTransactionById(id);
      if (!transaction || transaction.userId !== userId) {
        res.status(404).json({ message: "Transaction not found" });
        return;
      }
      if (transaction.status !== "CREATED") {
        res.status(200).json({ ok: true });
        return;
      }
      await storage.updateTransaction(id, { status: "PENDING" });
      res.json({ ok: true });
    })
  );

  /**
   * GET /api/payments/razorpay-key
   * Returns the Razorpay key id for frontend Checkout (no secret).
   */
  app.get(
    "/api/payments/razorpay-key",
    asyncHandler(async (_req: Request, res: Response) => {
      try {
        const keyId = razorpay.getKeyId();
        res.json({ keyId });
      } catch {
        res.status(503).json({ message: "Payment configuration unavailable" });
      }
    })
  );
}
