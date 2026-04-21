/**
 * CustomerLogin — Secure Server-Side OTP Authentication
 * ────────────────────────────────────────────────────────
 * Uses server-side requestOtp + verifyOtp procedures (bcrypt-hashed, 10-min expiry, 3 attempts).
 * Firebase Phone Auth can be layered on top later — no client-side Firebase dependency here.
 * Dev mode: OTP shown in a large persistent box on screen (no SMS needed).
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Phone, ArrowRight, Loader2, CheckCircle2,
  ShieldCheck, Clock, AlertTriangle, RefreshCw, Info
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
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  // Dev mode: store the OTP returned from server to display on screen
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const resendTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const { remaining: otpRemaining, label: otpLabel, start: startOtpTimer } = useCountdown();

  // ── tRPC mutations ──────────────────────────────────────────────────────────
  const requestOtp = trpc.customerAuth.requestOtp.useMutation({
    onSuccess: (data) => {
      setStep("otp");
      setAttemptsLeft(3);
      setOtp(["", "", "", "", "", ""]);
      startOtpTimer(data.expiresInSeconds ?? 600);
      startResendCooldown(60);

      if (data.demoOtp) {
        // Dev mode: store OTP in state for persistent display on screen
        setDevOtp(data.demoOtp);
        // Also show a brief toast as backup
        toast.success(
          isRTL
            ? `رمزك التجريبي: ${data.demoOtp}`
            : `Dev code: ${data.demoOtp}`,
          { duration: 8000 }
        );
      } else {
        setDevOtp(null);
        toast.success(
          isRTL ? "تم إرسال رمز التحقق إلى هاتفك عبر SMS ✓" : "Verification code sent via SMS ✓"
        );
      }
    },
    onError: (err) => {
      const msg = err.message || "";
      if (msg.includes("طلبت رموزاً كثيرة") || msg.includes("TOO_MANY_REQUESTS")) {
        toast.error(isRTL ? "طلبات كثيرة. انتظر 10 دقائق وحاول مجدداً." : "Too many requests. Wait 10 minutes.");
      } else if (msg.includes("غير صالح") || msg.includes("invalid")) {
        toast.error(isRTL ? "رقم الهاتف غير صالح. استخدم الصيغة الدولية (+968...)" : "Invalid phone number. Use international format (+968...)");
      } else {
        toast.error(isRTL ? "فشل إرسال الرمز. تحقق من الرقم وحاول مجدداً." : "Failed to send code. Check the number and try again.");
      }
    },
  });

  const verifyOtpMutation = trpc.customerAuth.verifyOtp.useMutation({
    onSuccess: (data) => {
      saveCustomerSession(data.token, data.phone);
      setVerifySuccess(true);
      setDevOtp(null);
      toast.success(isRTL ? "تم تسجيل الدخول بنجاح! ✓" : "Logged in successfully! ✓");
      setTimeout(() => navigate("/"), 800);
    },
    onError: (err) => {
      const msg = err.message || "";
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);

      if (msg.includes("متبقي")) {
        const match = msg.match(/متبقي (\d+)/);
        const left = match ? parseInt(match[1]) : attemptsLeft - 1;
        setAttemptsLeft(left);
        toast.error(msg);
      } else if (msg.includes("استنفاد") || msg.includes("all attempts")) {
        setAttemptsLeft(0);
        toast.error(isRTL ? "تم استنفاد المحاولات. اطلب رمزاً جديداً." : "All attempts used. Request a new code.");
      } else if (msg.includes("انتهت صلاحية") || msg.includes("expired")) {
        toast.error(isRTL ? "انتهت صلاحية الرمز. اطلب رمزاً جديداً." : "Code expired. Request a new code.");
      } else {
        toast.error(msg || (isRTL ? "فشل التحقق. حاول مجدداً." : "Verification failed. Try again."));
      }
    },
  });

  // ── Resend cooldown ─────────────────────────────────────────────────────────
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

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim() || requestOtp.isPending) return;
    let normalized = phone.replace(/\s/g, "");
    if (!normalized.startsWith("+")) normalized = "+968" + normalized;
    setPhone(normalized);
    requestOtp.mutate({ phone: normalized });
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
    if (code.length === 6 && !isVerifying && !verifySuccess && step === "otp") {
      setIsVerifying(true);
      verifyOtpMutation.mutate({ phone, otp: code });
    }
  }, [otp]);

  useEffect(() => {
    if (!verifyOtpMutation.isPending) setIsVerifying(false);
  }, [verifyOtpMutation.isPending]);

  const isExpired = step === "otp" && otpRemaining === 0;
  const isSending = requestOtp.isPending;

  return (
    <div className="mobile-screen bg-gray-50 items-center justify-center px-6" dir={dir}>

      {/* ── Logo ── */}
      <div className="flex flex-col items-center mb-8">
        <img
          src="/manus-storage/logo-orange-on-black_bcf6e388.png"
          alt="OWASEEL"
          className="h-20 w-auto object-contain mb-3 rounded-2xl"
        />
        <p className="text-sm text-gray-500 mt-1 font-medium">
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
                ? "سنرسل رمز تحقق مكون من 6 أرقام"
                : "We'll send a 6-digit verification code"}
            </p>
          </div>

          {/* Security badge */}
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-700">
              {isRTL
                ? "مشفّر بالكامل · صالح 10 دقائق · 3 محاولات فقط"
                : "Fully encrypted · Valid 10 minutes · 3 attempts only"}
            </p>
          </div>

          {/* Dev mode notice */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              {isRTL
                ? "وضع تجريبي: سيظهر الرمز على الشاشة. سيُرسَل عبر SMS بعد تفعيل Firebase Phone Auth."
                : "Dev mode: code will appear on screen. SMS will be sent once Firebase Phone Auth is activated."}
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

          {/* ── Dev mode OTP display box ── */}
          {devOtp && (
            <div className="bg-orange-500 rounded-3xl p-5 text-center shadow-lg">
              <p className="text-white text-xs font-semibold mb-1 opacity-90">
                {isRTL ? "🔑 رمز التحقق التجريبي" : "🔑 Dev Verification Code"}
              </p>
              <p className="text-white text-4xl font-black tracking-[0.3em] my-2 font-mono">
                {devOtp}
              </p>
              <p className="text-white text-xs opacity-80">
                {isRTL
                  ? "أدخل هذا الرمز في الحقول أدناه"
                  : "Enter this code in the fields below"}
              </p>
              <p className="text-orange-100 text-xs mt-2 opacity-70">
                {isRTL
                  ? "سيُرسَل عبر SMS بعد تفعيل Firebase Phone Auth"
                  : "Will be sent via SMS once Firebase Phone Auth is activated"}
              </p>
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-sm p-6 space-y-5">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  {isRTL ? "رمز التحقق" : "Verification Code"}
                </p>
                <p className="text-xs text-gray-400">
                  {isRTL ? `أُرسل إلى ${phone}` : `Sent to ${phone}`}
                </p>
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
                setDevOtp(null);
              }}
              className="flex-1 text-sm text-gray-400 py-3 rounded-2xl border border-gray-200 bg-white"
            >
              {isRTL ? "تغيير الرقم" : "Change number"}
            </button>

            <button
              onClick={() => {
                if (resendCooldown > 0 || isSending) return;
                requestOtp.mutate({ phone });
              }}
              disabled={isSending || resendCooldown > 0}
              className="flex-1 text-sm text-primary py-3 rounded-2xl border border-primary/30 bg-primary/5 font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {resendCooldown > 0
                ? `${isRTL ? "إعادة" : "Resend"} (${resendCooldown}s)`
                : (isRTL ? "إعادة الإرسال" : "Resend code")}
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full text-sm text-gray-400 py-2"
          >
            {isRTL ? "تخطّي — المتابعة كضيف" : "Skip — Continue as guest"}
          </button>
        </div>
      )}
    </div>
  );
}
