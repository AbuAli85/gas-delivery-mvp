import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  ChevronRight, Flame, MapPin, Clock, ShieldCheck,
  Loader2, Edit2, Package, AlertTriangle, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

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
  hasProviders: boolean;
  address?: string;
  deliveryLat?: number;
  deliveryLng?: number;
}

export default function OrderSummary() {
  const [, navigate] = useLocation();
  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const [deliveryLoc, setDeliveryLoc] = useState<DeliveryLocation | null>(null);
  const [creating, setCreating] = useState(false);

  const createDraft = trpc.orders.createOrderDraft.useMutation({
    onSuccess: (data) => {
      const loc = deliveryLoc;
      const d: OrderDraft = {
        orderId: data.orderId,
        gasAmount: 1,
        unitPrice: data.unitPrice,
        deliveryFee: data.deliveryFee,
        totalPrice: data.totalPrice,
        currency: data.currency,
        estimatedMinutes: data.estimatedMinutes,
        zoneLabel: data.zoneLabel,
        hasProviders: data.hasProviders,
        address: loc?.address,
        deliveryLat: loc?.lat,
        deliveryLng: loc?.lng,
      };
      sessionStorage.setItem("orderDraft", JSON.stringify(d));
      setDraft(d);
      setCreating(false);
    },
    onError: (err) => {
      toast.error(err.message || "تعذّر إنشاء الطلب. يرجى المحاولة مجدداً.");
      setCreating(false);
    },
  });

  useEffect(() => {
    const storedDraft = sessionStorage.getItem("orderDraft");
    if (storedDraft) {
      try { setDraft(JSON.parse(storedDraft)); return; } catch { /* fall through */ }
    }
    const storedLoc = sessionStorage.getItem("deliveryLocation");
    if (!storedLoc) { navigate("/order/location"); return; }
    let loc: DeliveryLocation;
    try { loc = JSON.parse(storedLoc); } catch { navigate("/order/location"); return; }
    setDeliveryLoc(loc);
    setCreating(true);
    createDraft.mutate({
      customerLat: loc.lat,
      customerLng: loc.lng,
      customerAddress: loc.address,
      deliveryLat: loc.lat,
      deliveryLng: loc.lng,
      deliveryAddress: loc.address,
      gasAmount: 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ── Loading state ──────────────────────────────────────────────────────────
  if (creating || !draft) {
    return (
      <div className="mobile-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <p className="text-gray-700 font-semibold">جارٍ تجهيز طلبك…</p>
          <p className="text-sm text-gray-400 mt-1">نبحث عن أقرب مزود متاح</p>
        </div>
      </div>
    );
  }

  const address = draft.address || deliveryLoc?.address;
  const inZone = !!draft.zoneLabel;
  const canProceed = inZone;

  return (
    <div className="mobile-screen bg-gray-50">
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
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-base font-bold text-white">ملخص الطلب</h1>
            <p className="text-white/50 text-xs">راجع تفاصيل طلبك قبل الدفع</p>
          </div>
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
            <div>
              <p className="font-extrabold text-gray-900 text-base">أسطوانة غاز LPG</p>
              <p className="text-sm text-gray-400 flex items-center gap-1 mt-0.5">
                <Package className="w-3.5 h-3.5" />
                {draft.gasAmount} {draft.gasAmount === 1 ? "أسطوانة" : "أسطوانات"}
              </p>
            </div>
          </div>

          {/* Price breakdown */}
          <div className="space-y-2.5 border-t border-gray-100 pt-4 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">الغاز × {draft.gasAmount}</span>
              <span className="font-semibold text-gray-800">
                OMR {(draft.gasAmount * draft.unitPrice).toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">رسوم التوصيل</span>
              <span className={`font-semibold ${draft.deliveryFee === 0 ? "text-green-600" : "text-gray-800"}`}>
                {draft.deliveryFee === 0 ? "مجاناً" : `OMR ${draft.deliveryFee.toFixed(3)}`}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-3 mt-1">
              <span className="font-extrabold text-gray-900 text-base">الإجمالي</span>
              <span className="font-extrabold text-2xl" style={{ color: "oklch(0.53 0.22 27)" }}>
                OMR {draft.totalPrice.toFixed(3)}
              </span>
            </div>
          </div>

          {/* ETA badge */}
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 mb-4">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm text-gray-600">
              الوقت المتوقع:{" "}
              <strong className="text-gray-900">{draft.estimatedMinutes} دقيقة</strong>
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
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">عنوان التوصيل</p>
                <p className="text-sm text-gray-800 leading-snug">{address}</p>
                {inZone && (
                  <span className="inline-flex items-center gap-1 mt-1.5 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    {draft.zoneLabel} — ضمن نطاق التوصيل
                  </span>
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
                <p className="text-sm font-semibold text-amber-800">خارج نطاق التوصيل</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  موقعك الحالي خارج مناطق التوصيل المتاحة.{" "}
                  <button onClick={changeLocation} className="underline font-semibold">
                    غيّر الموقع
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Limited availability warning */}
          {inZone && !draft.hasProviders && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3 mb-4">
              <Clock className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800">توافر محدود</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  لا يوجد مزودون متاحون الآن — سيُعالج طلبك عند توفر مزود.
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
                اختر طريقة الدفع
                <span className="mx-2 opacity-60">·</span>
                OMR {draft.totalPrice.toFixed(3)}
                <ChevronRight className="w-5 h-5 mr-2 shrink-0" />
              </>
            ) : (
              "الموقع خارج نطاق التوصيل"
            )}
          </Button>
        </div>

        {/* Trust note */}
        <div className="flex items-center justify-center gap-2 py-1">
          <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
          <p className="text-xs text-gray-400">توصيل مضمون أو استرداد كامل · لا رسوم خفية</p>
        </div>
      </div>
    </div>
  );
}
