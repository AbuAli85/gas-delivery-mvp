/**
 * CustomerLogin — Firebase Phone Auth OTP
 * Real SMS via Firebase Authentication.
 * Features: countdown timer, 3-attempt limit, resend cooldown, security badge.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Flame, Phone, ArrowRight, Loader2, CheckCircle2,
  ShieldCheck, Clock, AlertTriangle, RefreshCw, Lock
} from "lucide-react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const STORAGE_KEY = "gas_customer_token";
const STORAGE_PHONE = "gas_customer_phone";

export function getCustomerToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function getCustomerPhone(): string | null {
  return localStorage.getItem(STORAGE_PHONE);
}

export function clearCustomerSession(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_PHONE);
}

export function saveCustomerSession(token: string, phone: string): void {
  localStorage.setItem(STORAGE_KEY, token);
  localStorage.setItem(STORAGE_PHONE, phone);
}

// ─── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown() {
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback((s: number) => {
    setRemaining(s);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  return { remaining, label: `${mm}:${ss}`, start };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CustomerLogin() {
  const [, navigate] = useLocation();
  const { dir } = useLanguage();
  const isRTL = dir === "rtl";

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const resendTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const { remaining: otpRemaining, label: otpLabel, start: startOtpTimer } = useCountdown();

  // Server-side session issuer (after Firebase verifies the OTP)
  const issueSession = trpc.customerAuth.issueSession.useMutation({
    onSuccess: (data) => {
      saveCustomerSession(data.token, data.phone);
      setVerifySuccess(true);
      toast.success(isRTL ? "تم تسجيل الدخول بنجاح! ✓" : "Logged in successfully! ✓");
      setTimeout(() => navigate("/"), 800);
    },
    onError: (err) => {
      toast.error(err.message || (isRTL ? "خطأ في الخادم" : "Server error"));
    },
  });

  // Resend cooldown
  function startResendCooldown(secs = 60) {
    setResendCooldown(secs);
    if (resendTimer.current) clearInterval(resendTimer.current);
    resendTimer.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(resendTimer.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }
  useEffect(() => () => { if (resendTimer.current) clearInterval(resendTimer.current); }, []);

  // Initialize invisible reCAPTCHA
  function initRecaptcha() {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {},
      });
    }
    return recaptchaRef.current;
  }

  async function sendOtp(phoneNumber: string) {
    setIsSending(true);
    try {
      const verifier = initRecaptcha();
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      confirmationRef.current = confirmation;
      setStep("otp");
      setAttemptsLeft(3);
      setOtp(["", "", "", "", "", ""]);
      startOtpTimer(300); // 5 minutes
      startResendCooldown(60);
      toast.success(isRTL ? "تم إرسال رمز التحقق إلى هاتفك عبر SMS ✓" : "Verification code sent via SMS ✓");
    } catch (err: unknown) {
      console.error("[Firebase Phone Auth]", err);
      // Reset reCAPTCHA on error
      recaptchaRef.current = null;
      const msg = (err as { message?: string })?.message || "";
      if (msg.includes("invalid-phone-number") || msg.includes("INVALID_PHONE_NUMBER")) {
        toast.error(isRTL ? "رقم الهاتف غير صالح. تأكد من الصيغة الدولية (+968...)" : "Invalid phone number. Use international format (+968...)");
      } else if (msg.includes("too-many-requests") || msg.includes("TOO_MANY_ATTEMPTS")) {
        toast.error(isRTL ? "طلبات كثيرة. انتظر قليلاً وحاول مجدداً." : "Too many requests. Please wait and try again.");
      } else {
        toast.error(isRTL ? "فشل إرسال الرمز. تحقق من الرقم وحاول مجدداً." : "Failed to send code. Check the number and try again.");
      }
    } finally {
      setIsSending(false);
    }
  }

  async function verifyCode(code: string) {
    if (!confirmationRef.current) {
      toast.error(isRTL ? "انتهت الجلسة. اطلب رمزاً جديداً." : "Session expired. Request a new code.");
      return;
    }
    setIsVerifying(true);
    try {
      const result = await confirmationRef.current.confirm(code);
      const idToken = await result.user.getIdToken();
      // Issue server-side session token
      issueSession.mutate({ idToken, phone });
    } catch (err: unknown) {
      console.error("[Firebase OTP verify]", err);
      const msg = (err as { message?: string })?.message || "";
      setAttemptsLeft((prev) => Math.max(0, prev - 1));
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
      if (msg.includes("invalid-verification-code") || msg.includes("INVALID_CODE")) {
        const remaining = attemptsLeft - 1;
        toast.error(
          remaining > 0
            ? (isRTL ? `رمز غير صحيح. متبقي ${remaining} محاولة.` : `Wrong code. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`)
            : (isRTL ? "تم استنفاد المحاولات. اطلب رمزاً جديداً." : "All attempts used. Request a new code.")
        );
      } else if (msg.includes("code-expired") || msg.includes("SESSION_EXPIRED")) {
        toast.error(isRTL ? "انتهت صلاحية الرمز. اطلب رمزاً جديداً." : "Code expired. Request a new code.");
      } else {
        toast.error(isRTL ? "فشل التحقق. حاول مجدداً." : "Verification failed. Try again.");
      }
    } finally {
      setIsVerifying(false);
    }
  }

  function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    // Normalize: add +968 if no country code
    let normalized = phone.replace(/\s/g, "");
    if (!normalized.startsWith("+")) normalized = "+968" + normalized;
    setPhone(normalized);
    sendOtp(normalized);
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(""));
      otpRefs.current[5]?.focus();
    }
  }

  useEffect(() => {
    const code = otp.join("");
    if (code.length === 6 && !isVerifying && !verifySuccess) {
      verifyCode(code);
    }
  }, [otp]);

  const isExpired = step === "otp" && otpRemaining === 0;

  return (
    <div className="mobile-screen bg-gray-50 items-center justify-center px-6" dir={dir}>
      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container" />

      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <img
          src="/manus-storage/logo-orange-on-black_735a348b.png"
          alt="OWASEEL"
          className="h-20 w-auto object-contain mb-3"
        />
        <p className="text-sm text-gray-400 mt-1">
          {isRTL ? "سجّل دخولك برقم هاتفك" : "Sign in with your phone number"}
        </p>
        <div className="mt-3">
          <LanguageSwitcher />
        </div>
      </div>

      {step === "phone" ? (
        <form onSubmit={handlePhoneSubmit} className="w-full space-y-4">
          <div className="bg-white rounded-3xl shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Phone className="w-5 h-5 text-primary" />
              <p className="text-sm font-semibold text-gray-700">
                {isRTL ? "أدخل رقم هاتفك" : "Enter your phone number"}
              </p>
            </div>
            <input
              type="tel"
              inputMode="tel"
              dir="ltr"
              placeholder="+968 9X XXX XXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-lg font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
            <p className="text-xs text-gray-400 text-center">
              {isRTL
                ? "سنرسل رمز تحقق مكون من 6 أرقام عبر SMS"
                : "We'll send a 6-digit code via SMS"}
            </p>
          </div>

          {/* Security badge */}
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-700">
              {isRTL
                ? "مشفّر بالكامل عبر Firebase · صالح 5 دقائق · 3 محاولات"
                : "Fully encrypted via Firebase · Valid 5 min · 3 attempts"}
            </p>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={!phone.trim() || isSending}
            className="w-full rounded-2xl font-extrabold text-base h-14"
            style={{ background: "oklch(0.53 0.22 27)" }}
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isRTL ? "إرسال الرمز" : "Send Code"}
                <ArrowRight className="w-4 h-4 ms-2" />
              </>
            )}
          </Button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full text-sm text-gray-400 py-2"
          >
            {isRTL ? "تخطّي — المتابعة كضيف" : "Skip — Continue as guest"}
          </button>
        </form>
      ) : (
        <div className="w-full space-y-4">
          <div className="bg-white rounded-3xl shadow-sm p-6 space-y-5">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    {isRTL ? "رمز التحقق" : "Verification Code"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {isRTL ? `أُرسل إلى ${phone}` : `Sent to ${phone}`}
                  </p>
                </div>
              </div>
              {/* Countdown */}
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                isExpired ? "bg-red-100 text-red-600"
                : otpRemaining < 60 ? "bg-orange-100 text-orange-600"
                : "bg-gray-100 text-gray-600"
              }`}>
                <Clock className="w-3.5 h-3.5" />
                {isExpired ? (isRTL ? "انتهت الصلاحية" : "Expired") : otpLabel}
              </div>
            </div>

            {/* OTP boxes */}
            <div className="flex gap-2 justify-center" dir="ltr" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  disabled={isExpired || attemptsLeft === 0 || isVerifying || verifySuccess}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-2xl focus:outline-none transition-colors ${
                    digit ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-gray-900"
                  } focus:border-primary disabled:opacity-40 disabled:cursor-not-allowed`}
                />
              ))}
            </div>

            {/* Status */}
            {isVerifying && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                {isRTL ? "جارٍ التحقق…" : "Verifying…"}
              </div>
            )}
            {verifySuccess && (
              <div className="flex items-center justify-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                {isRTL ? "تم التحقق بنجاح ✓" : "Verified successfully ✓"}
              </div>
            )}

            {/* Attempts warning */}
            {attemptsLeft < 3 && attemptsLeft > 0 && (
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                <p className="text-xs text-orange-700">
                  {isRTL ? `تبقّى ${attemptsLeft} محاولة فقط` : `${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining`}
                </p>
              </div>
            )}
            {attemptsLeft === 0 && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-xs text-red-700">
                  {isRTL ? "تم استنفاد المحاولات. اطلب رمزاً جديداً." : "All attempts used. Request a new code."}
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep("phone");
                setOtp(["", "", "", "", "", ""]);
                setAttemptsLeft(3);
                setVerifySuccess(false);
                confirmationRef.current = null;
                recaptchaRef.current = null;
              }}
              className="flex-1 text-sm text-gray-400 py-3 rounded-2xl border border-gray-200 bg-white"
            >
              {isRTL ? "تغيير الرقم" : "Change number"}
            </button>

            <button
              onClick={() => {
                if (resendCooldown > 0 || isSending) return;
                confirmationRef.current = null;
                recaptchaRef.current = null;
                sendOtp(phone);
              }}
              disabled={isSending || resendCooldown > 0}
              className="flex-1 text-sm text-primary py-3 rounded-2xl border border-primary/30 bg-primary/5 font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {resendCooldown > 0
                ? `${isRTL ? "إعادة" : "Resend"} (${resendCooldown}s)`
                : (isRTL ? "إعادة الإرسال" : "Resend")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
