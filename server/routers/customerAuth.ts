/**
 * Customer Phone OTP Authentication
 * ─────────────────────────────────
 * Lightweight phone-based auth — no OAuth required.
 * OTP is 6 digits, valid for 10 minutes.
 * In production: send via SMS (Twilio). In dev: log to console.
 */
import crypto from "crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import {
  upsertCustomerSession,
  getCustomerSessionByPhone,
  verifyCustomerOtp,
  getCustomerSessionByToken,
} from "../db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

async function sendOtpSms(phone: string, otp: string): Promise<void> {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

  if (twilioSid && twilioToken && twilioFrom) {
    // Production: send via Twilio
    const body = `رمز التحقق لتوصيل الغاز: ${otp} (صالح 10 دقائق)`;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone, From: twilioFrom, Body: body }).toString(),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[OTP] Twilio error:", err);
      throw new Error("فشل إرسال رمز التحقق");
    }
  } else {
    // Development: log to console
    console.log(`[OTP DEV] Phone: ${phone} → OTP: ${otp}`);
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const customerAuthRouter = router({
  /**
   * Step 1: Request OTP — send 6-digit code to phone.
   */
  requestOtp: publicProcedure
    .input(z.object({
      phone: z.string().min(8).max(20).regex(/^\+?[0-9\s\-()]+$/, "رقم هاتف غير صالح"),
    }))
    .mutation(async ({ input }) => {
      const phone = input.phone.replace(/\s/g, "");
      const otp = generateOtp();
      const otpHash = hashOtp(otp);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await upsertCustomerSession(phone, otpHash, expiresAt);
      await sendOtpSms(phone, otp);

      return { success: true, message: "تم إرسال رمز التحقق إلى هاتفك" };
    }),

  /**
   * Step 2: Verify OTP — returns session token on success.
   */
  verifyOtp: publicProcedure
    .input(z.object({
      phone: z.string().min(8).max(20),
      otp: z.string().length(6),
    }))
    .mutation(async ({ input }) => {
      const phone = input.phone.replace(/\s/g, "");
      const session = await getCustomerSessionByPhone(phone);

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم طلب رمز تحقق لهذا الرقم" });
      }

      if (!session.otpHash || !session.otpExpiresAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "رمز التحقق غير صالح" });
      }

      if (new Date() > new Date(session.otpExpiresAt)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "انتهت صلاحية رمز التحقق. اطلب رمزاً جديداً." });
      }

      const inputHash = hashOtp(input.otp);
      if (inputHash !== session.otpHash) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "رمز التحقق غير صحيح" });
      }

      const token = generateSessionToken();
      await verifyCustomerOtp(phone, token);

      return {
        success: true,
        token,
        phone,
        message: "تم التحقق بنجاح",
      };
    }),

  /**
   * Validate a session token (used on app load to restore session).
   */
  validateToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const session = await getCustomerSessionByToken(input.token);
      if (!session) return null;
      return { phone: session.phone, verified: session.verified };
    }),
});
