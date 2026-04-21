import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Flame, Lock, Loader2, ChevronLeft, UserPlus, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { storePinHash, clearPinHash as _clearPinHash, getStoredPinHash as _getStoredPinHash } from "@/lib/pinStorage";

// SHA-256 via Web Crypto API (no external dep)
async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Shared dark styles ───────────────────────────────────────────────────────
const BG = "oklch(0.08 0 0)";
const CARD_BG = "oklch(0.13 0 0)";
const CARD_BORDER = "rgba(255,255,255,0.07)";
const ORANGE = "oklch(0.65 0.20 40)";
const ORANGE_DIM = "rgba(251,146,60,0.12)";

// ─── Brand header ─────────────────────────────────────────────────────────────
function Brand() {
  return (
    <div className="flex items-center gap-2.5 mb-8">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: ORANGE }}
      >
        <Flame className="w-5 h-5 text-white" />
      </div>
      <span className="text-white font-extrabold text-xl tracking-tight">توصيل غاز</span>
    </div>
  );
}

// ─── Provider Selector ────────────────────────────────────────────────────────
function ProviderSelector() {
  const [, navigate] = useLocation();
  const { data: providers, isLoading } = trpc.providers.list.useQuery();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: BG }}
      dir="rtl"
    >
      <Brand />

      <div
        className="w-full max-w-sm rounded-3xl p-6 space-y-4"
        style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
      >
        <div className="text-center mb-2">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: ORANGE_DIM }}
          >
            <Lock className="w-7 h-7" style={{ color: ORANGE }} />
          </div>
          <h1 className="text-white text-xl font-extrabold">دخول المزود</h1>
          <p className="text-white/40 text-sm mt-1">اختر حسابك للمتابعة</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: ORANGE }} />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {(providers ?? []).map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/provider/${p.id}/login`)}
                className="flex items-center justify-between w-full px-4 py-3 rounded-2xl transition-all text-right"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(251,146,60,0.4)";
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(251,146,60,0.06)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)";
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                }}
              >
                <ChevronLeft className="w-4 h-4 text-white/30 flex-shrink-0" />
                <div className="flex flex-col items-end">
                  <span className="font-bold text-white text-sm">{p.name}</span>
                  <span className="text-xs text-white/40" dir="ltr">{p.phone}</span>
                </div>
              </button>
            ))}
            {(providers ?? []).length === 0 && (
              <p className="text-white/30 text-sm py-4 text-center">لا يوجد مزودون متاحون</p>
            )}
          </div>
        )}

        <div
          className="pt-4 flex flex-col gap-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <button
            onClick={() => navigate("/provider/register")}
            className="w-full py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={{ background: ORANGE }}
          >
            <UserPlus className="w-4 h-4" />
            انضم كمزوّد جديد
          </button>
          <button
            onClick={() => navigate("/provider/onboarding/0")}
            className="w-full py-2 rounded-2xl text-xs text-white/30 hover:text-white/50 transition-colors flex items-center justify-center gap-1.5"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            تتبع حالة طلب الانضمام
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PIN Login ────────────────────────────────────────────────────────────────
export default function ProviderLogin() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const rawId = id ?? "";
  const providerId = parseInt(rawId, 10);
  const isValidId = !isNaN(providerId) && providerId > 0 && rawId !== ":id";

  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const verifyPin = trpc.providers.verifyPin.useMutation({
    onSuccess: async (data) => {
      const pinStr = pin.join("");
      const hash = await sha256Hex(pinStr);
      storePinHash(providerId, hash);
      const status = (data as { providerStatus?: string })?.providerStatus;
      if (status === "pending_review" || status === "rejected") {
        navigate(`/provider/onboarding/${providerId}`);
      } else {
        navigate(`/provider/${providerId}`);
      }
    },
    onError: (err) => {
      setIsVerifying(false);
      setPin(["", "", "", ""]);
      inputRefs[0].current?.focus();
      toast.error(
        err.message.includes("رمز") || err.message.includes("PIN")
          ? "❌ رمز خاطئ — حاول مجدداً"
          : "خطأ في التحقق من الرمز"
      );
    },
  });

  useEffect(() => {
    if (pin.every((d) => d !== "")) {
      handleSubmit();
    }
  }, [pin]);

  async function handleSubmit() {
    if (!isValidId) return;
    const pinStr = pin.join("");
    if (pinStr.length !== 4) return;
    setIsVerifying(true);
    const hash = await sha256Hex(pinStr);
    verifyPin.mutate({ providerId, pinHash: hash });
  }

  function handleDigit(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...pin];
    next[index] = value;
    setPin(next);
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  }

  if (!isValidId) {
    return <ProviderSelector />;
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: BG }}
      dir="rtl"
    >
      <Brand />

      <div
        className="w-full max-w-sm rounded-3xl p-6 space-y-5"
        style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
      >
        <div className="text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: ORANGE_DIM }}
          >
            <Lock className="w-7 h-7" style={{ color: ORANGE }} />
          </div>
          <h1 className="text-white text-xl font-extrabold">دخول المزود</h1>
          <p className="text-white/40 text-sm mt-1">أدخل رمز الدخول المكون من ٤ أرقام</p>
          <p className="text-white/25 text-xs mt-0.5">مزود رقم #{providerId}</p>
        </div>

        {/* PIN inputs */}
        <div className="flex gap-3 justify-center" dir="ltr">
          {pin.map((digit, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-14 h-14 text-center text-2xl font-extrabold rounded-2xl outline-none transition-all"
              style={{
                background: digit ? "rgba(251,146,60,0.12)" : "rgba(255,255,255,0.06)",
                border: `2px solid ${digit ? ORANGE : "rgba(255,255,255,0.12)"}`,
                color: "#ffffff",
                caretColor: ORANGE,
                WebkitTextFillColor: "#ffffff",
              }}
              autoFocus={i === 0}
              disabled={isVerifying}
            />
          ))}
        </div>

        {isVerifying ? (
          <div className="flex items-center justify-center gap-2 text-white/40 text-sm py-1">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: ORANGE }} />
            <span>جارٍ التحقق…</span>
          </div>
        ) : (
          <Button
            className="w-full rounded-2xl font-bold text-base text-white transition-opacity hover:opacity-90"
            style={{ height: "52px", background: ORANGE }}
            onClick={handleSubmit}
            disabled={pin.some((d) => d === "")}
          >
            تأكيد الدخول
          </Button>
        )}

        <button
          onClick={() => navigate("/provider/login")}
          className="text-xs text-white/25 hover:text-white/45 transition-colors block mx-auto"
        >
          اختيار مزود آخر
        </button>
      </div>
    </div>
  );
}
