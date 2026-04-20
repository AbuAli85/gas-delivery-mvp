/**
 * ProviderOnboarding — تتبع حالة طلب الانضمام
 *
 * Polls providers.getStatus every 30 seconds.
 * Shows a checklist of onboarding steps and the current status.
 */

import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Flame,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type ProviderStatus = "pending_review" | "approved" | "rejected";

const STATUS_CONFIG: Record<
  ProviderStatus,
  { label: string; color: string; icon: React.ReactNode; bg: string }
> = {
  pending_review: {
    label: "قيد المراجعة",
    color: "text-yellow-400",
    bg: "rgba(234,179,8,0.12)",
    icon: <Clock className="w-8 h-8 text-yellow-400" />,
  },
  approved: {
    label: "تمت الموافقة",
    color: "text-green-400",
    bg: "rgba(34,197,94,0.12)",
    icon: <CheckCircle2 className="w-8 h-8 text-green-400" />,
  },
  rejected: {
    label: "تم الرفض",
    color: "text-red-400",
    bg: "rgba(239,68,68,0.12)",
    icon: <XCircle className="w-8 h-8 text-red-400" />,
  },
};

const STEPS: { label: string; statusReached: ProviderStatus[] }[] = [
  { label: "تم استلام الطلب", statusReached: ["pending_review", "approved", "rejected"] },
  { label: "مراجعة البيانات", statusReached: ["approved", "rejected"] },
  { label: "الموافقة وتفعيل الحساب", statusReached: ["approved"] },
];

export default function ProviderOnboarding() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  // Auth state — read from sessionStorage or ask user
  const [phone] = useState(() => sessionStorage.getItem("providerRegPhone") ?? "");
  const [pin] = useState(() => sessionStorage.getItem("providerRegPin") ?? "");
  const [pinHash, setPinHash] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);

  // Auto-auth if we have stored creds, otherwise redirect to login
  useEffect(() => {
    const storedPhone = sessionStorage.getItem("providerRegPhone");
    const storedPin = sessionStorage.getItem("providerRegPin");
    if (storedPhone && storedPin) {
      sha256(storedPin).then((h) => {
        setPinHash(h);
        setAuthed(true);
      });
    } else {
      // No stored creds — send to provider login selector
      setTimeout(() => navigate("/provider/login"), 1200);
    }
  }, []);

  const { data, isLoading, error, refetch } = trpc.providers.getStatus.useQuery(
    { phone: phone.trim(), pinHash: pinHash ?? "" },
    {
      enabled: authed && !!pinHash,
      refetchInterval: 30_000,
      retry: false,
    }
  );

  useEffect(() => {
    if (error) {
      toast.error(error.message || "تعذّر التحقق من الحالة.");
      setAuthed(false);
    }
  }, [error]);

  const status = data?.providerStatus as ProviderStatus | undefined;
  const cfg = status ? STATUS_CONFIG[status] : null;

  const inputClass =
    "bg-black/30 border-white/15 text-white placeholder:text-white/30 focus-visible:border-orange-400/50 focus-visible:ring-orange-400/20 h-11 rounded-xl text-sm";

  return (
    <div className="mobile-screen" style={{ background: "oklch(0.09 0 0)" }} dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-6">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1">
          <p className="text-white font-bold text-base">حالة طلب الانضمام</p>
          <p className="text-white/40 text-xs">يتم التحديث كل 30 ثانية</p>
        </div>
        <Flame className="w-6 h-6 text-orange-500" />
      </div>

      <div className="px-4 pb-8">
        {/* ── Auth gate: redirect to login if no stored creds ── */}
        {!authed && (
          <div className="flex flex-col items-center py-16 gap-4 text-center">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
            <p className="text-white/50 text-sm">جاري التحقق من بياناتك…</p>
          </div>
        )}

        {/* ── Loading ── */}
        {authed && isLoading && (
          <div className="flex flex-col items-center py-16 gap-4">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
            <p className="text-white/40 text-sm">جاري التحقق...</p>
          </div>
        )}

        {/* ── Status display ── */}
        {authed && data && cfg && (
          <>
            {/* Status badge */}
            <div
              className="rounded-2xl p-5 mb-4 flex flex-col items-center text-center gap-3"
              style={{ background: cfg.bg, border: `1px solid ${cfg.color.replace("text-", "").replace("-400", "")}` }}
            >
              {cfg.icon}
              <div>
                <p className={`font-bold text-lg ${cfg.color}`}>{cfg.label}</p>
                <p className="text-white/60 text-xs mt-1">
                  {status === "pending_review" && "طلبك قيد المراجعة"}
                  {status === "approved" && `مرحباً ${data.name}! حسابك مفعّل`}
                  {status === "rejected" && "تعذّر قبول طلبك"}
                </p>
                {status === "rejected" && data.rejectionReason && (
                  <p className="text-red-300/70 text-xs mt-2 leading-relaxed">
                    السبب: {data.rejectionReason}
                  </p>
                )}
              </div>
            </div>

            {/* Steps checklist */}
            <div
              className="rounded-2xl p-4 mb-4"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <p className="text-white/50 text-xs mb-3 text-center">مراحل الانضمام</p>
              {STEPS.map((step, i) => {
                const reached = step.statusReached.includes(status!);
                const isRejectedStep = i === 2 && status === "rejected";
                return (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                        isRejectedStep
                          ? "bg-red-500/20 text-red-400"
                          : reached
                          ? "bg-green-500 text-white"
                          : "bg-white/8 text-white/25"
                      }`}
                    >
                      {isRejectedStep ? (
                        <XCircle className="w-4 h-4" />
                      ) : reached ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        isRejectedStep
                          ? "text-red-400/70 line-through"
                          : reached
                          ? "text-white/80"
                          : "text-white/30"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            {status === "approved" && (
              <Button
                size="lg"
                className="w-full rounded-2xl font-bold text-base h-14 mb-3"
                style={{ background: "oklch(0.53 0.22 27)" }}
                onClick={() => navigate(`/provider/${data.providerId}/login`)}
              >
                تسجيل الدخول الآن
              </Button>
            )}
            {status === "rejected" && (
              <Button
                size="lg"
                variant="outline"
                className="w-full rounded-2xl font-bold text-base h-14 mb-3 border-white/20 text-white/70"
                onClick={() => navigate("/provider/register")}
              >
                إعادة التقديم
              </Button>
            )}

            {/* Refresh button */}
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 mx-auto text-white/30 text-xs hover:text-white/50 transition-colors mt-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              تحديث يدوي
            </button>
          </>
        )}
      </div>
    </div>
  );
}
