/**
 * CustomerLogin — Phone OTP authentication for customers.
 * Two-step: enter phone → enter 6-digit OTP.
 * Session token stored in localStorage.
 */
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Flame, Phone, ArrowRight, Loader2, CheckCircle2, Shield } from "lucide-react";
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

export default function CustomerLogin() {
  const [, navigate] = useLocation();
  const { dir } = useLanguage();
  const isRTL = dir === "rtl";

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const requestOtp = trpc.customerAuth.requestOtp.useMutation({
    onSuccess: (data) => {
      if (data.demoOtp) {
        setDemoOtp(data.demoOtp);
        toast.info(
          isRTL
            ? `وضع تجريبي — رمزك: ${data.demoOtp}`
            : `Demo mode — your code: ${data.demoOtp}`,
          { duration: 30000 }
        );
      } else {
        toast.success(isRTL ? "تم إرسال رمز التحقق إلى هاتفك" : "Verification code sent to your phone");
      }
      setStep("otp");
    },
    onError: (err) => toast.error(err.message || (isRTL ? "فشل إرسال الرمز" : "Failed to send code")),
  });

  const verifyOtp = trpc.customerAuth.verifyOtp.useMutation({
    onSuccess: (data) => {
      saveCustomerSession(data.token, data.phone);
      toast.success(isRTL ? "تم تسجيل الدخول بنجاح!" : "Logged in successfully!");
      navigate("/");
    },
    onError: (err) => toast.error(err.message || (isRTL ? "رمز غير صحيح" : "Incorrect code")),
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
    if (code.length === 6) {
      verifyOtp.mutate({ phone, otp: code });
    }
  }, [otp]);

  return (
    <div className="mobile-screen bg-gray-50 items-center justify-center px-6" dir={dir}>
      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
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
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  {isRTL ? "رمز التحقق" : "Verification Code"}
                </p>
                <p className="text-xs text-gray-400">
                  {isRTL ? `أُرسل إلى ${phone}` : `Sent to ${phone}`}
                </p>
              </div>
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
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-2xl focus:outline-none transition-colors ${
                    digit
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 text-gray-900"
                  } focus:border-primary`}
                />
              ))}
            </div>

            {verifyOtp.isPending && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                {isRTL ? "جارٍ التحقق…" : "Verifying…"}
              </div>
            )}

            {verifyOtp.isSuccess && (
              <div className="flex items-center justify-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                {isRTL ? "تم التحقق بنجاح" : "Verified successfully"}
              </div>
            )}
          </div>

          {/* Demo mode: show OTP prominently */}
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

          <button
            onClick={() => {
              setStep("phone");
              setDemoOtp(null);
              setOtp(["", "", "", "", "", ""]);
            }}
            className="w-full text-sm text-gray-400 py-2"
          >
            {isRTL ? "تغيير رقم الهاتف" : "Change phone number"}
          </button>

          <button
            onClick={() => requestOtp.mutate({ phone })}
            disabled={requestOtp.isPending}
            className="w-full text-sm text-primary py-2 font-medium"
          >
            {requestOtp.isPending
              ? (isRTL ? "جارٍ الإرسال…" : "Sending…")
              : (isRTL ? "إعادة إرسال الرمز" : "Resend Code")}
          </button>
        </div>
      )}
    </div>
  );
}
