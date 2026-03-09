import crypto from "crypto";

function log(message: string, p0: string): void {
  const t = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
  console.log(`${t} [razorpay] ${message}`);
}

const RAZORPAY_BASE = "https://api.razorpay.com/v1";

function getKeyId(): string {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_MID;
  if (!keyId) throw new Error("RAZORPAY_KEY_ID or RAZORPAY_MID is not set");
  return keyId;
}

function getKeySecret(): string {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("RAZORPAY_KEY_SECRET is not set");
  return secret;
}

function getWebhookSecret(): string {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return "";
  return secret;
}

export interface CreateOrderParams {
  amount: number;
  currency: string;
  receipt: string;
}

export interface CreateOrderResult {
  orderId: string;
  amount: number;
  currency: string;
}

/**
 * Create an order on Razorpay. Amount in paise.
 */
export async function createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const { amount, currency, receipt } = params;
  const keyId = getKeyId();
  const keySecret = getKeySecret();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const res = await fetch(`${RAZORPAY_BASE}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount: Math.round(amount),
      currency: currency || "INR",
      receipt: receipt || undefined,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    log(`Razorpay create order failed: ${res.status} ${errText}`, "razorpay");
    throw new Error(`Razorpay create order failed: ${res.status}`);
  } else {
    log(`Razorpay create order success: ${res.status}`, "razorpay");
  }

  const data = (await res.json()) as { id: string; amount: number; currency: string };
  return {
    orderId: data.id,
    amount: data.amount,
    currency: data.currency,
  };
}

/**
 * Verify payment signature from Checkout success callback.
 * Razorpay signature = HMAC SHA256(key_secret, order_id + "|" + payment_id).
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const keySecret = getKeySecret();
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac("sha256", keySecret).update(body).digest("hex");
  return expected === signature;
}

/**
 * Verify webhook signature. Razorpay uses HMAC SHA256(webhook_secret, raw_body).
 */
export function verifyWebhookSignature(rawBody: Buffer | string, signature: string): boolean {
  const secret = getWebhookSecret();
  if (!secret) {
    log("RAZORPAY_WEBHOOK_SECRET not set; webhook signature not verified", "razorpay");
    return false;
  }
  const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return expected === signature;
}

export { getKeyId };
