/**
 * AdminProviders — Provider application review & management page.
 * Access: /admin/providers (requires same admin PIN as /admin)
 *
 * Features:
 *  - Three tabs: pending / approved / rejected
 *  - Full provider card: name, phone, email, zone, sub-zones, vehicle, national ID, date
 *  - Approve / Reject (with reason) actions
 *  - Auto-refresh every 30s on pending tab
 */

import { useState } from "react";
import {
  UserCheck, UserX, Clock, CheckCircle2, XCircle,
  Phone, Mail, MapPin, Truck, IdCard, Calendar,
  Loader2, RefreshCw, ShieldCheck, Lock, ChevronLeft,
  Users, AlertCircle, Tag, Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";
import LanguageSwitcher from "@/components/LanguageSwitcher";

type ProviderStatus = "pending_review" | "approved" | "rejected";
type Tab = "pending" | "approved" | "rejected";

const TAB_CONFIG: { key: Tab; label: string; icon: React.ElementType; color: string }[] = [
  { key: "pending", label: "قيد المراجعة", icon: Clock, color: "text-amber-500" },
  { key: "approved", label: "معتمدون", icon: CheckCircle2, color: "text-emerald-500" },
  { key: "rejected", label: "مرفوضون", icon: XCircle, color: "text-red-400" },
];

const STATUS_MAP: Record<ProviderStatus, { label: string; bg: string; text: string }> = {
  pending_review: { label: "قيد المراجعة", bg: "bg-amber-500/15", text: "text-amber-400" },
  approved: { label: "معتمد", bg: "bg-emerald-500/15", text: "text-emerald-400" },
  rejected: { label: "مرفوض", bg: "bg-red-500/15", text: "text-red-400" },
};

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-OM", {
    year: "numeric", month: "short", day: "numeric",
  });
}

interface Provider {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  zoneId?: number | null;
  vehicleType?: string | null;
  vehiclePlate?: string | null;
  nationalId?: string | null;
  providerStatus: ProviderStatus;
  rejectionReason?: string | null;
  createdAt: Date;
  subZoneNames?: string[];
}

function ProviderCard({
  provider,
  adminPin,
  onAction,
}: {
  provider: Provider;
  adminPin: string;
  onAction: () => void;
}) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const utils = trpc.useUtils();

  const approveMutation = trpc.providers.adminApprove.useMutation({
    onSuccess: () => {
      toast.success(`تمت الموافقة على ${provider.name} ✓`);
      utils.providers.adminListAll.invalidate();
      onAction();
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = trpc.providers.adminReject.useMutation({
    onSuccess: () => {
      toast.success(`تم رفض طلب ${provider.name}`);
      utils.providers.adminListAll.invalidate();
      onAction();
    },
    onError: (e) => toast.error(e.message),
  });

  const isPending = provider.providerStatus === "pending_review";
  const statusCfg = STATUS_MAP[provider.providerStatus];

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: "oklch(0.13 0 0)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-white font-bold text-base truncate">{provider.name}</span>
            <span className="text-white/30 text-xs shrink-0">#{provider.id}</span>
          </div>
          <div className="flex items-center gap-1 text-white/50 text-xs">
            <Phone className="w-3 h-3 shrink-0" />
            <span dir="ltr">{provider.phone}</span>
          </div>
          {provider.email && (
            <div className="flex items-center gap-1 text-white/40 text-xs mt-0.5">
              <Mail className="w-3 h-3 shrink-0" />
              <span className="truncate">{provider.email}</span>
            </div>
          )}
        </div>
        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
          {statusCfg.label}
        </span>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-2">
        {provider.vehicleType && (
          <div className="flex items-center gap-1.5 text-white/50 text-xs">
            <Truck className="w-3.5 h-3.5 shrink-0 text-orange-400/60" />
            <span className="truncate">{provider.vehicleType}</span>
          </div>
        )}
        {provider.vehiclePlate && (
          <div className="flex items-center gap-1.5 text-white/50 text-xs">
            <Tag className="w-3.5 h-3.5 shrink-0 text-orange-400/60" />
            <span dir="ltr" className="truncate">{provider.vehiclePlate}</span>
          </div>
        )}
        {provider.nationalId && (
          <div className="flex items-center gap-1.5 text-white/50 text-xs">
            <IdCard className="w-3.5 h-3.5 shrink-0 text-orange-400/60" />
            <span dir="ltr" className="truncate">{provider.nationalId}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-white/40 text-xs">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>{formatDate(provider.createdAt)}</span>
        </div>
      </div>

      {/* Sub-zones */}
      {provider.subZoneNames && provider.subZoneNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <div className="flex items-center gap-1 text-white/40 text-xs w-full mb-0.5">
            <MapPin className="w-3 h-3" />
            <span>مناطق التغطية:</span>
          </div>
          {provider.subZoneNames.map((sz) => (
            <span
              key={sz}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(251,146,60,0.12)", color: "rgba(251,146,60,0.8)" }}
            >
              {sz}
            </span>
          ))}
        </div>
      )}

      {/* Rejection reason (if rejected) */}
      {provider.providerStatus === "rejected" && provider.rejectionReason && (
        <div className="flex items-start gap-1.5 text-red-400/70 text-xs bg-red-500/8 rounded-xl px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{provider.rejectionReason}</span>
        </div>
      )}

      {/* Actions (only for pending) */}
      {isPending && (
        <div className="space-y-2 pt-1">
          {showRejectInput && (
            <input
              type="text"
              placeholder="سبب الرفض (اختياري)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full bg-black/40 border border-white/10 text-white text-sm rounded-xl px-3 py-2 placeholder:text-white/20 outline-none focus:border-red-400/40"
              dir="rtl"
            />
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 rounded-xl text-sm font-bold h-9 gap-1.5"
              style={{ background: "oklch(0.45 0.18 145)", color: "white" }}
              disabled={approveMutation.isPending}
              onClick={() => approveMutation.mutate({ adminPin, providerId: provider.id })}
            >
              {approveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserCheck className="w-4 h-4" />
              )}
              موافقة
            </Button>
            {!showRejectInput ? (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 rounded-xl text-sm font-bold h-9 gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10"
                onClick={() => setShowRejectInput(true)}
              >
                <UserX className="w-4 h-4" />
                رفض
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 rounded-xl text-sm font-bold h-9 gap-1.5 border-red-500/40 text-red-400 hover:bg-red-500/10"
                disabled={rejectMutation.isPending}
                onClick={() =>
                  rejectMutation.mutate({
                    adminPin,
                    providerId: provider.id,
                    reason: rejectReason || undefined,
                  })
                }
              >
                {rejectMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserX className="w-4 h-4" />
                )}
                تأكيد الرفض
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminProviders() {
  const [pin, setPin] = useState("");
  const [enteredPin, setEnteredPin] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("pending");

  const allQuery = trpc.providers.adminListAll.useQuery(
    { adminPin: enteredPin ?? "" },
    {
      enabled: !!enteredPin,
      retry: false,
      refetchInterval: activeTab === "pending" ? 30_000 : false,
    }
  );

  const isWrongPin =
    allQuery.error?.data?.code === "UNAUTHORIZED" ||
    allQuery.error?.data?.code === "FORBIDDEN";

  const allProviders = (allQuery.data ?? []) as Provider[];

  const filtered = allProviders.filter((p) => {
    if (activeTab === "pending") return p.providerStatus === "pending_review";
    if (activeTab === "approved") return p.providerStatus === "approved";
    return p.providerStatus === "rejected";
  });

  const counts = {
    pending: allProviders.filter((p) => p.providerStatus === "pending_review").length,
    approved: allProviders.filter((p) => p.providerStatus === "approved").length,
    rejected: allProviders.filter((p) => p.providerStatus === "rejected").length,
  };

  // ── PIN gate ──────────────────────────────────────────────────────────────
  if (!enteredPin || isWrongPin) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 relative"
        style={{ background: "oklch(0.08 0 0)" }}
        dir="rtl"
      >
        {/* Top bar */}
        <div className="absolute top-4 inset-x-0 flex items-center justify-between px-4">
          <LanguageSwitcher />
          <Link href="/">
            <button className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors">
              <Home className="w-4 h-4" />
              <span>الرئيسية</span>
            </button>
          </Link>
        </div>
        <div
          className="w-full max-w-sm rounded-3xl p-6 space-y-5"
          style={{ background: "oklch(0.13 0 0)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
              style={{ background: "rgba(251,146,60,0.12)" }}
            >
              <ShieldCheck className="w-7 h-7 text-orange-400" />
            </div>
            <h1 className="text-white text-xl font-bold">إدارة المزودين</h1>
            <p className="text-white/40 text-sm">أدخل رمز الإدارة للمتابعة</p>
          </div>

          {isWrongPin && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              رمز الإدارة غير صحيح
            </div>
          )}

          <div className="space-y-3">
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="password"
                inputMode="numeric"
                placeholder="رمز الإدارة"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && pin && setEnteredPin(pin)}
                className="w-full bg-black/40 border border-white/10 text-white text-center text-lg tracking-widest rounded-2xl px-4 py-3 pr-10 placeholder:text-white/20 outline-none focus:border-orange-400/40"
              />
            </div>
            <Button
              className="w-full rounded-2xl h-11 font-bold text-base"
              style={{ background: "oklch(0.55 0.20 40)", color: "white" }}
              disabled={!pin}
              onClick={() => setEnteredPin(pin)}
            >
              دخول
            </Button>
          </div>

          <div className="text-center">
            <Link href="/admin">
              <span className="text-white/30 text-xs hover:text-white/50 cursor-pointer">
                ← العودة للوحة الطلبات
              </span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "oklch(0.08 0 0)" }}
      dir="rtl"
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between gap-3"
        style={{ background: "oklch(0.11 0 0)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <Link href="/admin">
            <button className="w-8 h-8 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-white font-bold text-base">مزودو الخدمة</h1>
            <p className="text-white/35 text-xs">{allProviders.length} مزود مسجل</p>
          </div>
        </div>
        <button
          onClick={() => allQuery.refetch()}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${allQuery.isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3">
        {TAB_CONFIG.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`rounded-2xl p-3 text-center transition-all ${
              activeTab === t.key
                ? "ring-1 ring-orange-400/40"
                : "opacity-60"
            }`}
            style={{ background: "oklch(0.13 0 0)" }}
          >
            <t.icon className={`w-4 h-4 mx-auto mb-1 ${t.color}`} />
            <div className={`text-lg font-bold ${t.color}`}>{counts[t.key]}</div>
            <div className="text-white/40 text-xs leading-tight">{t.label}</div>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-8 space-y-3">
        {allQuery.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Users className="w-10 h-10 text-white/15" />
            <p className="text-white/30 text-sm">
              {activeTab === "pending"
                ? "لا توجد طلبات معلقة حالياً"
                : activeTab === "approved"
                ? "لا يوجد مزودون معتمدون بعد"
                : "لا يوجد طلبات مرفوضة"}
            </p>
          </div>
        ) : (
          filtered.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              adminPin={enteredPin!}
              onAction={() => allQuery.refetch()}
            />
          ))
        )}
      </div>
    </div>
  );
}
