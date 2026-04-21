/**
 * CustomerLogin — Secure Phone OTP authentication.
 * Features:
 *  - 5-minute countdown timer
 *  - Attempt counter (max 3)
 *  - Rate limit feedback
 *  - Security badge
 *  - Auto-submit on 6th digit
 *  - Resend with cooldown
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Flame, Phone, ArrowRight, Loader2, CheckCircle2,
  ShieldCheck, Clock, AlertTriangle, RefreshCw, Lock
} from "lucide-react";
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
function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback((s: number) => {
    setRemaining(s);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
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
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const resendTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const { remaining: otpRemaining, label: otpLabel, start: startOtpTimer } = useCountdown(300);

  // Resend cooldown timer
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

  const requestOtp = trpc.customerAuth.requestOtp.useMutation({
    onSuccess: (data) => {
      if (data.demoOtp) {
        setDemoOtp(data.demoOtp);
        toast.info(
          isRTL ? `وضع تجريبي — رمزك: ${data.demoOtp}` : `Demo mode — your code: ${data.demoOtp}`,
          { duration: 30000 }
        );
      } else {
        toast.success(isRTL ? "تم إرسال رمز التحقق إلى هاتفك" : "Verification code sent to your phone");
      }
      setStep("otp");
      setAttemptsLeft(3);
      setOtp(["", "", "", "", "", ""]);
      startOtpTimer(data.expiresInSeconds ?? 300);
      startResendCooldown(60);
    },
    onError: (err) => {
      const msg = err.message || (isRTL ? "فشل إرسال الرمز" : "Failed to send code");
      toast.error(msg);
    },
  });

  const verifyOtp = trpc.customerAuth.verifyOtp.useMutation({
    onSuccess: (data) => {
      saveCustomerSession(data.token, data.phone);
      toast.success(isRTL ? "تم تسجيل الدخول بنجاح! ✓" : "Logged in successfully! ✓");
      navigate("/");
    },
    onError: (err) => {
      const msg = err.message || (isRTL ? "رمز غير صحيح" : "Incorrect code");
      toast.error(msg);
      // Decrement attempts display
      setAttemptsLeft((prev) => Math.max(0, prev - 1));
      // Reset OTP boxes
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    },
  });

  function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    requestOtp.mutate({ phone });
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
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
    if (code.length === 6 && !verifyOtp.isPending) {
      verifyOtp.mutate({ phone, otp: code });
    }
  }, [otp]);

  const isExpired = step === "otp" && otpRemaining === 0 && !demoOtp;

  return (
    <div className="mobile-screen bg-gray-50 items-center justify-center px-6" dir={dir}>

      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 shadow-lg"
          style={{ background: "linear-gradient(135deg, oklch(0.12 0 0), oklch(0.53 0.22 27))" }}
        >
          <Flame className="w-8 h-8 text-orange-400" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">
          {isRTL ? "أًوصّل" : "OWASEEL"}
        </h1>
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
              {isRTL ? "سنرسل رمز تحقق مكون من 6 أرقام" : "We'll send a 6-digit verification code"}
            </p>
          </div>

          {/* Security badge */}
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-700">
              {isRTL
                ? "رمز مشفّر · صالح 5 دقائق فقط · 3 محاولات كحد أقصى"
                : "Encrypted code · Valid 5 min only · Max 3 attempts"}
            </p>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={!phone.trim() || requestOtp.isPending}
            className="w-full rounded-2xl font-extrabold text-base h-14"
            style={{ background: "oklch(0.53 0.22 27)" }}
          >
            {requestOtp.isPending ? (
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
              {/* Countdown timer */}
              {!demoOtp && (
                <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                  isExpired
                    ? "bg-red-100 text-red-600"
                    : otpRemaining < 60
                    ? "bg-orange-100 text-orange-600"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  {isExpired
                    ? (isRTL ? "انتهت الصلاحية" : "Expired")
                    : otpLabel}
                </div>
              )}
            </div>

            {/* OTP Input Boxes */}
            <div className="flex gap-2 justify-center" dir="ltr" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  disabled={isExpired || attemptsLeft === 0 || verifyOtp.isPending}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-2xl focus:outline-none transition-colors ${
                    digit
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 text-gray-900"
                  } focus:border-primary disabled:opacity-40 disabled:cursor-not-allowed`}
                />
              ))}
            </div>

            {/* Status indicators */}
            {verifyOtp.isPending && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                {isRTL ? "جارٍ التحقق…" : "Verifying…"}
              </div>
            )}

            {verifyOtp.isSuccess && (
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
                  {isRTL
                    ? `تبقّى ${attemptsLeft} محاولة فقط`
                    : `${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining`}
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

          {/* Demo mode banner */}
          {demoOtp && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-center">
              <p className="text-xs text-amber-600 font-medium mb-1">
                {isRTL ? "⚠️ وضع تجريبي — لا يوجد SMS" : "⚠️ Demo mode — no SMS sent"}
              </p>
              <p className="text-2xl font-black tracking-[0.3em] text-amber-800 font-mono">{demoOtp}</p>
              <button
                onClick={() => {
                  const digits = demoOtp.split("");
                  setOtp(digits);
                  setTimeout(() => otpRefs.current[5]?.focus(), 50);
                }}
                className="mt-2 text-xs text-amber-700 underline"
              >
                {isRTL ? "ملء تلقائياً" : "Auto-fill"}
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep("phone");
                setDemoOtp(null);
                setOtp(["", "", "", "", "", ""]);
                setAttemptsLeft(3);
              }}
              className="flex-1 text-sm text-gray-400 py-3 rounded-2xl border border-gray-200 bg-white"
            >
              {isRTL ? "تغيير الرقم" : "Change number"}
            </button>

            <button
              onClick={() => {
                if (resendCooldown > 0) return;
                requestOtp.mutate({ phone });
              }}
              disabled={requestOtp.isPending || resendCooldown > 0}
              className="flex-1 text-sm text-primary py-3 rounded-2xl border border-primary/30 bg-primary/5 font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {requestOtp.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {resendCooldown > 0
                ? `${isRTL ? "إعادة الإرسال" : "Resend"} (${resendCooldown}s)`
                : (isRTL ? "إعادة الإرسال" : "Resend")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
