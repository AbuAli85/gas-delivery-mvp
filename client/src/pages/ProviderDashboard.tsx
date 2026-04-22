import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import {
  Flame, MapPin, Phone, Package, Clock, CheckCircle2,
  XCircle, Truck, History, Loader2, Wallet, Star,
  Bell, BellOff, Navigation, ShieldCheck, Settings,
  LogOut, ChevronRight, Zap, TrendingUp, Home,
  MessageSquare, ExternalLink, AlertCircle, Map,
  Key, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getStoredPinHash, clearPinHash } from "@/lib/pinStorage";
import { WorkingHoursEditor } from "@/components/WorkingHoursEditor";
import { ProviderMapView } from "./ProviderMapView";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";

type Tab = "home" | "map" | "history" | "settings";

function StatusBadge({ status, lang }: { status: string; lang: string }) {
  const mapAr: Record<string, { label: string; cls: string }> = {
    delivered:        { label: "تم التوصيل",   cls: "bg-emerald-500/20 text-emerald-300" },
    failed_delivery:  { label: "تعذر التوصيل", cls: "bg-red-500/20 text-red-300" },
    cancelled:        { label: "ملغي",          cls: "bg-red-500/20 text-red-300" },
    arrived:          { label: "وصلت",          cls: "bg-amber-500/20 text-amber-300" },
    out_for_delivery: { label: "جارٍ التوصيل", cls: "bg-violet-500/20 text-violet-300" },
    accepted:         { label: "مقبول",         cls: "bg-blue-500/20 text-blue-300" },
    pending:          { label: "قيد الانتظار", cls: "bg-yellow-500/20 text-yellow-300" },
    expired:          { label: "منتهي",         cls: "bg-gray-500/20 text-gray-400" },
    rejected:         { label: "مرفوض",         cls: "bg-red-500/20 text-red-300" },
  };
  const mapEn: Record<string, { label: string; cls: string }> = {
    delivered:        { label: "Delivered",     cls: "bg-emerald-500/20 text-emerald-300" },
    failed_delivery:  { label: "Failed Delivery", cls: "bg-red-500/20 text-red-300" },
    cancelled:        { label: "Cancelled",     cls: "bg-red-500/20 text-red-300" },
    arrived:          { label: "Arrived",       cls: "bg-amber-500/20 text-amber-300" },
    out_for_delivery: { label: "On the Way",    cls: "bg-violet-500/20 text-violet-300" },
    accepted:         { label: "Accepted",      cls: "bg-blue-500/20 text-blue-300" },
    pending:          { label: "Pending",       cls: "bg-yellow-500/20 text-yellow-300" },
    expired:          { label: "Expired",       cls: "bg-gray-500/20 text-gray-400" },
    rejected:         { label: "Rejected",      cls: "bg-red-500/20 text-red-300" },
  };
  const map = lang === "en" ? mapEn : mapAr;
  const info = map[status] ?? { label: status, cls: "bg-gray-500/20 text-gray-400" };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${info.cls}`}>
      {info.label}
    </span>
  );
}

function StatCard({ icon, value, label, accent }: {
  icon: React.ReactNode; value: string; label: string; accent: string;
}) {
  return (
    <div
      className="flex-1 rounded-2xl p-3 flex flex-col items-center gap-1"
      style={{ background: "oklch(0.13 0 0)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent}`}>{icon}</div>
      <p className="text-white font-black text-base leading-none">{value}</p>
      <p className="text-white/40 text-[10px] text-center leading-tight">{label}</p>
    </div>
  );
}

const ACCEPT_WINDOW_SEC = 5 * 60;

function IncomingOrderCard({
  incoming, onAccept, onReject, accepting, rejecting, t, lang,
}: {
  incoming: { orderId: number; assignmentId: number; customerPhone: string | null; customerAddress: string | null; deliveryAddress?: string | null; customerName?: string | null; gasAmount: string; totalPrice: string; assignmentCreatedAt?: Date | string | null };
  onAccept: () => void; onReject: () => void; accepting: boolean; rejecting: boolean;
  t: (key: string) => string; lang: string;
}) {
  const calcRemaining = () => {
    if (!incoming.assignmentCreatedAt) return ACCEPT_WINDOW_SEC;
    const elapsed = Math.floor((Date.now() - new Date(incoming.assignmentCreatedAt).getTime()) / 1000);
    return Math.max(0, ACCEPT_WINDOW_SEC - elapsed);
  };
  const [countdown, setCountdown] = useState(calcRemaining);
  useEffect(() => {
    const timer = setInterval(() => setCountdown(calcRemaining()), 1000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming.assignmentCreatedAt]);

  const gasAmt = parseFloat(incoming.gasAmount);
  const cylinderLabel = gasAmt === 1
    ? t("provider.incoming.cylinder.single")
    : t("provider.incoming.cylinder.plural");

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, oklch(0.18 0 0) 0%, oklch(0.15 0.06 27) 100%)",
        border: "2px solid oklch(0.62 0.22 27)",
        boxShadow: "0 0 30px oklch(0.62 0.22 27 / 0.25)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-2" style={{ background: "oklch(0.62 0.22 27)" }}>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-white animate-pulse" />
          <span className="text-white font-bold text-sm">{t("provider.incoming.new")}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-white/80" />
          <span className="text-white font-bold text-sm" dir="ltr">{Math.floor(countdown/60)}:{String(countdown%60).padStart(2,'0')}</span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-white/40 shrink-0" />
            <span className="text-white font-semibold text-sm" dir="ltr">{incoming.customerPhone}</span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <span className="text-white/80 text-sm leading-snug">{incoming.deliveryAddress || incoming.customerAddress}</span>
          </div>
          {incoming.customerName && (
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-xs">{t("provider.incoming.customer")}</span>
              <span className="text-white/70 text-sm font-medium">{incoming.customerName}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-white/40 shrink-0" />
            <span className="text-white/80 text-sm">
              <strong className="text-white">{incoming.gasAmount}</strong>{" "}
              {cylinderLabel}{" · "}
              <strong className="text-orange-300">OMR {parseFloat(incoming.totalPrice).toFixed(3)}</strong>
            </span>
          </div>
        </div>
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${(countdown / ACCEPT_WINDOW_SEC) * 100}%`, background: countdown < 60 ? "oklch(0.55 0.22 0)" : "oklch(0.62 0.22 27)" }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button
            className="h-12 rounded-2xl font-bold text-sm text-white"
            style={{ background: "oklch(0.45 0.18 145)" }}
            onClick={onAccept}
            disabled={accepting || rejecting}
          >
            {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className={`w-4 h-4 ${lang === "ar" ? "ml-1" : "mr-1"}`} />{t("provider.incoming.accept")}</>}
          </Button>
          <Button
            className="h-12 rounded-2xl font-bold text-sm border border-red-500/30 text-red-400 bg-transparent hover:bg-red-500/10"
            onClick={onReject}
            disabled={accepting || rejecting}
          >
            {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className={`w-4 h-4 ${lang === "ar" ? "ml-1" : "mr-1"}`} />{t("provider.incoming.reject")}</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MissionScreen({
  order, onStartDelivery, onMarkArrived, onMarkFailed, onDeliver, starting, arriving, failing, delivering, t, lang,
}: {
  order: {
    orderId: number; assignmentId: number | null; customerPhone: string | null;
    customerAddress: string | null; deliveryAddress?: string | null;
    customerName?: string | null; gasAmount: string; totalPrice: string;
    status: string; paymentMethod?: string | null; acceptedAt?: Date | string | null;
    customerLat?: number | null; customerLng?: number | null;
    deliveryLat?: number | null; deliveryLng?: number | null;
  };
  onStartDelivery: () => void;
  onMarkArrived: () => void;
  onMarkFailed: (reason: "customer_unavailable" | "wrong_address" | "customer_refused" | "unsafe_location" | "payment_issue" | "other", notes?: string) => void;
  onDeliver: (note?: string) => void;
  starting: boolean; arriving: boolean; failing: boolean; delivering: boolean;
  t: (key: string) => string; lang: string;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showFailedDialog, setShowFailedDialog] = useState(false);
  const [failureReason, setFailureReason] = useState<"customer_unavailable" | "wrong_address" | "customer_refused" | "unsafe_location" | "payment_issue" | "other">("customer_unavailable");
  const [failureNotes, setFailureNotes] = useState("");
  const [note, setNote] = useState("");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = order.acceptedAt ? new Date(order.acceptedAt).getTime() : Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [order.acceptedAt]);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const lat = order.deliveryLat ?? order.customerLat ?? 23.5880;
  const lng = order.deliveryLng ?? order.customerLng ?? 58.3829;
  const hasCoords = !!(lat !== 23.5880 || lng !== 58.3829) && !!(order.deliveryLat ?? order.customerLat);

  const displayAddr = order.deliveryAddress || order.customerAddress || null;
  const isRawCoords = displayAddr && /^[\d.]+,\s*[\d.]+$/.test(displayAddr.trim());

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

  const pmLabel: Record<string, string> = {
    cash: t("provider.payment.cash"),
    online: t("provider.payment.online"),
    bank_transfer: t("provider.payment.transfer"),
  };
  const pmColor: Record<string, string> = { cash: "text-emerald-400", online: "text-blue-400", bank_transfer: "text-purple-400" };

  const steps = [
    { key: "accepted", label: t("provider.mission.step.accepted"), icon: <CheckCircle2 className="w-4 h-4" /> },
    { key: "out_for_delivery", label: t("provider.mission.step.on_way"), icon: <Truck className="w-4 h-4" /> },
    { key: "arrived", label: lang === "ar" ? "وصلت" : "Arrived", icon: <MapPin className="w-4 h-4" /> },
    { key: "delivered", label: t("provider.mission.step.delivered"), icon: <CheckCircle2 className="w-4 h-4" /> },
  ];
  const stepIndex = steps.findIndex(s => s.key === order.status);

  const gasAmt = parseFloat(order.gasAmount);
  const cylinderLabel = gasAmt === 1
    ? t("provider.incoming.cylinder.single")
    : t("provider.incoming.cylinder.plural");

  return (
    <div className="space-y-3">
      {/* Mission header */}
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, oklch(0.14 0.04 27) 0%, oklch(0.12 0 0) 100%)",
          border: "1px solid rgba(255,150,50,0.2)",
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-orange-400" />
            <span className="text-white font-bold text-sm">{t("provider.mission.prefix")}{order.orderId}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-orange-300" />
            <span className="text-orange-300 font-bold text-sm" dir="ltr">{fmtTime(elapsed)}</span>
          </div>
        </div>

        {/* Step progress */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-0">
            {steps.map((step, i) => {
              const done = i <= stepIndex;
              const active = i === stepIndex;
              return (
                <div key={step.key} className="flex items-center" style={{ flex: i < steps.length - 1 ? "1" : "0" }}>
                  <div className="flex flex-col items-center gap-1" style={{ minWidth: 56 }}>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: done ? (active ? "oklch(0.62 0.22 27)" : "oklch(0.45 0.18 145 / 0.3)") : "rgba(255,255,255,0.07)",
                        border: active ? "2px solid oklch(0.62 0.22 27)" : done ? "2px solid oklch(0.45 0.18 145 / 0.5)" : "2px solid rgba(255,255,255,0.1)",
                        color: done ? (active ? "white" : "oklch(0.65 0.18 145)") : "rgba(255,255,255,0.3)",
                      }}
                    >
                      {step.icon}
                    </div>
                    <span className="text-[9px] text-center leading-tight" style={{ color: done ? (active ? "oklch(0.85 0.15 27)" : "rgba(255,255,255,0.5)") : "rgba(255,255,255,0.25)" }}>
                      {step.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className="flex-1 h-0.5 mb-5 mx-1"
                      style={{ background: i < stepIndex ? "oklch(0.45 0.18 145 / 0.5)" : "rgba(255,255,255,0.08)" }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Static Map */}
      {hasCoords && (
        <div
          className="rounded-3xl overflow-hidden relative"
          style={{ height: 200, border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <img
            src={`/api/maps/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x300&scale=2&maptype=roadmap&markers=color:red%7Clabel:C%7C${lat},${lng}&style=element:geometry%7Ccolor:0x212121&style=element:labels.icon%7Cvisibility:off&style=element:labels.text.fill%7Ccolor:0x757575&style=element:labels.text.stroke%7Ccolor:0x212121&style=feature:road%7Celement:geometry%7Ccolor:0x484848&style=feature:water%7Celement:geometry%7Ccolor:0x000000`}
            alt={t("provider.mission.map.alt")}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="absolute bottom-2 right-2 bg-black/70 rounded-xl px-2 py-1">
            <span className="text-white/70 text-xs">{t("provider.mission.map.alt")}</span>
          </div>
        </div>
      )}

      {/* Order details */}
      <div
        className="rounded-3xl p-4 space-y-3"
        style={{ background: "oklch(0.13 0 0)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Customer */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,150,50,0.12)" }}>
            <Phone className="w-4 h-4 text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            {order.customerName && <p className="text-white font-semibold text-sm">{order.customerName}</p>}
            <p className="text-white/70 text-sm" dir="ltr">{order.customerPhone}</p>
          </div>
          {order.customerPhone && (
            <a
              href={`tel:${order.customerPhone}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs text-white"
              style={{ background: "oklch(0.45 0.18 145 / 0.2)", border: "1px solid oklch(0.45 0.18 145 / 0.4)" }}
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">{t("provider.mission.call")}</span>
            </a>
          )}
        </div>

        <div className="h-px bg-white/5" />

        {/* Address */}
        {displayAddr && !isRawCoords && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,100,50,0.1)" }}>
              <MapPin className="w-4 h-4 text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/40 text-xs mb-0.5">{t("provider.mission.address.label")}</p>
              <p className="text-white/80 text-sm leading-snug">{displayAddr}</p>
            </div>
          </div>
        )}

        {/* Gas + Price + Payment */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
            <Package className="w-4 h-4 text-white/40" />
          </div>
          <div className="flex-1">
            <p className="text-white/40 text-xs mb-0.5">{t("provider.mission.order.label")}</p>
            <p className="text-white text-sm">
              <strong>{order.gasAmount}</strong> {cylinderLabel}
              <span className="text-white/40 mx-1">·</span>
              <strong className="text-orange-300">OMR {parseFloat(order.totalPrice).toFixed(3)}</strong>
            </p>
          </div>
          {order.paymentMethod && (
            <span className={`text-xs font-bold ${pmColor[order.paymentMethod] || "text-white/40"}`}>
              {pmLabel[order.paymentMethod] || order.paymentMethod}
            </span>
          )}
        </div>
      </div>

      {/* Navigation buttons */}
      {hasCoords && (
        <div className="flex gap-2">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white"
            style={{ background: "oklch(0.25 0.06 250)", border: "1px solid oklch(0.35 0.1 250 / 0.5)" }}
          >
            <Navigation className="w-4 h-4" />
            Google Maps
          </a>
          <a
            href={wazeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white"
            style={{ background: "oklch(0.25 0.08 145)", border: "1px solid oklch(0.35 0.12 145 / 0.5)" }}
          >
            <ExternalLink className="w-4 h-4" />
            Waze
          </a>
        </div>
      )}

      {/* Action buttons */}
      {order.status === "accepted" && (
        <Button
          className="w-full h-14 rounded-2xl font-black text-white text-base"
          style={{ background: "oklch(0.45 0.18 270)", boxShadow: "0 4px 20px oklch(0.45 0.18 270 / 0.4)" }}
          onClick={onStartDelivery}
          disabled={starting}
        >
          {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Truck className={`w-5 h-5 ${lang === "ar" ? "ml-2" : "mr-2"}`} />{t("provider.mission.start")}</>}
        </Button>
      )}

      {order.status === "out_for_delivery" && !showConfirm && !showFailedDialog && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            className="h-12 rounded-2xl font-bold text-white text-sm"
            style={{ background: "oklch(0.62 0.18 75)" }}
            onClick={onMarkArrived}
            disabled={arriving || failing}
          >
            {arriving
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><MapPin className={`w-4 h-4 ${lang === "ar" ? "ml-1.5" : "mr-1.5"}`} />{lang === "ar" ? "وصلت" : "Arrived"}</>}
          </Button>
          <Button
            className="h-12 rounded-2xl font-bold text-white text-sm bg-red-600 hover:bg-red-700"
            onClick={() => setShowFailedDialog(true)}
            disabled={arriving || failing}
          >
            <XCircle className={`w-4 h-4 ${lang === "ar" ? "ml-1.5" : "mr-1.5"}`} />
            {lang === "ar" ? "فشل التوصيل" : "Fail Delivery"}
          </Button>
        </div>
      )}

      {order.status === "arrived" && !showConfirm && !showFailedDialog && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            className="h-12 rounded-2xl font-black text-white text-sm"
            style={{ background: "oklch(0.45 0.18 145)", boxShadow: "0 4px 20px oklch(0.45 0.18 145 / 0.4)" }}
            onClick={() => setShowConfirm(true)}
          >
            <CheckCircle2 className={`w-4 h-4 ${lang === "ar" ? "ml-1.5" : "mr-1.5"}`} />
            {t("provider.mission.confirm.delivery")}
          </Button>
          <Button
            className="h-12 rounded-2xl font-bold text-white text-sm bg-red-600 hover:bg-red-700"
            onClick={() => setShowFailedDialog(true)}
            disabled={failing}
          >
            <XCircle className={`w-4 h-4 ${lang === "ar" ? "ml-1.5" : "mr-1.5"}`} />
            {lang === "ar" ? "فشل التوصيل" : "Fail Delivery"}
          </Button>
        </div>
      )}

      {/* Delivery confirmation dialog */}
      {showConfirm && (
        <div
          className="rounded-3xl p-4 space-y-3"
          style={{ background: "oklch(0.14 0.04 145 / 0.3)", border: "1px solid oklch(0.45 0.18 145 / 0.4)" }}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-emerald-400" />
            <p className="text-white font-bold text-sm">{t("provider.mission.confirm.title")}</p>
          </div>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center gap-2 px-3 pt-3 pb-1">
              <MessageSquare className="w-3.5 h-3.5 text-white/30" />
              <p className="text-white/40 text-xs">{t("provider.mission.note.label")}</p>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("provider.mission.note.placeholder")}
              className="w-full bg-transparent text-white text-sm px-3 pb-3 resize-none outline-none placeholder:text-white/20"
              rows={3}
              maxLength={500}
              dir={lang === "ar" ? "rtl" : "ltr"}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white/50"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              {t("provider.mission.cancel")}
            </button>
            <Button
              className="flex-1 h-12 rounded-2xl font-black text-white"
              style={{ background: "oklch(0.45 0.18 145)" }}
              onClick={() => { onDeliver(note || undefined); setShowConfirm(false); }}
              disabled={delivering}
            >
              {delivering ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className={`w-4 h-4 ${lang === "ar" ? "ml-1.5" : "mr-1.5"}`} />{t("provider.mission.confirm.btn")}</>}
            </Button>
          </div>
        </div>
      )}

      {showFailedDialog && (
        <div
          className="rounded-3xl p-4 space-y-3"
          style={{ background: "rgba(127,29,29,0.2)", border: "1px solid rgba(248,113,113,0.4)" }}
        >
          <p className="text-white font-bold text-sm">
            {lang === "ar" ? "تحديد سبب فشل التوصيل" : "Select failure reason"}
          </p>
          <select
            value={failureReason}
            onChange={(e) => setFailureReason(e.target.value as typeof failureReason)}
            className="w-full rounded-xl px-3 py-2 text-sm bg-black/30 text-white border border-white/10"
          >
            <option value="customer_unavailable">{lang === "ar" ? "العميل غير متاح" : "Customer unavailable"}</option>
            <option value="wrong_address">{lang === "ar" ? "عنوان غير صحيح" : "Wrong address"}</option>
            <option value="customer_refused">{lang === "ar" ? "رفض العميل الاستلام" : "Customer refused"}</option>
            <option value="unsafe_location">{lang === "ar" ? "الموقع غير آمن" : "Unsafe location"}</option>
            <option value="payment_issue">{lang === "ar" ? "مشكلة في الدفع" : "Payment issue"}</option>
            <option value="other">{lang === "ar" ? "سبب آخر" : "Other"}</option>
          </select>
          <textarea
            value={failureNotes}
            onChange={(e) => setFailureNotes(e.target.value)}
            placeholder={lang === "ar" ? "ملاحظات إضافية (اختياري)" : "Additional notes (optional)"}
            className="w-full rounded-xl px-3 py-2 text-sm bg-black/30 text-white border border-white/10 placeholder:text-white/40"
            rows={3}
            maxLength={500}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="h-11 rounded-xl text-sm bg-white/10 hover:bg-white/15"
              onClick={() => setShowFailedDialog(false)}
            >
              {lang === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              className="h-11 rounded-xl text-sm bg-red-600 hover:bg-red-700"
              onClick={() => {
                onMarkFailed(failureReason, failureNotes || undefined);
                setShowFailedDialog(false);
              }}
              disabled={failing}
            >
              {failing ? <Loader2 className="w-4 h-4 animate-spin" /> : (lang === "ar" ? "تأكيد الفشل" : "Confirm Failure")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProviderDashboard() {
  const { t, dir, lang } = useLanguage();
  const { providerId } = useParams<{ providerId: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(providerId ?? "0", 10);
  const [activeTab, setActiveTab] = useState<Tab>("home");

  const pinHash = getStoredPinHash(id);
  useEffect(() => {
    if (!pinHash) navigate(`/provider/${id}/login`);
  }, [pinHash, id, navigate]);
  if (!pinHash) return null;

  const utils = trpc.useUtils();

  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [showPinChange, setShowPinChange] = useState(false);
  const [pinChangeStep, setPinChangeStep] = useState<"current" | "new" | "confirm">("current");
  const [currentPinDigits, setCurrentPinDigits] = useState(["" ,"","",""]);
  const [newPinDigits, setNewPinDigits] = useState(["","","",""]);
  const [confirmPinDigits, setConfirmPinDigits] = useState(["","","",""]);
  const { data: vapidData } = trpc.providers.getVapidPublicKey.useQuery();
  const savePushSub = trpc.providers.savePushSubscription.useMutation();

  const subscribeToPush = useCallback(async () => {
    if (!vapidData?.publicKey) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { toast.error(t("provider.settings.notifications.error")); return; }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidData.publicKey,
      });
      const json = sub.toJSON();
      await savePushSub.mutateAsync({
        providerId: id, pinHash: pinHash!,
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      setPushSubscribed(true);
      toast.success(t("provider.settings.notifications.success"));
    } catch { toast.error(t("provider.settings.notifications.fail")); }
  }, [vapidData, id, pinHash, savePushSub, t]);

  useEffect(() => {
    if (!navigator.serviceWorker) return;
    navigator.serviceWorker.getRegistration("/sw.js").then(async (reg) => {
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (sub) setPushSubscribed(true);
    });
  }, []);

  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const updateLocation = trpc.providers.updateLocation.useMutation();

  const startLocationUpdates = useCallback(() => {
    if (locationIntervalRef.current) return;
    const send = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition((pos) => {
        updateLocation.mutate({ providerId: id, pinHash: pinHash!, lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    };
    send();
    locationIntervalRef.current = setInterval(send, 10_000);
  }, [id, pinHash, updateLocation]);

  const stopLocationUpdates = useCallback(() => {
    if (locationIntervalRef.current) { clearInterval(locationIntervalRef.current); locationIntervalRef.current = null; }
  }, []);

  useEffect(() => () => stopLocationUpdates(), [stopLocationUpdates]);

  const { data: provider, isLoading: providerLoading } = trpc.providers.getById.useQuery(
    { providerId: id }, { enabled: !!id, refetchInterval: 15_000 }
  );
  const { data: incoming } = trpc.providers.getIncomingOrder.useQuery(
    { providerId: id },
    { enabled: !!id && provider?.isAvailable === true, refetchInterval: 5_000 }
  );
  const { data: activeOrders } = trpc.providers.getActiveOrders.useQuery(
    { providerId: id }, { enabled: !!id, refetchInterval: 8_000 }
  );
  const { data: history } = trpc.providers.getOrderHistory.useQuery(
    { providerId: id }, { enabled: !!id && activeTab === "history" }
  );
  const { data: ratingStats } = trpc.reviews.getProviderStats.useQuery(
    { providerId: id }, { enabled: !!id }
  );

  const toggleAvailability = trpc.providers.toggleAvailability.useMutation({
    onSuccess: (data) => {
      toast.success(data.isAvailable ? t("provider.toggle.available") : t("provider.toggle.unavailable"));
      utils.providers.getById.invalidate({ providerId: id });
    },
    onError: (err) => {
      if (err.data?.code === "UNAUTHORIZED") { clearPinHash(id); navigate(`/provider/${id}/login`); }
      else toast.error(t("provider.toggle.error"));
    },
  });
  const changePin = trpc.providers.changePin.useMutation({
    onSuccess: () => {
      toast.success(t("provider.settings.pin.success"));
      setShowPinChange(false);
      setPinChangeStep("current");
      setCurrentPinDigits(["","","",""]);
      setNewPinDigits(["","","",""]);
      setConfirmPinDigits(["","","",""]);
    },
    onError: (err) => toast.error(err.message || t("provider.settings.pin.error.digits")),
  });

  const acceptOrder = trpc.providers.acceptOrder.useMutation({
    onSuccess: () => {
      toast.success(t("provider.accept.success"));
      utils.providers.getIncomingOrder.invalidate({ providerId: id });
      utils.providers.getActiveOrders.invalidate({ providerId: id });
    },
    onError: (err) => toast.error(err.message || t("provider.accept.error")),
  });
  const rejectOrder = trpc.providers.rejectOrder.useMutation({
    onSuccess: () => {
      toast.info(t("provider.reject.success"));
      utils.providers.getIncomingOrder.invalidate({ providerId: id });
    },
    onError: (err) => toast.error(err.message || t("provider.reject.error")),
  });
  const startDelivery = trpc.providers.startDelivery.useMutation({
    onSuccess: () => {
      toast.success(t("provider.start.success"));
      utils.providers.getActiveOrders.invalidate({ providerId: id });
      startLocationUpdates();
    },
    onError: (err) => toast.error(err.message || t("provider.start.error")),
  });
  const markArrived = trpc.providers.markArrived.useMutation({
    onSuccess: () => {
      toast.success(lang === "ar" ? "تم تسجيل الوصول" : "Arrival marked");
      utils.providers.getActiveOrders.invalidate({ providerId: id });
    },
    onError: (err) => toast.error(err.message || (lang === "ar" ? "تعذر تسجيل الوصول" : "Could not mark arrival")),
  });
  const markFailedDelivery = trpc.providers.markFailedDelivery.useMutation({
    onSuccess: () => {
      toast.success(lang === "ar" ? "تم تسجيل فشل التوصيل" : "Failed delivery recorded");
      utils.providers.getActiveOrders.invalidate({ providerId: id });
      utils.providers.getById.invalidate({ providerId: id });
      if ((activeOrders?.length ?? 0) <= 1) stopLocationUpdates();
    },
    onError: (err) => toast.error(err.message || (lang === "ar" ? "تعذر تسجيل الفشل" : "Could not record failure")),
  });
  const deliverOrder = trpc.providers.deliverOrder.useMutation({
    onSuccess: () => {
      toast.success(t("provider.deliver.success"));
      utils.providers.getActiveOrders.invalidate({ providerId: id });
      utils.providers.getById.invalidate({ providerId: id });
      if ((activeOrders?.length ?? 0) <= 1) stopLocationUpdates();
    },
    onError: (err) => toast.error(err.message || t("provider.deliver.error")),
  });

  if (providerLoading) {
    return (
      <div className="mobile-screen items-center justify-center" style={{ background: "oklch(0.09 0 0)" }}>
        <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
        <p className="text-white/50 text-sm mt-3">{t("provider.loading")}</p>
      </div>
    );
  }
  if (!provider) {
    return (
      <div className="mobile-screen items-center justify-center px-6 text-center" style={{ background: "oklch(0.09 0 0)" }}>
        <p className="text-white font-semibold">{t("provider.not.found")}</p>
        <p className="text-white/40 text-sm mt-2">{t("provider.not.found.sub")}</p>
      </div>
    );
  }

  const accepted = provider.acceptedOrders ?? 0;
  const rejected = provider.rejectedOrders ?? 0;
  const total = accepted + rejected;
  const acceptRate = total > 0 ? Math.round((accepted / total) * 100) : 100;
  const commission = parseFloat(String(provider.totalCommission ?? "0")).toFixed(3);
  const avgRating = ratingStats?.avg ?? 0;

  const pmLabelShort: Record<string, string> = {
    cash: t("provider.payment.cash"),
    online: t("provider.payment.online"),
    bank_transfer: t("provider.payment.transfer.short"),
  };
  const pmColor: Record<string, string> = { cash: "text-emerald-400", online: "text-blue-400", bank_transfer: "text-purple-400" };

  return (
    <div className="mobile-screen" style={{ background: "oklch(0.09 0 0)" }} dir={dir}>

      {/* Header */}
      <div
        className="px-5 pt-12 pb-5 text-white shrink-0"
        style={{
          background: "linear-gradient(160deg, oklch(0.12 0 0) 0%, oklch(0.16 0.06 27) 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/manus-storage/logo-orange-nobg_dc89f071.png"
              alt={t("app.name")}
              className="h-8 w-auto object-contain shrink-0"
            />
            <div className="min-w-0">
              <p className="text-white font-bold text-base leading-tight truncate">{provider.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher />
            {/* Availability toggle */}
            <button
              onClick={() => toggleAvailability.mutate({ providerId: id, pinHash: pinHash! })}
              disabled={toggleAvailability.isPending}
              className="flex items-center gap-2 rounded-full px-3 py-2 transition-all"
              style={{
                background: provider.isAvailable ? "oklch(0.45 0.18 145 / 0.2)" : "rgba(255,255,255,0.07)",
                border: provider.isAvailable ? "1px solid oklch(0.45 0.18 145 / 0.5)" : "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {toggleAvailability.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin text-white/50" />
              ) : (
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    background: provider.isAvailable ? "oklch(0.65 0.18 145)" : "oklch(0.45 0 0)",
                    boxShadow: provider.isAvailable ? "0 0 8px oklch(0.65 0.18 145 / 0.6)" : "none",
                  }}
                />
              )}
              <span
                className="text-xs font-bold"
                style={{ color: provider.isAvailable ? "oklch(0.75 0.18 145)" : "rgba(255,255,255,0.4)" }}
              >
                {provider.isAvailable ? t("provider.available") : t("provider.unavailable")}
              </span>
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-2 mt-4">
          <StatCard
            icon={<Truck className="w-4 h-4 text-orange-400" />}
            value={String(provider.totalOrders ?? 0)}
            label={t("provider.stat.deliveries")}
            accent="bg-orange-500/15"
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4 text-blue-400" />}
            value={`${acceptRate}%`}
            label={t("provider.stat.acceptance")}
            accent="bg-blue-500/15"
          />
          <StatCard
            icon={<Wallet className="w-4 h-4 text-emerald-400" />}
            value={commission}
            label={t("provider.stat.commission")}
            accent="bg-emerald-500/15"
          />
          {avgRating > 0 && (
            <StatCard
              icon={<Star className="w-4 h-4 text-amber-400" />}
              value={avgRating.toFixed(1)}
              label={t("provider.stat.rating")}
              accent="bg-amber-500/15"
            />
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div
        className="flex shrink-0"
        style={{ background: "oklch(0.11 0 0)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {([
          { id: "home" as Tab,     icon: <Home className="w-4 h-4" />,     label: t("provider.tab.home") },
          { id: "map" as Tab,      icon: <Map className="w-4 h-4" />,      label: t("provider.tab.map") },
          { id: "history" as Tab,  icon: <History className="w-4 h-4" />,  label: t("provider.tab.history") },
          { id: "settings" as Tab, icon: <Settings className="w-4 h-4" />, label: t("provider.tab.settings") },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex flex-col items-center gap-1 py-3 transition-all"
            style={{
              color: activeTab === tab.id ? "oklch(0.62 0.22 27)" : "rgba(255,255,255,0.35)",
              borderBottom: activeTab === tab.id ? "2px solid oklch(0.62 0.22 27)" : "2px solid transparent",
            }}
          >
            {tab.icon}
            <span className="text-[10px] font-semibold">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* HOME TAB */}
        {activeTab === "home" && (
          <div className="p-4 space-y-4">
            {incoming && (
              <IncomingOrderCard
                incoming={incoming}
                onAccept={() => acceptOrder.mutate({ assignmentId: incoming.assignmentId, providerId: id, pinHash: pinHash! })}
                onReject={() => rejectOrder.mutate({ assignmentId: incoming.assignmentId, providerId: id, pinHash: pinHash! })}
                accepting={acceptOrder.isPending}
                rejecting={rejectOrder.isPending}
                t={t}
                lang={lang}
              />
            )}
            {activeOrders && activeOrders.length > 0 && (
              <div className="space-y-3">
                {activeOrders.length > 1 && (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-2xl"
                    style={{ background: "oklch(0.18 0.06 27 / 0.5)", border: "1px solid oklch(0.62 0.22 27 / 0.3)" }}
                  >
                    <Flame className="w-4 h-4 text-orange-400 shrink-0" />
                    <span className="text-orange-300 font-bold text-sm">
                      {activeOrders.length} {t("provider.multi.orders")}
                    </span>
                  </div>
                )}
                {activeOrders.map((order) => (
                  <MissionScreen
                    key={order.orderId}
                    order={order}
                    onStartDelivery={() => startDelivery.mutate({ orderId: order.orderId, providerId: id, pinHash: pinHash! })}
                    onMarkArrived={() => markArrived.mutate({ orderId: order.orderId, providerId: id, pinHash: pinHash! })}
                    onMarkFailed={(failureReason, failureNotes) =>
                      markFailedDelivery.mutate({ orderId: order.orderId, providerId: id, pinHash: pinHash!, failureReason, failureNotes })
                    }
                    onDeliver={(note) => deliverOrder.mutate({ orderId: order.orderId, providerId: id, pinHash: pinHash!, providerNote: note })}
                    starting={startDelivery.isPending}
                    arriving={markArrived.isPending}
                    failing={markFailedDelivery.isPending}
                    delivering={deliverOrder.isPending}
                    t={t}
                    lang={lang}
                  />
                ))}
              </div>
            )}
            {!incoming && (!activeOrders || activeOrders.length === 0) && (
              <div
                className="rounded-3xl p-8 text-center"
                style={{ background: "oklch(0.13 0 0)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {provider.isAvailable ? (
                  <div className="flex flex-col items-center">
                    <div className="relative mb-5">
                      <div
                        className="w-20 h-20 rounded-full flex items-center justify-center"
                        style={{ background: "oklch(0.62 0.22 27 / 0.12)", border: "2px solid oklch(0.62 0.22 27 / 0.25)" }}
                      >
                        <Flame className="w-9 h-9 text-orange-400" style={{ animation: "pulse 2s ease-in-out infinite" }} />
                      </div>
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          border: "2px solid oklch(0.62 0.22 27 / 0.3)",
                          animation: "ping 2s cubic-bezier(0,0,0.2,1) infinite",
                        }}
                      />
                    </div>
                    <p className="text-white font-bold text-base mb-1">{t("provider.waiting.title")}</p>
                    <p className="text-white/40 text-sm">{t("provider.waiting.subtitle")}</p>
                    <div className="flex items-center gap-1.5 mt-3">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-orange-400"
                          style={{ animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite` }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{ background: "rgba(255,255,255,0.04)" }}
                    >
                      <Flame className="w-8 h-8 text-white/15" />
                    </div>
                    <p className="text-white/70 font-semibold mb-1">{t("provider.offline.title")}</p>
                    <p className="text-white/30 text-sm mb-4">{t("provider.offline.subtitle")}</p>
                    <button
                      onClick={() => toggleAvailability.mutate({ providerId: id, pinHash: pinHash! })}
                      disabled={toggleAvailability.isPending}
                      className="px-6 py-2.5 rounded-2xl text-sm font-bold text-white"
                      style={{ background: "oklch(0.62 0.22 27)" }}
                    >
                      {toggleAvailability.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("provider.offline.activate")}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Rating summary */}
            {ratingStats && ratingStats.total > 0 && (
              <div
                className="rounded-3xl p-4"
                style={{ background: "oklch(0.13 0 0)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span className="text-white font-bold text-sm">{t("provider.ratings.title")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-amber-400 font-black text-lg">{ratingStats.avg.toFixed(1)}</span>
                    <span className="text-white/30 text-xs">/ 5</span>
                    <span className="text-white/30 text-xs mr-1">({ratingStats.total})</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = ratingStats.distribution[star] ?? 0;
                    const pct = ratingStats.total > 0 ? Math.round((count / ratingStats.total) * 100) : 0;
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-white/40 text-xs w-3">{star}</span>
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: "oklch(0.72 0.18 75)" }}
                          />
                        </div>
                        <span className="text-white/30 text-xs w-4 text-left">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MAP TAB */}
        {activeTab === "map" && (
          <div className="h-full" style={{ height: "calc(100vh - 180px)" }}>
            <ProviderMapView providerId={id} />
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div className="p-4 space-y-3">
            {history && history.length > 0 && (() => {
              const delivered = history.filter(h => h?.status === "delivered");
              const totalEarned = delivered.reduce((s, h) => s + parseFloat(String(h?.totalPrice ?? "0")), 0);
              const today = new Date().toDateString();
              const todayEarned = delivered
                .filter(h => h?.deliveredAt && new Date(h.deliveredAt).toDateString() === today)
                .reduce((s, h) => s + parseFloat(String(h?.totalPrice ?? "0")), 0);
              return (
                <div
                  className="rounded-3xl p-4 flex gap-3"
                  style={{ background: "linear-gradient(135deg, oklch(0.16 0.06 27) 0%, oklch(0.13 0 0) 100%)", border: "1px solid rgba(255,150,50,0.15)" }}
                >
                  <div className="flex-1 text-center">
                    <p className="text-white/40 text-xs mb-1">{t("provider.history.today")}</p>
                    <p className="text-orange-300 font-black text-lg leading-tight">{todayEarned.toFixed(3)}</p>
                    <p className="text-white/30 text-xs">OMR</p>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div className="flex-1 text-center">
                    <p className="text-white/40 text-xs mb-1">{t("provider.history.total.deliveries")}</p>
                    <p className="text-white font-black text-lg leading-tight">{delivered.length}</p>
                    <p className="text-white/30 text-xs">{t("provider.history.order")}</p>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div className="flex-1 text-center">
                    <p className="text-white/40 text-xs mb-1">{t("provider.history.total")}</p>
                    <p className="text-emerald-400 font-black text-lg leading-tight">{totalEarned.toFixed(3)}</p>
                    <p className="text-white/30 text-xs">OMR</p>
                  </div>
                </div>
              );
            })()}

            {!history ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
              </div>
            ) : history.length === 0 ? (
              <div
                className="rounded-3xl p-10 text-center"
                style={{ background: "oklch(0.13 0 0)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <History className="w-7 h-7 text-white/15" />
                </div>
                <p className="text-white/50 font-semibold text-sm mb-1">{t("provider.history.empty.title")}</p>
                <p className="text-white/25 text-xs">{t("provider.history.empty.subtitle")}</p>
              </div>
            ) : (
              <div
                className="rounded-3xl overflow-hidden"
                style={{ background: "oklch(0.13 0 0)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {history.map((item, i) => {
                  const addr = (item as any)?.deliveryAddress || (item as any)?.customerAddress || null;
                  const isCoords = addr && /^[\d.]+,\s*[\d.]+$/.test(addr.trim());
                  const displayAddr = isCoords ? null : addr;
                  const gas = (item as any)?.gasAmount;
                  const pm = (item as any)?.paymentMethod;
                  const dt = item?.deliveredAt || item?.createdAt;
                  const locale = lang === "en" ? "en-GB" : "ar-OM";
                  const dateStr = dt ? new Date(dt).toLocaleDateString(locale, { month: "short", day: "numeric" }) : null;
                  const timeStr = dt ? new Date(dt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) : null;
                  const gasAmt = gas ? parseFloat(String(gas)) : 0;
                  const cylinderLabel = gasAmt === 1
                    ? t("provider.history.cylinder.single")
                    : t("provider.history.cylinder.plural");
                  return (
                    <div
                      key={item?.orderId}
                      className="px-4 py-3.5"
                      style={{ borderBottom: i < history.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: item?.status === "delivered" ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.05)" }}
                        >
                          <Package className={`w-4 h-4 ${item?.status === "delivered" ? "text-emerald-400" : "text-white/30"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-white text-sm font-bold">{t("provider.history.order.prefix")}{item?.orderId}</p>
                            <p className="text-orange-300 text-sm font-black shrink-0">
                              OMR {parseFloat(item?.totalPrice ?? "0").toFixed(3)}
                            </p>
                          </div>
                          {displayAddr && (
                            <p className="text-white/50 text-xs truncate mt-0.5">{displayAddr}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <StatusBadge status={item?.status ?? ""} lang={lang} />
                            {gas && (
                              <span className="text-white/40 text-xs">
                                {gas} {cylinderLabel}
                              </span>
                            )}
                            {pm && pmLabelShort[pm] && (
                              <span className={`text-xs font-semibold ${pmColor[pm] || "text-white/40"}`}>{pmLabelShort[pm]}</span>
                            )}
                            {dateStr && (
                              <span className="text-white/25 text-xs mr-auto">{dateStr} · {timeStr}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <div className="p-4 space-y-4">

            {/* Account info */}
            <div
              className="rounded-3xl p-4 space-y-3"
              style={{ background: "oklch(0.13 0 0)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wide">{t("provider.settings.account")}</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-orange-400 shrink-0" />
                  <div>
                    <p className="text-white/40 text-xs">{t("provider.settings.name")}</p>
                    <p className="text-white text-sm font-semibold">{provider.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-orange-400 shrink-0" />
                  <div>
                    <p className="text-white/40 text-xs">{t("provider.settings.phone")}</p>
                    <p className="text-white text-sm font-semibold" dir="ltr">{provider.phone}</p>
                  </div>
                </div>
                {provider.email && (
                  <div className="flex items-center gap-3">
                    <Navigation className="w-4 h-4 text-orange-400 shrink-0" />
                    <div>
                      <p className="text-white/40 text-xs">{t("provider.settings.email")}</p>
                      <p className="text-white text-sm font-semibold" dir="ltr">{provider.email}</p>
                    </div>
                  </div>
                )}
                {(provider as any).zoneName && (
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-orange-400 shrink-0" />
                    <div>
                      <p className="text-white/40 text-xs">{t("provider.settings.zone")}</p>
                      <p className="text-white text-sm font-semibold">{(provider as any).zoneName}</p>
                      {(provider as any).subZoneNames?.length > 0 && (
                        <p className="text-white/40 text-xs mt-0.5">{(provider as any).subZoneNames.join(" · ")}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* PIN Change */}
            <div
              className="rounded-3xl overflow-hidden"
              style={{ background: "oklch(0.13 0 0)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {!showPinChange ? (
                <button
                  onClick={() => setShowPinChange(true)}
                  className="w-full flex items-center justify-between px-4 py-4"
                >
                  <div className="flex items-center gap-3">
                    <Key className="w-4 h-4 text-orange-400" />
                    <span className="text-white font-semibold text-sm">{t("provider.settings.pin.change")}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20" />
                </button>
              ) : (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-orange-400" />
                      <span className="text-white font-bold text-sm">{t("provider.settings.pin.change")}</span>
                    </div>
                    <button onClick={() => { setShowPinChange(false); setPinChangeStep("current"); }} className="text-white/30 text-xs">{t("provider.settings.pin.cancel")}</button>
                  </div>
                  <p className="text-white/50 text-xs">
                    {pinChangeStep === "current" && t("provider.settings.pin.current")}
                    {pinChangeStep === "new" && t("provider.settings.pin.new")}
                    {pinChangeStep === "confirm" && t("provider.settings.pin.confirm")}
                  </p>
                  <div className="flex gap-2 justify-center" dir="ltr">
                    {(pinChangeStep === "current" ? currentPinDigits : pinChangeStep === "new" ? newPinDigits : confirmPinDigits).map((d, i) => (
                      <input
                        key={i}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 1);
                          const setter = pinChangeStep === "current" ? setCurrentPinDigits : pinChangeStep === "new" ? setNewPinDigits : setConfirmPinDigits;
                          setter((prev) => { const next = [...prev]; next[i] = val; return next; });
                          if (val && i < 3) (e.target.nextSibling as HTMLInputElement)?.focus();
                        }}
                        className="w-12 h-12 rounded-xl text-center text-white font-black text-xl"
                        style={{
                          background: "oklch(0.18 0 0)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          WebkitTextFillColor: "white",
                          outline: "none",
                        }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={async () => {
                      const sha256 = async (s: string) => {
                        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
                        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
                      };
                      if (pinChangeStep === "current") {
                        const pin = currentPinDigits.join("");
                        if (pin.length < 4) { toast.error(t("provider.settings.pin.error.digits")); return; }
                        setPinChangeStep("new");
                      } else if (pinChangeStep === "new") {
                        const pin = newPinDigits.join("");
                        if (pin.length < 4) { toast.error(t("provider.settings.pin.error.digits")); return; }
                        setPinChangeStep("confirm");
                      } else {
                        const newPin = newPinDigits.join("");
                        const confirmPin = confirmPinDigits.join("");
                        if (newPin !== confirmPin) { toast.error(t("provider.settings.pin.error.mismatch")); return; }
                        const currentHash = await sha256(currentPinDigits.join(""));
                        const newHash = await sha256(newPin);
                        changePin.mutate({ providerId: id, pinHash: currentHash, newPinHash: newHash });
                        const { storePinHash } = await import("@/lib/pinStorage");
                        storePinHash(id, newHash);
                      }
                    }}
                    disabled={changePin.isPending}
                    className="w-full py-3 rounded-2xl text-sm font-bold text-white"
                    style={{ background: "oklch(0.62 0.22 27)" }}
                  >
                    {changePin.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : pinChangeStep === "confirm" ? t("provider.settings.pin.save") : t("provider.settings.pin.next")}
                  </button>
                </div>
              )}
            </div>

            {/* Push notifications */}
            <div
              className="rounded-3xl p-4"
              style={{ background: "oklch(0.13 0 0)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {pushSubscribed
                    ? <Bell className="w-5 h-5 text-emerald-400" />
                    : <BellOff className="w-5 h-5 text-white/30" />}
                  <div>
                    <p className="text-white font-semibold text-sm">
                      {pushSubscribed ? t("provider.settings.notifications.on") : t("provider.settings.notifications.off")}
                    </p>
                    <p className="text-white/40 text-xs">
                      {pushSubscribed ? t("provider.settings.notifications.on.sub") : t("provider.settings.notifications.off.sub")}
                    </p>
                  </div>
                </div>
                {!pushSubscribed && (
                  <button
                    onClick={subscribeToPush}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl"
                    style={{ background: "oklch(0.62 0.22 27 / 0.2)", color: "oklch(0.75 0.22 27)" }}
                  >
                    {t("provider.settings.notifications.enable")}
                  </button>
                )}
              </div>
            </div>

            {/* Working hours */}
            <div
              className="rounded-3xl overflow-hidden"
              style={{ background: "oklch(0.13 0 0)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-400" />
                <p className="text-white font-bold text-sm">{t("provider.settings.hours")}</p>
              </div>
              <div className="px-4 pb-4">
                <WorkingHoursEditor providerId={id} pinHash={pinHash ?? ""} />
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={() => { clearPinHash(id); navigate(`/provider/${id}/login`); }}
              className="w-full flex items-center justify-between rounded-3xl px-4 py-4"
              style={{ background: "oklch(0.13 0 0)", border: "1px solid rgba(255,100,100,0.15)" }}
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-4 h-4 text-red-400" />
                <span className="text-red-400 font-semibold text-sm">{t("provider.settings.logout")}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-red-400/40" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
