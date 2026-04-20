import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Flame, Lock, Loader2 } from "lucide-react";
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

export default function ProviderLogin() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const providerId = parseInt(id ?? "0", 10);

  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const verifyPin = trpc.providers.verifyPin.useMutation({
    onSuccess: async () => {
      const pinStr = pin.join("");
      const hash = await sha256Hex(pinStr);
      storePinHash(providerId, hash);
      navigate(`/provider/${providerId}`);
    },
    onError: (err) => {
      setIsVerifying(false);
      setPin(["", "", "", ""]);
      inputRefs[0].current?.focus();
      toast.error(err.message === "Invalid PIN" ? "❌ رمز خاطئ — Wrong PIN" : "Error verifying PIN");
    },
  });

  // Auto-submit when all 4 digits entered
  useEffect(() => {
    if (pin.every((d) => d !== "")) {
      handleSubmit();
    }
  }, [pin]);

  async function handleSubmit() {
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
        <span className="text-white font-extrabold text-xl tracking-tight">GasNow</span>
      </div>

      {/* Card */}
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "oklch(0.97 0.01 27)" }}
        >
          <Lock className="w-7 h-7" style={{ color: "oklch(0.53 0.22 27)" }} />
        </div>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Provider Login</h1>
        <p className="text-gray-500 text-sm mb-1">أدخل رمز الدخول</p>
        <p className="text-gray-400 text-xs mb-6">Enter your 4-digit PIN</p>

        {/* PIN inputs */}
        <div className="flex gap-3 justify-center mb-6">
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
            <span>Verifying…</span>
          </div>
        )}

        {!isVerifying && (
          <Button
            className="w-full rounded-2xl font-bold text-base"
            style={{ height: "52px", background: "oklch(0.53 0.22 27)" }}
            onClick={handleSubmit}
            disabled={pin.some((d) => d === "")}
          >
            تأكيد · Confirm
          </Button>
        )}

        <p className="text-xs text-gray-400 mt-4">
          Default PIN for demo: <strong>1234</strong>
        </p>
      </div>
    </div>
  );
}
