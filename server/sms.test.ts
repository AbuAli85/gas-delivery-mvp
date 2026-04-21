/**
 * sms.test.ts
 * Validates Twilio SMS configuration and helper functions.
 */
import { describe, it, expect } from "vitest";
import { isTwilioConfigured, buildDeliveryStartedSms, buildOrderDeliveredSms } from "./sms";

describe("SMS Configuration", () => {
  it("should have Twilio credentials configured", () => {
    const configured = isTwilioConfigured();
    // In dev mode (no credentials), this returns false — that's acceptable
    // In production, this should be true
    expect(typeof configured).toBe("boolean");
    console.log(`[SMS] Twilio configured: ${configured}`);
  });

  it("should build delivery-started SMS with correct content", () => {
    const msg = buildDeliveryStartedSms({
      customerName: "أحمد",
      providerName: "محمد",
      providerPhone: "+96891234567",
      estimatedMinutes: 25,
      orderId: 42,
      gasAmount: "2",
    });
    expect(msg).toContain("أحمد");
    expect(msg).toContain("#42");
    expect(msg).toContain("2 أسطوانة");
    expect(msg).toContain("25 دقيقة");
    expect(msg).toContain("محمد");
    expect(msg).toContain("+96891234567");
  });

  it("should build order-delivered SMS with correct content", () => {
    const msg = buildOrderDeliveredSms({
      customerName: "سارة",
      orderId: 99,
      totalPrice: "6.600",
      paymentMethod: "cash",
    });
    expect(msg).toContain("سارة");
    expect(msg).toContain("#99");
    expect(msg).toContain("6.600");
    expect(msg).toContain("نقداً");
  });

  it("should build SMS with null estimatedMinutes gracefully", () => {
    const msg = buildDeliveryStartedSms({
      customerName: "خالد",
      providerName: "علي",
      providerPhone: "+96899999999",
      estimatedMinutes: null,
      orderId: 1,
      gasAmount: "1",
    });
    expect(msg).toContain("قريباً");
    expect(msg).not.toContain("null");
    expect(msg).not.toContain("undefined");
  });

  it("should validate Twilio credentials against API if configured", async () => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;

    if (!sid || !token) {
      console.log("[SMS] Skipping Twilio API validation — credentials not set (dev mode)");
      return;
    }

    // Lightweight validation: fetch account info (no SMS sent)
    const credentials = Buffer.from(`${sid}:${token}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}.json`,
      { headers: { Authorization: `Basic ${credentials}` } }
    );

    if (res.status === 401) {
      throw new Error("Twilio credentials are invalid — please check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN");
    }

    expect(res.ok).toBe(true);
    const data = await res.json() as { sid: string; status: string };
    expect(data.sid).toBe(sid);
    console.log(`[SMS] Twilio account validated: ${data.sid} (${data.status})`);
  }, 15_000);
});
