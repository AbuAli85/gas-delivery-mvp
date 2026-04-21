/**
 * AdminPanel — PIN-protected order management dashboard.
 * Access: /admin
 * PIN: env ADMIN_PIN (default "1234")
 */
import { useState } from "react";
import {
  ShieldCheck, Lock, Loader2, RefreshCw, XCircle, CheckCircle2,
  Package, TrendingUp, Clock, Ban, ChevronDown, ChevronUp,
  Phone, MapPin, CreditCard, Star, MessageSquare, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";
import { ORDER_STATUS_LABELS, type OrderStatus } from "../../../shared/domain";

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "الكل" },
  { value: "pending", label: "معلق" },
  { value: "assigned", label: "مُسنَد" },
  { value: "accepted", label: "مقبول" },
  { value: "out_for_delivery", label: "في الطريق" },
  { value: "delivered", label: "مُسلَّم" },
  { value: "cancelled", label: "ملغي" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  pending: "bg-yellow-100 text-yellow-700",
  assigned: "bg-blue-100 text-blue-700",
  accepted: "bg-indigo-100 text-indigo-700",
  out_for_delivery: "bg-violet-100 text-violet-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "نقداً",
  bank_transfer: "تحويل",
  online: "أونلاين",
};

export default function AdminPanel() {
  const [pin, setPin] = useState("");
  const [enteredPin, setEnteredPin] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"orders" | "reviews">("orders");

  const utils = trpc.useUtils();

  const stats = trpc.orders.adminStats.useQuery(
    { adminPin: enteredPin ?? "" },
    { enabled: !!enteredPin, retry: false }
  );

  const ordersQuery = trpc.orders.adminListOrders.useQuery(
    { adminPin: enteredPin ?? "", status: statusFilter || undefined, limit: 100 },
    { enabled: !!enteredPin, retry: false, refetchInterval: 15000 }
  );

  const reviewsQuery = trpc.reviews.getAllReviews.useQuery(
    undefined,
    { enabled: !!enteredPin && activeTab === "reviews", retry: false }
  );

  const cancelOrder = trpc.orders.adminCancelOrder.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء الطلب");
      utils.orders.adminListOrders.invalidate();
      utils.orders.adminStats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const markDelivered = trpc.orders.adminMarkDelivered.useMutation({
    onSuccess: () => {
      toast.success("تم تأكيد التسليم");
      utils.orders.adminListOrders.invalidate();
      utils.orders.adminStats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length < 4) return;
    setEnteredPin(pin);
  }

  const isUnauthorized =
    stats.error?.data?.code === "UNAUTHORIZED" ||
    ordersQuery.error?.data?.code === "UNAUTHORIZED";

  if (!enteredPin || isUnauthorized) {
    return (
      <div className="mobile-screen bg-gray-50 items-center justify-center px-6">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-gray-900 flex items-center justify-center mb-4 shadow-lg">
            <ShieldCheck className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">لوحة الإدارة</h1>
          <p className="text-sm text-gray-400 mt-1">أدخل رمز المشرف للمتابعة</p>
          {isUnauthorized && (
            <p className="text-sm text-red-500 mt-2 font-medium">رمز غير صحيح. حاول مجدداً.</p>
          )}
        </div>

        <form onSubmit={handlePinSubmit} className="w-full space-y-4">
          <div className="bg-white rounded-3xl shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-gray-400" />
              <p className="text-sm font-semibold text-gray-700">رمز المشرف</p>
            </div>
            <input
              type="password"
              inputMode="numeric"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-xl font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={pin.length < 4}
            className="w-full rounded-2xl font-extrabold text-base h-14"
            style={{ background: "oklch(0.53 0.22 27)" }}
          >
            دخول
          </Button>
        </form>
      </div>
    );
  }

  const loading = stats.isLoading || ordersQuery.isLoading;
  const s = stats.data;
  const ordersList = ordersQuery.data?.orders ?? [];

  return (
    <div className="mobile-screen bg-gray-50">
      {/* Header */}
      <div
        className="px-5 pt-12 pb-5 text-white"
        style={{ background: "linear-gradient(135deg, oklch(0.09 0 0), oklch(0.2 0 0))" }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-orange-400" />
            <h1 className="text-lg font-extrabold">لوحة الإدارة</h1>
          </div>
          <button
            onClick={() => {
              utils.orders.adminListOrders.invalidate();
              utils.orders.adminStats.invalidate();
            }}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-white/40">تحديث تلقائي كل 15 ثانية</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-0 border-b border-gray-200 bg-white px-4">
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "orders"
              ? "border-primary text-primary"
              : "border-transparent text-gray-400"
          }`}
        >
          <Package className="w-4 h-4" />
          الطلبات
        </button>
        <button
          onClick={() => setActiveTab("reviews")}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "reviews"
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-gray-400"
          }`}
        >
          <Star className="w-4 h-4" />
          التقييمات
        </button>
        <Link href="/admin/providers">
          <button
            className="flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 border-transparent text-gray-400 hover:text-orange-500 transition-colors"
          >
            <Users className="w-4 h-4" />
            المزودون
          </button>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {activeTab === "reviews" ? (
          <>
            {reviewsQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              </div>
            ) : !reviewsQuery.data || reviewsQuery.data.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <Star className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">لا توجد تقييمات بعد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Summary card */}
                {(() => {
                  const all = reviewsQuery.data;
                  const avg = all.length > 0
                    ? (all.reduce((s, r) => s + r.rating, 0) / all.length).toFixed(1)
                    : "0.0";
                  return (
                    <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                        <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-gray-900">{avg} <span className="text-amber-400">★</span></p>
                        <p className="text-xs text-gray-400">{all.length} تقييم إجمالي</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Reviews list */}
                {reviewsQuery.data.map((r) => (
                  <div key={r.id} className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${
                              s <= r.rating ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-gray-400">
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString("ar-OM") : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        طلب #{r.orderId}
                      </span>
                      {r.customerPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {r.customerPhone}
                        </span>
                      )}
                    </div>
                    {r.comment && (
                      <div className="bg-gray-50 rounded-xl px-3 py-2 flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-gray-600">{r.comment}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            {s && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Package, label: "إجمالي الطلبات", value: s.total, color: "text-gray-700" },
                  { icon: CheckCircle2, label: "مُسلَّمة", value: s.delivered, color: "text-emerald-600" },
                  { icon: Clock, label: "نشطة", value: s.pending, color: "text-violet-600" },
                  { icon: Ban, label: "ملغاة", value: s.cancelled, color: "text-red-500" },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="bg-white rounded-2xl shadow-sm p-4">
                    <Icon className={`w-4 h-4 ${color} mb-2`} />
                    <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Revenue */}
            {s && (
              <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-xs text-gray-400">إجمالي الإيرادات</p>
                  <p className="text-xl font-extrabold text-emerald-700">
                    OMR {s.revenue.toFixed(3)}
                  </p>
                </div>
              </div>
            )}

            {/* Status Filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    statusFilter === opt.value
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Orders List */}
            <div className="space-y-2">
              {ordersList.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                  <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">لا توجد طلبات</p>
                </div>
              ) : (
                ordersList.map((order) => {
                  const isExpanded = expandedId === order.id;
                  const statusLabel =
                    ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status;
                  const statusClass = STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-500";
                  const canCancel = !["delivered", "cancelled"].includes(order.status);
                  const canDeliver = !["delivered", "cancelled", "draft"].includes(order.status);

                  return (
                    <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      {/* Row header */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-right"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-bold text-gray-800">#{order.id}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 truncate">
                            {order.customerAddress ?? "لا يوجد عنوان"}
                          </p>
                        </div>
                        <div className="text-left shrink-0">
                          <p className="text-sm font-bold text-gray-800">
                            OMR {parseFloat(String(order.totalPrice ?? "0")).toFixed(3)}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {PAYMENT_LABELS[order.paymentMethod ?? ""] ?? order.paymentMethod}
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-300 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-300 shrink-0" />
                        )}
                      </button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              {order.createdAt
                                ? new Date(order.createdAt).toLocaleString("ar-OM")
                                : "—"}
                            </div>
                            {order.customerPhone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3 h-3" />
                                {order.customerPhone}
                              </div>
                            )}
                            {order.customerAddress && (
                              <div className="flex items-center gap-1.5 col-span-2">
                                <MapPin className="w-3 h-3" />
                                {order.customerAddress}
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <CreditCard className="w-3 h-3" />
                              {order.paymentStatus ?? "—"}
                            </div>
                            {order.assignedProviderId && (
                              <div className="flex items-center gap-1.5">
                                <Package className="w-3 h-3" />
                                مزود #{order.assignedProviderId}
                              </div>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="flex gap-2">
                            {canDeliver && (
                              <button
                                onClick={() =>
                                  markDelivered.mutate({ adminPin: enteredPin!, orderId: order.id })
                                }
                                disabled={markDelivered.isPending}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl py-2 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                تأكيد التسليم
                              </button>
                            )}
                            {canCancel && (
                              <button
                                onClick={() =>
                                  cancelOrder.mutate({ adminPin: enteredPin!, orderId: order.id })
                                }
                                disabled={cancelOrder.isPending}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 text-red-600 border border-red-200 rounded-xl py-2 text-xs font-semibold hover:bg-red-100 transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                إلغاء الطلب
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
