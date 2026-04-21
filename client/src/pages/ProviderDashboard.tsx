import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import {
  Flame, MapPin, Phone, Package, Clock, CheckCircle2,
  XCircle, Truck, History, Loader2, Wallet, Star,
  Bell, BellOff, Navigation, ShieldCheck, Settings,
  LogOut, ChevronRight, Zap, TrendingUp, Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getStoredPinHash, clearPinHash } from "@/lib/pinStorage";
import { WorkingHoursEditor } from "@/components/WorkingHoursEditor";

type Tab = "home" | "history" | "settings";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    delivered:        { label: "تم التوصيل",   cls: "bg-emerald-500/20 text-emerald-300" },
    cancelled:        { label: "ملغي",          cls: "bg-red-500/20 text-red-300" },
    out_for_delivery: { label: "جارٍ التوصيل", cls: "bg-violet-500/20 text-violet-300" },
    accepted:         { label: "مقبول",         cls: "bg-blue-500/20 text-blue-300" },
    pending:          { label: "قيد الانتظار", cls: "bg-yellow-500/20 text-yellow-300" },
    expired:          { label: "منتهي",         cls: "bg-gray-500/20 text-gray-400" },
    rejected:         { label: "مرفوض",         cls: "bg-red-500/20 text-red-300" },
  };
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

function IncomingOrderCard({
  incoming, onAccept, onReject, accepting, rejecting,
}: {
  incoming: { orderId: number; assignmentId: number; customerPhone: string | null; customerAddress: string | null; gasAmount: string; totalPrice: string };
  onAccept: () => void; onReject: () => void; accepting: boolean; rejecting: boolean;
}) {
  const [countdown, setCountdown] = useState(30);
  useEffect(() => {
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, []);

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
          <span className="text-white font-bold text-sm">طلب جديد!</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-white/80" />
          <span className="text-white font-bold text-sm">{countdown}ث</span>
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
            <span className="text-white/80 text-sm leading-snug">{incoming.customerAddress}</span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-white/40 shrink-0" />
            <span className="text-white/80 text-sm">
              <strong className="text-white">{incoming.gasAmount}</strong>{" "}
              {parseFloat(incoming.gasAmount) === 1 ? "أسطوانة" : "أسطوانات"}{" · "}
              <strong className="text-orange-300">OMR {parseFloat(incoming.totalPrice).toFixed(3)}</strong>
            </span>
          </div>
        </div>
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${(countdown / 30) * 100}%`, background: "oklch(0.62 0.22 27)" }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button
            className="h-12 rounded-2xl font-bold text-sm text-white"
            style={{ background: "oklch(0.45 0.18 145)" }}
            onClick={onAccept}
            disabled={accepting || rejecting}
          >
            {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 ml-1" />قبول</>}
          </Button>
          <Button
            className="h-12 rounded-2xl font-bold text-sm border border-red-500/30 text-red-400 bg-transparent hover:bg-red-500/10"
            onClick={onReject}
            disabled={accepting || rejecting}
          >
            {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4 ml-1" />رفض</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActiveOrderCard({
  order, onStartDelivery, onDeliver, starting, delivering,
}: {
  order: { orderId: number; assignmentId: number | null; customerPhone: string | null; customerAddress: string | null; gasAmount: string; totalPrice: string; status: string };
  onStartDelivery: () => void; onDeliver: () => void; starting: boolean; delivering: boolean;
}) {
  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{ background: "oklch(0.13 0 0)", border: "1px solid rgba(255,255,255,0.1)" }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-orange-400" />
          <span className="text-white font-bold text-sm">الطلب الحالي</span>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="p-4 space-y-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-white/40 shrink-0" />
            <span className="text-white font-semibold text-sm" dir="ltr">{order.customerPhone}</span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <span className="text-white/80 text-sm leading-snug">{order.customerAddress}</span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-white/40 shrink-0" />
            <span className="text-white/80 text-sm">
              <strong className="text-white">{order.gasAmount}</strong>{" "}
              {parseFloat(order.gasAmount) === 1 ? "أسطوانة" : "أسطوانات"}{" · "}
              <strong className="text-orange-300">OMR {parseFloat(order.totalPrice).toFixed(3)}</strong>
            </span>
          </div>
        </div>
        {order.status === "accepted" && (
          <Button
            className="w-full h-12 rounded-2xl font-bold text-white"
            style={{ background: "oklch(0.45 0.18 270)" }}
            onClick={onStartDelivery}
            disabled={starting}
          >
            {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Truck className="w-4 h-4 ml-2" />بدء التوصيل</>}
          </Button>
        )}
        {order.status === "out_for_delivery" && (
          <Button
            className="w-full h-12 rounded-2xl font-bold text-white"
            style={{ background: "oklch(0.45 0.18 145)" }}
            onClick={onDeliver}
            disabled={delivering}
          >
            {delivering ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 ml-2" />تأكيد التوصيل</>}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ProviderDashboard() {
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

  // Push notifications
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const { data: vapidData } = trpc.providers.getVapidPublicKey.useQuery();
  const savePushSub = trpc.providers.savePushSubscription.useMutation();

  const subscribeToPush = useCallback(async () => {
    if (!vapidData?.publicKey) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { toast.error("لم يتم منح إذن الإشعارات"); return; }
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
      toast.success("تم تفعيل الإشعارات!");
    } catch { toast.error("فشل تفعيل الإشعارات"); }
  }, [vapidData, id, pinHash, savePushSub]);

  useEffect(() => {
    if (!navigator.serviceWorker) return;
    navigator.serviceWorker.getRegistration("/sw.js").then(async (reg) => {
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (sub) setPushSubscribed(true);
    });
  }, []);

  // Location tracking
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

  // Queries
  const { data: provider, isLoading: providerLoading } = trpc.providers.getById.useQuery(
    { providerId: id }, { enabled: !!id, refetchInterval: 15_000 }
  );
  const { data: incoming } = trpc.providers.getIncomingOrder.useQuery(
    { providerId: id },
    { enabled: !!id && provider?.isAvailable === true, refetchInterval: (q) => (q.state.data ? false : 5_000) }
  );
  const { data: activeOrder } = trpc.providers.getActiveOrder.useQuery(
    { providerId: id }, { enabled: !!id, refetchInterval: 8_000 }
  );
  const { data: history } = trpc.providers.getOrderHistory.useQuery(
    { providerId: id }, { enabled: !!id && activeTab === "history" }
  );
  const { data: ratingStats } = trpc.reviews.getProviderStats.useQuery(
    { providerId: id }, { enabled: !!id }
  );

  // Mutations
  const toggleAvailability = trpc.providers.toggleAvailability.useMutation({
    onSuccess: (data) => {
      toast.success(data.isAvailable ? "أنت الآن متاح" : "أنت الآن غير متاح");
      utils.providers.getById.invalidate({ providerId: id });
    },
    onError: (err) => {
      if (err.data?.code === "UNAUTHORIZED") { clearPinHash(id); navigate(`/provider/${id}/login`); }
      else toast.error("فشل تحديث الحالة");
    },
  });
  const acceptOrder = trpc.providers.acceptOrder.useMutation({
    onSuccess: () => {
      toast.success("تم قبول الطلب!");
      utils.providers.getIncomingOrder.invalidate({ providerId: id });
      utils.providers.getActiveOrder.invalidate({ providerId: id });
    },
    onError: (err) => toast.error(err.message || "فشل قبول الطلب"),
  });
  const rejectOrder = trpc.providers.rejectOrder.useMutation({
    onSuccess: () => {
      toast.info("تم رفض الطلب.");
      utils.providers.getIncomingOrder.invalidate({ providerId: id });
    },
    onError: (err) => toast.error(err.message || "فشل رفض الطلب"),
  });
  const startDelivery = trpc.providers.startDelivery.useMutation({
    onSuccess: () => {
      toast.success("بدأ التوصيل!");
      utils.providers.getActiveOrder.invalidate({ providerId: id });
      startLocationUpdates();
    },
    onError: (err) => toast.error(err.message || "فشل بدء التوصيل"),
  });
  const deliverOrder = trpc.providers.deliverOrder.useMutation({
    onSuccess: () => {
      toast.success("تم التوصيل! عمل رائع.");
      utils.providers.getActiveOrder.invalidate({ providerId: id });
      utils.providers.getById.invalidate({ providerId: id });
      stopLocationUpdates();
    },
    onError: (err) => toast.error(err.message || "فشل تأكيد التوصيل"),
  });

  if (providerLoading) {
    return (
      <div className="mobile-screen items-center justify-center" style={{ background: "oklch(0.09 0 0)" }}>
        <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
        <p className="text-white/50 text-sm mt-3">جارٍ التحميل…</p>
      </div>
    );
  }
  if (!provider) {
    return (
      <div className="mobile-screen items-center justify-center px-6 text-center" style={{ background: "oklch(0.09 0 0)" }}>
        <p className="text-white font-semibold">المزود غير موجود</p>
        <p className="text-white/40 text-sm mt-2">تحقق من الرابط وحاول مجدداً.</p>
      </div>
    );
  }

  const accepted = provider.acceptedOrders ?? 0;
  const rejected = provider.rejectedOrders ?? 0;
  const total = accepted + rejected;
  const acceptRate = total > 0 ? Math.round((accepted / total) * 100) : 100;
  const commission = parseFloat(String(provider.totalCommission ?? "0")).toFixed(3);
  const avgRating = ratingStats?.avg ?? 0;

  return (
    <div className="mobile-screen" style={{ background: "oklch(0.09 0 0)" }}>

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
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "oklch(0.62 0.22 27 / 0.2)", border: "1px solid oklch(0.62 0.22 27 / 0.4)" }}
            >
              <Flame className="w-5 h-5 text-orange-400" />
            </div>
            <div className="min-w-0">
              <p className="text-white/50 text-xs">لوحة تحكم المزود</p>
              <p className="text-white font-bold text-base leading-tight truncate">{provider.name}</p>
            </div>
          </div>

          {/* Availability toggle */}
          <button
            onClick={() => toggleAvailability.mutate({ providerId: id, pinHash: pinHash! })}
            disabled={toggleAvailability.isPending}
            className="flex items-center gap-2 rounded-full px-3 py-2 transition-all shrink-0"
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
              {provider.isAvailable ? "متاح" : "غير متاح"}
            </span>
          </button>
        </div>

        {/* Stats row */}
        <div className="flex gap-2 mt-4">
          <StatCard
            icon={<Truck className="w-4 h-4 text-orange-400" />}
            value={String(provider.totalOrders ?? 0)}
            label="توصيلة"
            accent="bg-orange-500/15"
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4 text-blue-400" />}
            value={`${acceptRate}%`}
            label="نسبة القبول"
            accent="bg-blue-500/15"
          />
          <StatCard
            icon={<Wallet className="w-4 h-4 text-emerald-400" />}
            value={commission}
            label="عمولة OMR"
            accent="bg-emerald-500/15"
          />
          {avgRating > 0 && (
            <StatCard
              icon={<Star className="w-4 h-4 text-amber-400" />}
              value={avgRating.toFixed(1)}
              label="التقييم"
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
          { id: "home" as Tab,     icon: <Home className="w-4 h-4" />,     label: "الرئيسية" },
          { id: "history" as Tab,  icon: <History className="w-4 h-4" />,  label: "السجل" },
          { id: "settings" as Tab, icon: <Settings className="w-4 h-4" />, label: "الإعدادات" },
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
              />
            )}
            {activeOrder && (
              <ActiveOrderCard
                order={activeOrder}
                onStartDelivery={() => startDelivery.mutate({ orderId: activeOrder.orderId, providerId: id, pinHash: pinHash! })}
                onDeliver={() => deliverOrder.mutate({ orderId: activeOrder.orderId, providerId: id, pinHash: pinHash! })}
                starting={startDelivery.isPending}
                delivering={deliverOrder.isPending}
              />
            )}
            {!incoming && !activeOrder && (
              <div
                className="rounded-3xl p-8 text-center"
                style={{ background: "oklch(0.13 0 0)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <Flame className="w-8 h-8 text-white/15" />
                </div>
                <p className="text-white/70 font-semibold mb-1">
                  {provider.isAvailable ? "في انتظار الطلبات…" : "أنت غير متاح حالياً"}
                </p>
                <p className="text-white/30 text-sm">
                  {provider.isAvailable
                    ? "ستظهر الطلبات الجديدة هنا تلقائياً."
                    : "فعّل التوافر لبدء استقبال الطلبات."}
                </p>
                {!provider.isAvailable && (
                  <button
                    onClick={() => toggleAvailability.mutate({ providerId: id, pinHash: pinHash! })}
                    disabled={toggleAvailability.isPending}
                    className="mt-4 px-5 py-2.5 rounded-2xl text-sm font-bold text-white"
                    style={{ background: "oklch(0.62 0.22 27)" }}
                  >
                    تفعيل التوافر
                  </button>
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
                    <span className="text-white font-bold text-sm">التقييمات</span>
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

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div className="p-4">
            {!history ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
              </div>
            ) : history.length === 0 ? (
              <div
                className="rounded-3xl p-8 text-center"
                style={{ background: "oklch(0.13 0 0)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <History className="w-10 h-10 text-white/15 mx-auto mb-3" />
                <p className="text-white/40 text-sm">لا توجد طلبات بعد</p>
              </div>
            ) : (
              <div
                className="rounded-3xl overflow-hidden"
                style={{ background: "oklch(0.13 0 0)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {history.map((item, i) => (
                  <div
                    key={item?.orderId}
                    className="flex items-center gap-3 px-4 py-3.5"
                    style={{ borderBottom: i < history.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                      <Package className="w-4 h-4 text-white/30" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold">طلب #{item?.orderId}</p>
                      <p className="text-white/40 text-xs truncate">{(item as any)?.customerAddress || "—"}</p>
                    </div>
                    <div className="text-left shrink-0 space-y-1">
                      <p className="text-orange-300 text-sm font-bold text-right">
                        OMR {parseFloat(item?.totalPrice ?? "0").toFixed(3)}
                      </p>
                      <StatusBadge status={item?.status ?? ""} />
                    </div>
                  </div>
                ))}
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
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wide">معلومات الحساب</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-orange-400 shrink-0" />
                  <div>
                    <p className="text-white/40 text-xs">الاسم</p>
                    <p className="text-white text-sm font-semibold">{provider.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-orange-400 shrink-0" />
                  <div>
                    <p className="text-white/40 text-xs">الهاتف</p>
                    <p className="text-white text-sm font-semibold" dir="ltr">{provider.phone}</p>
                  </div>
                </div>
                {provider.email && (
                  <div className="flex items-center gap-3">
                    <Navigation className="w-4 h-4 text-orange-400 shrink-0" />
                    <div>
                      <p className="text-white/40 text-xs">البريد الإلكتروني</p>
                      <p className="text-white text-sm font-semibold" dir="ltr">{provider.email}</p>
                    </div>
                  </div>
                )}
              </div>
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
                      {pushSubscribed ? "الإشعارات مفعّلة" : "الإشعارات معطّلة"}
                    </p>
                    <p className="text-white/40 text-xs">
                      {pushSubscribed ? "ستصلك إشعارات الطلبات الجديدة" : "فعّل لتلقي إشعارات فورية"}
                    </p>
                  </div>
                </div>
                {!pushSubscribed && (
                  <button
                    onClick={subscribeToPush}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl"
                    style={{ background: "oklch(0.62 0.22 27 / 0.2)", color: "oklch(0.75 0.22 27)" }}
                  >
                    تفعيل
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
                <p className="text-white font-bold text-sm">ساعات العمل</p>
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
                <span className="text-red-400 font-semibold text-sm">تسجيل الخروج</span>
              </div>
              <ChevronRight className="w-4 h-4 text-red-400/40" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
