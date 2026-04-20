/**
 * OrderSummary — ملخص الطلب
 * يقرأ موقع التوصيل من sessionStorage ويعرض السعر والوقت المتوقع.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  ChevronRight,
  Flame,
  MapPin,
  Clock,
  ShieldCheck,
  Loader2,
  Edit2,
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
      try {
        setDraft(JSON.parse(storedDraft));
        return;
      } catch {
        // fall through to re-create
      }
    }

    const storedLoc = sessionStorage.getItem("deliveryLocation");
    if (!storedLoc) {
      navigate("/order/location");
      return;
    }

    let loc: DeliveryLocation;
    try {
      loc = JSON.parse(storedLoc);
    } catch {
      navigate("/order/location");
      return;
    }

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

  // ── Loading state ────────────────────────────────────────────────────────
  if (creating || !draft) {
    return (
      <div
        className="mobile-screen flex items-center justify-center"
        style={{ background: "oklch(0.09 0 0)" }}
      >
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
        {/* Main order card */}
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
              <span className="font-semibold">
                OMR {(draft.gasAmount * draft.unitPrice).toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">رسوم التوصيل</span>
              <span className="font-semibold">OMR {draft.deliveryFee.toFixed(3)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2">
              <span className="font-extrabold text-gray-900 text-base">الإجمالي</span>
              <span className="font-extrabold text-xl text-primary">
                OMR {draft.totalPrice.toFixed(3)}
              </span>
            </div>
          </div>

          {/* ETA */}
          <div className="flex gap-4 text-sm text-gray-500 mb-4">
            <div className="flex items-center gap-1.5 shrink-0">
              <Clock className="w-4 h-4 text-primary" />
              <span>{draft.estimatedMinutes} دقيقة</span>
            </div>
          </div>

          {/* Location + provider zone — same pin; zone only if polygon match */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3 mb-4 space-y-3" dir="rtl">
            <div>
              <p className="text-[10px] text-gray-400 font-medium mb-1">منطقة مزوّدي الخدمة (حسب موقع الخريطة)</p>
              {draft.zoneLabel ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-800 leading-snug">
                  <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold">
                    {draft.zoneLabel}
                  </span>
                  <span className="text-gray-500 text-xs">نفس موقع الدبوس والعنوان أدناه</span>
                </div>
              ) : (
                <p className="text-xs text-amber-800 leading-relaxed">
                  لا توجد منطقة مزوّدين تطابق هذا الموقع على الخريطة — العنوان أدناه هو مرجع التوصيل فقط.
                </p>
              )}
            </div>
            {address && (
              <div className="flex items-start gap-2 bg-white rounded-xl p-3 border border-gray-100">
                <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">
                    عنوان التوصيل
                  </p>
                  <p className="text-sm text-gray-800 leading-snug">{address}</p>
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
          </div>

          {!draft.zoneLabel && (
            <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-800 mb-4">
              ⚠️ موقع التوصيل خارج حدود مناطق المزوّدين. اضغط القلم واختر موقعاً داخل مسقط (أو المناطق المغطاة) للمتابعة إلى الدفع.
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
            title={!draft.zoneLabel ? "عدّل موقع التوصيل ليكون داخل منطقة خدمة مزوّد" : undefined}
          >
            اختر طريقة الدفع — OMR {draft.totalPrice.toFixed(3)}
            <ChevronRight className="w-5 h-5 mr-1" />
          </Button>
        </div>

        {/* Trust note */}
        <div className="flex items-center gap-2 px-2">
          <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
          <p className="text-xs text-white/40">
            توصيل مضمون أو استرداد كامل. لا رسوم خفية.
          </p>
        </div>

        {/* WhatsApp fallback */}
        <a
          href="https://wa.me/96891000001?text=أريد%20طلب%20غاز"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-2xl border border-white/10 py-3 text-sm text-white/40 hover:text-white/60 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-green-400">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          تحتاج مساعدة؟ تواصل معنا عبر واتساب
        </a>
      </div>
    </div>
  );
}
