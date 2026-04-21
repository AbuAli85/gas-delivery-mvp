import { useState } from "react";
import { useLocation } from "wouter";
import { Flame, ChevronLeft, ShieldCheck, Zap, Phone, User } from "lucide-react";
import { getCustomerPhone } from "./CustomerLogin";
import { FIXED_ORDER_PRICE } from "../../../shared/domain";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const [, navigate] = useLocation();
  const customerPhone = getCustomerPhone();

  const { data: providers } = trpc.providers.list.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const onlineCount = providers?.filter((p) => p.isAvailable).length ?? 0;

  const { data: serviceStatus } = trpc.providers.getServiceStatus.useQuery(undefined, {
    refetchInterval: 60000,
  });

  return (
    <div className="mobile-screen" style={{ background: "oklch(0.09 0 0)" }}>
      {/* ── Hero ── */}
      <div
        className="flex flex-col items-center justify-center px-6 pt-14 pb-8 text-white"
        style={{
          background:
            "linear-gradient(170deg, oklch(0.09 0 0) 0%, oklch(0.16 0 0) 45%, oklch(0.48 0.22 27) 100%)",
          minHeight: "50vh",
        }}
      >
        {/* Brand mark */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
            <Flame className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <p className="text-[10px] text-white/50 uppercase tracking-widest">OWASEEL</p>
            <p className="text-base font-bold leading-none">أو وصل</p>
          </div>
          {serviceStatus ? (
            <div className={`mr-3 flex items-center gap-1.5 rounded-full px-3 py-1 border ${
              serviceStatus.isOpen
                ? "bg-green-500/20 border-green-500/30"
                : "bg-red-500/20 border-red-500/30"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                serviceStatus.isOpen ? "bg-green-400 animate-pulse" : "bg-red-400"
              }`} />
              <span className={`text-[11px] font-semibold ${
                serviceStatus.isOpen ? "text-green-300" : "text-red-300"
              }`}>
                {serviceStatus.isOpen
                  ? `مفتوح • ${onlineCount} متاح`
                  : serviceStatus.nextOpenLabel
                    ? `مغلق • يفتح ${serviceStatus.nextOpenLabel}`
                    : "مغلق"}
              </span>
            </div>
          ) : onlineCount > 0 && (
            <div className="mr-3 flex items-center gap-1.5 bg-green-500/20 border border-green-500/30 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[11px] text-green-300 font-semibold">{onlineCount} متاح</span>
            </div>
          )}
        </div>

        <h1 className="text-4xl font-extrabold text-center leading-tight mb-3">
          توصيل الغاز خلال <span className="text-orange-400">٣٠ دقيقة</span>
        </h1>
        <p className="text-white/50 text-center text-sm max-w-xs">
          بدون تطبيق. بدون تسجيل. بضغطة واحدة.
        </p>
      </div>

      {/* ── Order card ── */}
      <div className="flex-1 px-4 -mt-5 pb-6">
        <div className="bg-white rounded-3xl shadow-2xl p-5">
          {/* Price strip */}
          <div className="flex items-center justify-center gap-3 mb-5 px-1 py-3 bg-gray-50 rounded-2xl">
            <div className="text-center">
              <p className="text-[10px] text-gray-400 tracking-wide mb-0.5">السعر الإجمالي شامل التوصيل</p>
              <p className="text-3xl font-extrabold text-primary">OMR {FIXED_ORDER_PRICE.toFixed(3)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">سعر ثابت — لا رسوم إضافية</p>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full rounded-2xl font-extrabold text-lg shadow-lg shadow-primary/30 transition-transform active:scale-95"
            style={{ height: "64px", background: "oklch(0.53 0.22 27)" }}
            onClick={() => navigate("/order/location")}
          >
            <Flame className="w-5 h-5" />
            🔥 اطلب الغاز الآن
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <p className="text-center text-[11px] text-gray-400 mt-3">
            سنطلب موقعك — يستغرق ثانيتين فقط
          </p>
        </div>

        {/* ── Trust strip ── */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { icon: ShieldCheck, line1: "مضمون",       line2: "استرداد كامل إن لم يصل" },
            { icon: Zap,         line1: "٣٠ دقيقة",    line2: "متوسط وقت التوصيل" },
            { icon: Phone,       line1: "الدفع نقداً", line2: "أو بطاقة أو تحويل" },
          ].map(({ icon: Icon, line1, line2 }) => (
            <div
              key={line1}
              className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center"
            >
              <Icon className="w-4 h-4 text-orange-400 mx-auto mb-1" />
              <p className="text-[11px] font-bold text-white">{line1}</p>
              <p className="text-[9px] text-white/40 leading-tight">{line2}</p>
            </div>
          ))}
        </div>

        {/* ── WhatsApp fallback ── */}
        <a
          href="https://wa.me/96891000001?text=أريد%20طلب%20غاز"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 w-full rounded-2xl border border-white/10 py-3 text-sm text-white/60 hover:text-white/80 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-green-400">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          تحتاج مساعدة؟ تواصل معنا عبر واتساب
        </a>

        {/* ── Customer Login / Profile ── */}
        <div className="mt-3 flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-white/40" />
            <p className="text-xs text-white/40">
              {customerPhone ? customerPhone : "حسابك"}
            </p>
          </div>
          <a
            href="/customer/login"
            className="text-xs font-bold text-blue-400 border border-blue-400/30 rounded-lg px-3 py-1 hover:bg-blue-400/10"
          >
            {customerPhone ? "تغيير الحساب" : "تسجيل دخول"}
          </a>
        </div>

        {/* ── Provider portal ── */}
        <div className="mt-3 flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
          <p className="text-xs text-white/40">بوابة المزودين</p>
          <div className="flex gap-2 flex-wrap">
            <a
              href="/provider/login"
              className="text-xs font-bold text-primary border border-primary/30 rounded-lg px-3 py-1 hover:bg-primary/10"
            >
              دخول المزود
            </a>
            <a
              href="/provider/register"
              className="text-xs font-bold text-orange-400 border border-orange-400/30 rounded-lg px-3 py-1 hover:bg-orange-400/10"
            >
              + انضم كمزوّد
            </a>
            <a
              href="/admin"
              className="text-xs font-bold text-gray-400 border border-gray-500/30 rounded-lg px-3 py-1 hover:bg-gray-500/10"
            >
              إدارة
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
