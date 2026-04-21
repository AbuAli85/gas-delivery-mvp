import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  ChevronRight, ChevronLeft, Flame, MapPin, Clock, ShieldCheck,
  Loader2, Edit2, Package, AlertTriangle, CheckCircle2, Minus, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const MAX_CYLINDERS = 10;
const MIN_CYLINDERS = 1;

interface DeliveryLocation {
  lat: number;
  lng: number;
  address: string;
}

interface OrderDraft {
  orderId: number;
  gasAmount: number;
  unitPrice: number;
  deliveryFee: number;
  totalPrice: number;
  currency: string;
  estimatedMinutes: number;
  zoneLabel: string;
  subZoneLabel?: string | null;
  subZoneProviderCount?: number | null;
  hasProviders: boolean;
  hasSubZoneProviders?: boolean | null;
  address?: string;
  deliveryLat?: number;
  deliveryLng?: number;
}

export default function OrderSummary() {
  const [, navigate] = useLocation();
  const { t, dir } = useLanguage();
  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const [deliveryLoc, setDeliveryLoc] = useState<DeliveryLocation | null>(null);
  const [creating, setCreating] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const { data: serviceStatus } = trpc.providers.getServiceStatus.useQuery(undefined, {
    refetchInterval: 60000,
  });

  const createDraft = trpc.orders.createOrderDraft.useMutation({
    onSuccess: (data) => {
      const loc = deliveryLoc;
      const d: OrderDraft = {
        orderId: data.orderId,
        gasAmount: data.gasAmount,
        unitPrice: data.unitPrice,
        deliveryFee: data.deliveryFee,
        totalPrice: data.totalPrice,
        currency: data.currency,
        estimatedMinutes: data.estimatedMinutes,
        zoneLabel: data.zoneLabel,
        subZoneLabel: data.subZoneLabel ?? null,
        subZoneProviderCount: data.subZoneProviderCount ?? null,
        hasProviders: data.hasProviders,
        hasSubZoneProviders: data.hasSubZoneProviders ?? null,
        address: loc?.address,
        deliveryLat: loc?.lat,
        deliveryLng: loc?.lng,
      };
      sessionStorage.setItem("orderDraft", JSON.stringify(d));
      setDraft(d);
      setCreating(false);
    },
    onError: (err) => {
      toast.error(err.message || (dir === "rtl" ? "تعذّر إنشاء الطلب. يرجى المحاولة مجدداً." : "Failed to create order. Please try again."));
      setCreating(false);
    },
  });

  const submitDraft = useCallback((loc: DeliveryLocation, qty: number) => {
    setCreating(true);
    createDraft.mutate({
      customerLat: loc.lat,
      customerLng: loc.lng,
      customerAddress: loc.address,
      deliveryLat: loc.lat,
      deliveryLng: loc.lng,
      deliveryAddress: loc.address,
      gasAmount: qty,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Always re-create from the current deliveryLocation.
    sessionStorage.removeItem("orderDraft");
    const storedLoc = sessionStorage.getItem("deliveryLocation");
    if (!storedLoc) { navigate("/order/location"); return; }
    let loc: DeliveryLocation;
    try { loc = JSON.parse(storedLoc); } catch { navigate("/order/location"); return; }
    setDeliveryLoc(loc);
    submitDraft(loc, quantity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-create draft when quantity changes (debounced via creating flag)
  function handleQuantityChange(newQty: number) {
    if (newQty < MIN_CYLINDERS || newQty > MAX_CYLINDERS) return;
    if (creating) return;
    setQuantity(newQty);
    if (deliveryLoc) submitDraft(deliveryLoc, newQty);
  }

  function goToPayment() {
    sessionStorage.setItem("orderId", String(draft!.orderId));
    sessionStorage.setItem("totalPrice", String(draft!.totalPrice));
    navigate("/order/payment");
  }

  function changeLocation() {
    sessionStorage.removeItem("orderDraft");
    sessionStorage.removeItem("deliveryLocation");
    navigate("/order/location");
  }

  const ChevronBack = dir === "rtl" ? ChevronRight : ChevronLeft;
  const ChevronFwd  = dir === "rtl" ? ChevronLeft  : ChevronRight;

  // ── Loading state ──────────────────────────────────────────────────────────
  if (creating || !draft) {
    return (
      <div className="mobile-screen bg-gray-50 flex items-center justify-center" dir={dir}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <p className="text-gray-700 font-semibold">{dir === "rtl" ? "جارٍ تجهيز طلبك…" : "Preparing your order…"}</p>
          <p className="text-sm text-gray-400 mt-1">{dir === "rtl" ? "نبحث عن أقرب مزود متاح" : "Finding the nearest available provider"}</p>
        </div>
      </div>
    );
  }

  const address = draft.address || deliveryLoc?.address;
  const inZone = !!draft.zoneLabel;
  const canProceed = inZone;

  return (
    <div className="mobile-screen bg-gray-50" dir={dir}>
      {/* ── Header ── */}
      <div
        className="px-4 pt-12 pb-5 text-white"
        style={{ background: "linear-gradient(135deg, oklch(0.12 0 0) 0%, oklch(0.53 0.22 27) 100%)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0"
          >
            <ChevronBack className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white">{t("summary.title")}</h1>
            <p className="text-white/50 text-xs">{dir === "rtl" ? "راجع تفاصيل طلبك قبل الدفع" : "Review your order before payment"}</p>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-3 pb-8">

        {/* ── Product card ── */}
        <div className="bg-white rounded-3xl shadow-sm p-5">
          <div className="flex items-center gap-4 mb-5">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, oklch(0.12 0 0), oklch(0.53 0.22 27))" }}
            >
              <Flame className="w-7 h-7 text-orange-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-gray-900 text-base">{t("summary.product")}</p>
              <p className="text-sm text-gray-400 flex items-center gap-1 mt-0.5">
                <Package className="w-3.5 h-3.5" />
                {dir === "rtl" ? "غاز بترول" : "LPG Gas"}
              </p>
            </div>
            {/* Quantity selector */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= MIN_CYLINDERS || creating}
                className="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="text-center min-w-[2.5rem]">
                <span className="text-xl font-extrabold text-gray-900">{quantity}</span>
                <p className="text-[10px] text-gray-400 leading-none mt-0.5">
                  {dir === "rtl" ? (quantity === 1 ? "أسطوانة" : "أسطوانات") : (quantity === 1 ? "cylinder" : "cylinders")}
                </p>
              </div>
              <button
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= MAX_CYLINDERS || creating}
                className="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Price breakdown */}
          <div className="space-y-2.5 border-t border-gray-100 pt-4 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{dir === "rtl" ? "الغاز" : "Gas"} × {draft.gasAmount}</span>
              <span className="font-semibold text-gray-800">
                OMR {(draft.gasAmount * draft.unitPrice).toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t("summary.delivery")}</span>
              <span className={`font-semibold ${draft.deliveryFee === 0 ? "text-green-600" : "text-gray-800"}`}>
                {draft.deliveryFee === 0 ? t("summary.free") : `OMR ${draft.deliveryFee.toFixed(3)}`}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-3 mt-1">
              <span className="font-extrabold text-gray-900 text-base">{t("summary.total")}</span>
              <span className="font-extrabold text-2xl" style={{ color: "oklch(0.53 0.22 27)" }}>
                OMR {draft.totalPrice.toFixed(3)}
              </span>
            </div>
          </div>

          {/* ETA badge */}
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 mb-4">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm text-gray-600">
              {t("summary.eta")}:{" "}
              <strong className="text-gray-900">{draft.estimatedMinutes} {t("summary.minutes")}</strong>
            </span>
          </div>

          {/* Delivery address */}
          {address && (
            <div
              className={`flex items-start gap-3 rounded-2xl p-3.5 mb-4 border ${
                inZone
                  ? "bg-emerald-50 border-emerald-100"
                  : "bg-amber-50 border-amber-200"
              }`}
              dir="rtl"
            >
              <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${inZone ? "text-emerald-600" : "text-amber-600"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{t("summary.location")}</p>
                <p className="text-sm text-gray-800 leading-snug">{address}</p>
                {inZone && (
                  <div className="flex flex-col gap-1 mt-1.5">
                    {draft.subZoneLabel ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        {draft.subZoneLabel} — {draft.zoneLabel}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        {draft.zoneLabel} — {dir === "rtl" ? "ضمن نطاق التوصيل" : "Within delivery zone"}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={changeLocation}
                className="shrink-0 w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-500 hover:text-primary transition-colors"
                title="تغيير الموقع"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Zone warning — only shown when truly outside zone */}
          {!inZone && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">{dir === "rtl" ? "خارج نطاق التوصيل" : "Outside delivery zone"}</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {dir === "rtl" ? "موقعك الحالي خارج مناطق التوصيل المتاحة." : "Your current location is outside available delivery zones."}{" "}
                  <button onClick={changeLocation} className="underline font-semibold">
                    {dir === "rtl" ? "غيّر الموقع" : "Change location"}
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Working hours warning */}
          {serviceStatus && !serviceStatus.isOpen && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3 mb-4">
              <Clock className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-orange-800">{dir === "rtl" ? "خارج ساعات العمل" : "Outside working hours"}</p>
                <p className="text-xs text-orange-600 mt-0.5">
                  {serviceStatus.nextOpenLabel
                    ? `الخدمة مغلقة حالياً — تفتح ${serviceStatus.nextOpenLabel}. يمكنك تقديم طلبك وسيُعالج عند الفتح.`
                    : "الخدمة مغلقة حالياً. يمكنك تقديم طلبك وسيُعالج عند الفتح."}
                </p>
              </div>
            </div>
          )}

          {/* Sub-zone availability warning: specific neighborhood has no providers */}
          {inZone && draft.subZoneLabel && draft.hasSubZoneProviders === false && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3 mb-4">
              <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-orange-800">تغطية محدودة في {draft.subZoneLabel}</p>
                <p className="text-xs text-orange-600 mt-0.5">
                  لا يوجد مزودون متاحون حالياً في حي {draft.subZoneLabel}.
                  سيُعالج طلبك عند توفر مزود في منطقتك.
                </p>
              </div>
            </div>
          )}

          {/* Limited availability warning (parent zone level) */}
          {inZone && !draft.subZoneLabel && !draft.hasProviders && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3 mb-4">
              <Clock className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800">{dir === "rtl" ? "توافر محدود" : "Limited Availability"}</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  {dir === "rtl" ? "لا يوجد مزودون متاحون الآن — سيُعالج طلبك عند توفر مزود." : "No providers available now — your order will be processed when one becomes available."}
                </p>
              </div>
            </div>
          )}

          {/* CTA button */}
          <Button
            size="lg"
            className="w-full rounded-2xl font-extrabold text-base text-white shadow-lg active:scale-95 transition-transform"
            style={{
              height: "60px",
              background: canProceed
                ? "linear-gradient(135deg, oklch(0.45 0.22 27), oklch(0.60 0.22 27))"
                : "oklch(0.80 0 0)",
              boxShadow: canProceed ? "0 8px 24px oklch(0.53 0.22 27 / 0.35)" : "none",
            }}
            onClick={goToPayment}
            disabled={!canProceed}
          >
            {canProceed ? (
              <>
                {dir === "rtl" ? "اختر طريقة الدفع" : "Choose Payment Method"}
                <span className="mx-2 opacity-60">·</span>
                OMR {draft.totalPrice.toFixed(3)}
                <ChevronFwd className="w-5 h-5 ms-2 shrink-0" />
              </>
            ) : (
              dir === "rtl" ? "الموقع خارج نطاق التوصيل" : "Location outside delivery zone"
            )}
          </Button>
        </div>

        {/* Trust note */}
        <div className="flex items-center justify-center gap-2 py-1">
          <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
          <p className="text-xs text-gray-400">{dir === "rtl" ? "توصيل مضمون أو استرداد كامل · لا رسوم خفية" : "Guaranteed delivery or full refund · No hidden fees"}</p>
        </div>
      </div>
    </div>
  );
}
