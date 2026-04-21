/**
 * sms.ts
 * SMS notification helper using Twilio.
 * Falls back to console logging in dev mode when Twilio is not configured.
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

export interface SmsResult {
  success: boolean;
  sid?: string;
  error?: string;
  devMode?: boolean;
}

/**
 * Send an SMS message to a phone number.
 * Uses Twilio REST API if credentials are configured,
 * otherwise logs the message to console (dev mode).
 */
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  // Normalize phone number — ensure it starts with +968 for Oman if no country code
  const normalized = normalizeOmaniPhone(to);

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    // Dev mode: log to console
    console.log(`[SMS DEV MODE] To: ${normalized}`);
    console.log(`[SMS DEV MODE] Message: ${body}`);
    return { success: true, devMode: true };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");

    const params = new URLSearchParams();
    params.append("To", normalized);
    params.append("From", TWILIO_FROM_NUMBER);
    params.append("Body", body);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await res.json() as { sid?: string; error_message?: string; status?: string };

    if (!res.ok || data.error_message) {
      console.error("[SMS] Twilio error:", data.error_message);
      return { success: false, error: data.error_message ?? "Unknown Twilio error" };
    }

    console.log(`[SMS] Sent to ${normalized}, SID: ${data.sid}`);
    return { success: true, sid: data.sid };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[SMS] Network error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Normalize an Omani phone number to E.164 format (+968XXXXXXXX).
 * Handles: 9XXXXXXX, 009689XXXXXXX, +9689XXXXXXX
 */
function normalizeOmaniPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (phone.startsWith("+")) return phone; // already E.164
  if (digits.startsWith("00968")) return `+${digits.slice(2)}`;
  if (digits.startsWith("968")) return `+${digits}`;
  if (digits.length === 8) return `+968${digits}`;
  return `+${digits}`; // best effort
}

/**
 * Check if Twilio SMS is configured.
 */
export function isTwilioConfigured(): boolean {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER);
}

// ── Pre-built message templates ────────────────────────────────────────────

/**
 * Message sent to customer when provider starts delivery route.
 */
export function buildDeliveryStartedSms(opts: {
  customerName: string;
  providerName: string;
  providerPhone: string;
  estimatedMinutes: number | null;
  orderId: number;
  gasAmount: string;
}): string {
  const eta = opts.estimatedMinutes ? `خلال ${opts.estimatedMinutes} دقيقة` : "قريباً";
  return (
    `مرحباً ${opts.customerName}،\n` +
    `طلبك رقم #${opts.orderId} (${opts.gasAmount} أسطوانة) في الطريق إليك ${eta}.\n` +
    `المزود: ${opts.providerName} — ${opts.providerPhone}\n` +
    `شكراً لاستخدامك أواصل 🔥`
  );
}

/**
 * Message sent to customer when order is delivered.
 */
export function buildOrderDeliveredSms(opts: {
  customerName: string;
  orderId: number;
  totalPrice: string;
  paymentMethod: string;
}): string {
  const payment = opts.paymentMethod === "cash" ? "نقداً" : "بطاقة/حوالة";
  return (
    `مرحباً ${opts.customerName}،\n` +
    `تم توصيل طلبك رقم #${opts.orderId} بنجاح.\n` +
    `المبلغ: ${parseFloat(opts.totalPrice).toFixed(3)} OMR (${payment})\n` +
    `شكراً لاستخدامك أواصل 🔥`
  );
}
