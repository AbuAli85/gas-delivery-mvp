import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ChevronRight, Flame, MapPin, Clock, ShieldCheck, Loader2, Edit2 } from "lucide-react";
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

  if (creating || !draft) {
    return (
      <div className="mobile-screen flex items-center justify-center" style={{ background: "oklch(0.09 0 0)" }}>
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-orange-400 animate-spin mx-auto mb-3" />
          <p className="text-white/60 text-sm">جارٍ البحث عن مزودين قريبين منك…</p>
        </div>
      </div>
    );
  }

  const address = draft.address || deliveryLoc?.address;

  return (
    <div className="mobile-screen" style={{ background: "oklch(0.09 0 0)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-white">ملخص الطلب</h1>
          <p className="text-white/40 text-xs">راجع تفاصيل طلبك قبل الدفع</p>
        </div>
      </div>

      <div className="flex-1 px-4 pb-8 space-y-3">
        <div className="bg-white rounded-3xl shadow-xl p-5">
          {/* Item row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Flame className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">أسطوانة غاز LPG</p>
              <p className="text-sm text-gray-500">
                {draft.gasAmount} {draft.gasAmount === 1 ? "أسطوانة" : "أسطوانات"}
              </p>
            </div>
          </div>

          {/* Price breakdown */}
          <div className="space-y-2 border-t border-gray-100 pt-4 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">الغاز × {draft.gasAmount}</span>
              <span className="font-semibold">OMR {(draft.gasAmount * draft.unitPrice).toFixed(3)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">رسوم التوصيل</span>
              <span className="font-semibold">OMR {draft.deliveryFee.toFixed(3)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2">
              <span className="font-extrabold text-gray-900 text-base">الإجمالي</span>
              <span className="font-extrabold text-xl text-primary">OMR {draft.totalPrice.toFixed(3)}</span>
            </div>
          </div>

          {/* ETA */}
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
            <Clock className="w-4 h-4 text-primary" />
            <span>الوقت المتوقع: {draft.estimatedMinutes} دقيقة</span>
          </div>

          {/* Delivery address */}
          {address && (
            <div className="flex items-start gap-2 bg-gray-50 rounded-2xl p-3 mb-4 border border-gray-100" dir="rtl">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">عنوان التوصيل</p>
                <p className="text-sm text-gray-800 leading-snug">{address}</p>
                {draft.zoneLabel && (
                  <span className="inline-flex items-center mt-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold">
                    {draft.zoneLabel}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={changeLocation}
                className="shrink-0 text-primary hover:text-primary/80 transition-colors"
                title="تغيير الموقع"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Warnings */}
          {!draft.zoneLabel && (
            <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-800 mb-4">
              ⚠️ الموقع خارج نطاق التوصيل — اضغط <Edit2 className="w-3 h-3 inline" /> لتغيير الموقع.
            </div>
          )}
          {draft.zoneLabel && !draft.hasProviders && (
            <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-700 mb-4">
              ⚠️ التوافر محدود في منطقتك — سيتم وضع طلبك في قائمة الانتظار.
            </div>
          )}

          {/* CTA */}
          <Button
            size="lg"
            className="w-full rounded-2xl font-extrabold text-base shadow-lg shadow-primary/30 active:scale-95 transition-transform"
            style={{ height: "60px", background: "oklch(0.53 0.22 27)" }}
            onClick={goToPayment}
            disabled={!draft.zoneLabel}
          >
            اختر طريقة الدفع — OMR {draft.totalPrice.toFixed(3)}
            <ChevronRight className="w-5 h-5 mr-1" />
          </Button>
        </div>

        {/* Trust note */}
        <div className="flex items-center gap-2 px-2">
          <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
          <p className="text-xs text-white/40">توصيل مضمون أو استرداد كامل. لا رسوم خفية.</p>
        </div>
      </div>
    </div>
  );
}
