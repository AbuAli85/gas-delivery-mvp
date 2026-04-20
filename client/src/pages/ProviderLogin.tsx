import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Flame, Lock, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// SHA-256 via Web Crypto API (no external dep)
async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function getProviderPinKey(providerId: number): string {
  return `provider_pin_${providerId}`;
}

export function getStoredPinHash(providerId: number): string | null {
  return sessionStorage.getItem(getProviderPinKey(providerId));
}

export function storePinHash(providerId: number, pinHash: string): void {
  sessionStorage.setItem(getProviderPinKey(providerId), pinHash);
}

export function clearPinHash(providerId: number): void {
  sessionStorage.removeItem(getProviderPinKey(providerId));
}

// ─── Provider Selector (shown when no valid :id in URL) ──────────────────────

function ProviderSelector() {
  const [, navigate] = useLocation();
  const { data: providers, isLoading } = trpc.providers.list.useQuery();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "oklch(0.13 0.02 27)" }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 mb-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "oklch(0.53 0.22 27)" }}
        >
          <Flame className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-extrabold text-xl tracking-tight">توصيل غاز</span>
      </div>

      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-1">دخول المزود</h1>
        <p className="text-gray-500 text-sm mb-6">اختر حسابك للمتابعة</p>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {(providers ?? []).map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/provider/${p.id}/login`)}
                className="flex items-center justify-between w-full px-4 py-3 rounded-2xl border-2 text-right transition-all hover:border-red-500 hover:bg-red-50"
                style={{ borderColor: "oklch(0.90 0.01 27)" }}
              >
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex flex-col items-end">
                  <span className="font-bold text-gray-900">{p.name}</span>
                  <span className="text-xs text-gray-400">{p.phone}</span>
                </div>
              </button>
            ))}
            {(providers ?? []).length === 0 && (
              <p className="text-gray-400 text-sm py-4">لا يوجد مزودون متاحون</p>
            )}
          </div>
        )}
        {/* Register / status links */}
        <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col gap-2">
          <button
            onClick={() => navigate("/provider/register")}
            className="w-full py-2.5 rounded-2xl text-sm font-bold text-white"
            style={{ background: "oklch(0.53 0.22 27)" }}
          >
            + انضم كمزوّد جديد
          </button>
          <button
            onClick={() => navigate("/provider/onboarding/0")}
            className="w-full py-2 rounded-2xl text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            تتبع حالة طلب الانضمام
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PIN Login (shown when :id is a valid number) ────────────────────────────

export default function ProviderLogin() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  // Parse the ID — if it's NaN or the literal string ":id", show selector
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
      // Redirect pending/rejected providers to onboarding status page
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

  // Auto-submit when all 4 digits entered
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

  // Show provider selector if no valid ID
  if (!isValidId) {
    return <ProviderSelector />;
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "oklch(0.13 0.02 27)" }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 mb-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "oklch(0.53 0.22 27)" }}
        >
          <Flame className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-extrabold text-xl tracking-tight">توصيل غاز</span>
      </div>

      {/* Card */}
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "oklch(0.97 0.01 27)" }}
        >
          <Lock className="w-7 h-7" style={{ color: "oklch(0.53 0.22 27)" }} />
        </div>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-1">دخول المزود</h1>
        <p className="text-gray-500 text-sm mb-1">أدخل رمز الدخول المكون من ٤ أرقام</p>
        <p className="text-gray-400 text-xs mb-6">مزود رقم #{providerId}</p>

        {/* PIN inputs */}
        <div className="flex gap-3 justify-center mb-6" dir="ltr">
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
              className="w-14 h-14 text-center text-2xl font-extrabold border-2 rounded-xl outline-none transition-all"
              style={{
                borderColor: digit
                  ? "oklch(0.53 0.22 27)"
                  : "oklch(0.90 0.01 27)",
                color: "oklch(0.13 0.02 27)",
              }}
              autoFocus={i === 0}
              disabled={isVerifying}
            />
          ))}
        </div>

        {isVerifying && (
          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>جارٍ التحقق…</span>
          </div>
        )}

        {!isVerifying && (
          <Button
            className="w-full rounded-2xl font-bold text-base"
            style={{ height: "52px", background: "oklch(0.53 0.22 27)" }}
            onClick={handleSubmit}
            disabled={pin.some((d) => d === "")}
          >
            تأكيد الدخول
          </Button>
        )}

        <p className="text-xs text-gray-400 mt-4">
          الرمز الافتراضي للتجربة: <strong>1234</strong>
        </p>

        <button
          onClick={() => navigate("/provider/login")}
          className="text-xs text-gray-400 underline mt-3 block mx-auto"
        >
          اختيار مزود آخر
        </button>
      </div>
    </div>
  );
}
