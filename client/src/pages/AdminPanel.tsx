/**
 * AdminPanel — PIN-protected order management dashboard.
 * Access: /admin
 * PIN: env ADMIN_PIN (default "1234")
 */
import { useState } from "react";
import {
  ShieldCheck, Lock, Loader2, RefreshCw, XCircle, CheckCircle2,
  Package, TrendingUp, Clock, Ban, ChevronDown, ChevronUp,
  Phone, MapPin, CreditCard, Star, MessageSquare, Users, Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { ORDER_STATUS_LABELS, type OrderStatus } from "../../../shared/domain";

export default function AdminPanel() {
  const { t, dir, lang } = useLanguage();
  const [pin, setPin] = useState("");
  const [enteredPin, setEnteredPin] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"orders" | "reviews" | "customers">("orders");
  const [newOffer, setNewOffer] = useState({ title: "", titleAr: "", discountType: "percentage" as "percentage" | "fixed" | "free_delivery", discountValue: 0, minTier: "bronze" as "bronze" | "silver" | "gold" | "platinum", pointsCost: 0 });

  const utils = trpc.useUtils();

  const STATUS_FILTER_OPTIONS = [
    { value: "", label: lang === "en" ? "All" : "الكل" },
    { value: "pending", label: lang === "en" ? "Pending" : "معلق" },
    { value: "assigned", label: lang === "en" ? "Assigned" : "مُسنَد" },
    { value: "accepted", label: lang === "en" ? "Accepted" : "مقبول" },
    { value: "out_for_delivery", label: lang === "en" ? "On the Way" : "في الطريق" },
    { value: "delivered", label: lang === "en" ? "Delivered" : "مُسلَّم" },
    { value: "cancelled", label: lang === "en" ? "Cancelled" : "ملغي" },
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

  const PAYMENT_LABELS: Record<string, string> = lang === "en"
    ? { cash: "Cash", bank_transfer: "Transfer", online: "Online" }
    : { cash: "نقداً", bank_transfer: "تحويل", online: "أونلاين" };

  const ORDER_STATUS_LABELS_LOCALIZED: Record<string, string> = lang === "en"
    ? {
        draft: "Draft", pending: "Pending", assigned: "Assigned",
        accepted: "Accepted", out_for_delivery: "On the Way",
        delivered: "Delivered", cancelled: "Cancelled",
      }
    : ORDER_STATUS_LABELS;

  const TIER_LABELS: Record<string, string> = {
    bronze: t("admin.tier.bronze"),
    silver: t("admin.tier.silver"),
    gold: t("admin.tier.gold"),
    platinum: t("admin.tier.platinum"),
  };

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

  const customerStats = trpc.customers.adminGetStats.useQuery(
    undefined,
    { enabled: !!enteredPin && activeTab === "customers", retry: false }
  );

  const offersQuery = trpc.customers.adminListOffers.useQuery(
    undefined,
    { enabled: !!enteredPin && activeTab === "customers", retry: false }
  );

  const createOffer = trpc.customers.adminCreateOffer.useMutation({
    onSuccess: () => { toast.success(t("admin.offers.created")); offersQuery.refetch(); setNewOffer({ title: "", titleAr: "", discountType: "percentage", discountValue: 0, minTier: "bronze", pointsCost: 0 }); },
    onError: (e) => toast.error(e.message),
  });

  const toggleOffer = trpc.customers.adminToggleOffer.useMutation({
    onSuccess: () => offersQuery.refetch(),
  });

  const cancelOrder = trpc.orders.adminCancelOrder.useMutation({
    onSuccess: () => {
      toast.success(t("admin.order.cancelled"));
      utils.orders.adminListOrders.invalidate();
      utils.orders.adminStats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const markDelivered = trpc.orders.adminMarkDelivered.useMutation({
    onSuccess: () => {
      toast.success(t("admin.order.delivered"));
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
      <div className="mobile-screen bg-gray-50 items-center justify-center px-6" dir={dir}>
        {/* Top bar: back + language */}
        <div className="absolute top-4 inset-x-0 flex items-center justify-between px-4">
          <LanguageSwitcher />
          <Link href="/">
            <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
              <Home className="w-4 h-4" />
              <span>{t("admin.home")}</span>
            </button>
          </Link>
        </div>
        <div className="flex flex-col items-center mb-8">
          <img
            src="/manus-storage/logo-orange-on-black_bcf6e388.png"
            alt={t("app.name")}
            className="h-20 w-auto object-contain mb-4"
          />
          <h1 className="text-2xl font-extrabold text-gray-900">{t("admin.title")}</h1>
          <p className="text-sm text-gray-400 mt-1">{t("admin.pin.prompt")}</p>
          {isUnauthorized && (
            <p className="text-sm text-red-500 mt-2 font-medium">{t("admin.pin.invalid")}</p>
          )}
        </div>

        <form onSubmit={handlePinSubmit} className="w-full space-y-4">
          <div className="bg-white rounded-3xl shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-gray-400" />
              <p className="text-sm font-semibold text-gray-700">{t("admin.pin.label")}</p>
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
            {t("admin.pin.enter")}
          </Button>
        </form>
      </div>
    );
  }

  const loading = stats.isLoading || ordersQuery.isLoading;
  const s = stats.data;
  const ordersList = ordersQuery.data?.orders ?? [];

  return (
    <div className="mobile-screen bg-gray-50" dir={dir}>
      {/* Header */}
      <div
        className="px-5 pt-12 pb-5 text-white"
        style={{ background: "linear-gradient(135deg, oklch(0.09 0 0), oklch(0.2 0 0))" }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <img
              src="/manus-storage/logo-orange-nobg_dc89f071.png"
              alt={t("app.name")}
              className="h-8 w-auto object-contain"
            />
            <h1 className="text-lg font-extrabold leading-tight">{t("admin.title")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
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
        </div>
        <p className="text-xs text-white/40">{t("admin.auto.refresh")}</p>
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
          {t("admin.tab.orders")}
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
          {t("admin.tab.reviews")}
        </button>
        <button
          onClick={() => setActiveTab("customers")}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "customers"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-gray-400"
          }`}
        >
          <Users className="w-4 h-4" />
          {t("admin.tab.customers")}
        </button>
        <Link href="/admin/providers">
          <button
            className="flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 border-transparent text-gray-400 hover:text-orange-500 transition-colors"
          >
            <Users className="w-4 h-4" />
            {t("admin.tab.providers")}
          </button>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {activeTab === "customers" ? (
          <div className="space-y-4">
            {customerStats.isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>
            ) : (
              <>
                {/* Stats overview */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
                    <p className="text-2xl font-extrabold text-gray-900">{customerStats.data?.totalCustomers ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t("admin.customers.total")}</p>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
                    <p className="text-2xl font-extrabold text-green-600">{customerStats.data?.rewardedReferrals ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t("admin.customers.referrals.rewarded")}</p>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
                    <p className="text-2xl font-extrabold text-orange-500">{customerStats.data?.totalReferrals ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t("admin.customers.referrals.total")}</p>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
                    <p className="text-2xl font-extrabold text-violet-600">
                      {customerStats.data?.byType?.find(tp => tp.customerType === "restaurant")?.cnt ?? 0}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{t("admin.customers.restaurants")}</p>
                  </div>
                </div>

                {/* Tier breakdown */}
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <p className="text-sm font-bold text-gray-700 mb-3">{t("admin.customers.tiers")}</p>
                  {(["platinum", "gold", "silver", "bronze"] as const).map((tier) => {
                    const tierColors = { bronze: "#CD7F32", silver: "#9CA3AF", gold: "#F59E0B", platinum: "#6366F1" };
                    const cnt = customerStats.data?.byTier?.find(tp => tp.tier === tier)?.cnt ?? 0;
                    const total = customerStats.data?.totalCustomers ?? 1;
                    return (
                      <div key={tier} className="flex items-center gap-3 mb-2">
                        <span className="text-xs w-16 text-gray-500">{TIER_LABELS[tier]}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.round((cnt / total) * 100)}%`, background: tierColors[tier] }} />
                        </div>
                        <span className="text-xs text-gray-500 w-6 text-end">{cnt}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Top customers */}
                {(customerStats.data?.topCustomers ?? []).length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm p-4">
                    <p className="text-sm font-bold text-gray-700 mb-3">{t("admin.customers.top")}</p>
                    <div className="space-y-2">
                      {customerStats.data!.topCustomers.map((c, i) => (
                        <div key={c.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                            <div>
                              <p className="text-xs font-semibold text-gray-800">{c.name ?? c.phone}</p>
                              <p className="text-xs text-gray-400">{c.totalOrders} {t("admin.customers.orders.count")} · {c.points} {lang === "en" ? "pts" : "نقطة"}</p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-orange-500">OMR {parseFloat(String(c.totalSpent)).toFixed(3)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Revenue by zone */}
                {(customerStats.data?.revenueByZone ?? []).length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm p-4">
                    <p className="text-sm font-bold text-gray-700 mb-3">{t("admin.customers.revenue.zone")}</p>
                    <div className="space-y-2">
                      {customerStats.data!.revenueByZone.map((z) => (
                        <div key={z.zoneId} className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">{t("admin.customers.zone")} #{z.zoneId}</span>
                          <div className="text-end">
                            <p className="text-xs font-bold text-orange-500">OMR {parseFloat(String(z.revenue ?? 0)).toFixed(3)}</p>
                            <p className="text-xs text-gray-400">{z.orderCount} {t("admin.customers.orders.count")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Offers management */}
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <p className="text-sm font-bold text-gray-700 mb-3">{t("admin.offers.title")}</p>
                  {/* Create offer form */}
                  <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded-xl">
                    <input value={newOffer.title} onChange={e => setNewOffer(p => ({...p, title: e.target.value}))} placeholder="Title (EN)" className="w-full border rounded-lg px-3 py-2 text-xs" />
                    <input value={newOffer.titleAr} onChange={e => setNewOffer(p => ({...p, titleAr: e.target.value}))} placeholder="العنوان (AR)" className="w-full border rounded-lg px-3 py-2 text-xs" />
                    <div className="flex gap-2">
                      <select value={newOffer.discountType} onChange={e => setNewOffer(p => ({...p, discountType: e.target.value as "percentage" | "fixed" | "free_delivery"}))} className="flex-1 border rounded-lg px-2 py-2 text-xs">
                        <option value="percentage">{lang === "en" ? "Percentage %" : "نسبة %"}</option>
                        <option value="fixed">{lang === "en" ? "Fixed OMR" : "ثابت OMR"}</option>
                        <option value="free_delivery">{t("admin.offers.free.delivery")}</option>
                      </select>
                      <input type="number" value={newOffer.discountValue} onChange={e => setNewOffer(p => ({...p, discountValue: parseFloat(e.target.value) || 0}))} placeholder={lang === "en" ? "Value" : "القيمة"} className="w-20 border rounded-lg px-2 py-2 text-xs" />
                    </div>
                    <div className="flex gap-2">
                      <select value={newOffer.minTier} onChange={e => setNewOffer(p => ({...p, minTier: e.target.value as "bronze" | "silver" | "gold" | "platinum"}))} className="flex-1 border rounded-lg px-2 py-2 text-xs">
                        <option value="bronze">{t("admin.tier.bronze.plus")}</option>
                        <option value="silver">{t("admin.tier.silver.plus")}</option>
                        <option value="gold">{t("admin.tier.gold.plus")}</option>
                        <option value="platinum">{t("admin.tier.platinum")}</option>
                      </select>
                      <input type="number" value={newOffer.pointsCost} onChange={e => setNewOffer(p => ({...p, pointsCost: parseInt(e.target.value) || 0}))} placeholder={lang === "en" ? "Points" : "نقاط"} className="w-20 border rounded-lg px-2 py-2 text-xs" />
                    </div>
                    <button
                      onClick={() => createOffer.mutate(newOffer)}
                      disabled={!newOffer.title || !newOffer.titleAr || createOffer.isPending}
                      className="w-full py-2 rounded-lg text-xs font-bold text-white bg-orange-500 disabled:opacity-50"
                    >
                      {createOffer.isPending ? t("admin.offers.creating") : t("admin.offers.create")}
                    </button>
                  </div>
                  {/* Offers list */}
                  <div className="space-y-2">
                    {(offersQuery.data ?? []).map(offer => (
                      <div key={offer.id} className="flex items-center justify-between p-2 border rounded-xl">
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{lang === "en" ? offer.title : offer.titleAr}</p>
                          <p className="text-xs text-gray-400">{offer.discountType === "percentage" ? `${offer.discountValue}%` : offer.discountType === "fixed" ? `OMR ${offer.discountValue}` : t("admin.offers.free.delivery")}</p>
                        </div>
                        <button
                          onClick={() => toggleOffer.mutate({ offerId: offer.id, isActive: !offer.isActive })}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg ${offer.isActive ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}
                        >
                          {offer.isActive ? t("admin.offers.active") : t("admin.offers.inactive")}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : activeTab === "reviews" ? (
          <>
            {reviewsQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              </div>
            ) : !reviewsQuery.data || reviewsQuery.data.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <Star className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">{t("admin.reviews.empty")}</p>
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
                        <p className="text-xs text-gray-400">{all.length} {t("admin.reviews.total")}</p>
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
                      <div className="text-end">
                        <p className="text-xs text-gray-400">
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString(lang === "en" ? "en-GB" : "ar-OM") : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {t("admin.reviews.order")} #{r.orderId}
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
                  { icon: Package, label: t("admin.stats.total"), value: s.total, color: "text-gray-700" },
                  { icon: CheckCircle2, label: t("admin.stats.delivered"), value: s.delivered, color: "text-emerald-600" },
                  { icon: Clock, label: t("admin.stats.active"), value: s.pending, color: "text-violet-600" },
                  { icon: Ban, label: t("admin.stats.cancelled"), value: s.cancelled, color: "text-red-500" },
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
                  <p className="text-xs text-gray-400">{t("admin.stats.revenue")}</p>
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
                  <p className="text-sm text-gray-400">{t("admin.orders.empty")}</p>
                </div>
              ) : (
                ordersList.map((order) => {
                  const isExpanded = expandedId === order.id;
                  const statusLabel =
                    ORDER_STATUS_LABELS_LOCALIZED[order.status as OrderStatus] ?? order.status;
                  const statusClass = STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-500";
                  const canCancel = !["delivered", "cancelled"].includes(order.status);
                  const canDeliver = !["delivered", "cancelled", "draft"].includes(order.status);

                  return (
                    <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      {/* Row header */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-start"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-bold text-gray-800">#{order.id}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 truncate">
                            {order.deliveryAddress || order.customerAddress || t("admin.orders.no.address")}
                          </p>
                        </div>
                        <div className="text-end shrink-0">
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
                                ? new Date(order.createdAt).toLocaleString(lang === "en" ? "en-GB" : "ar-OM")
                                : "—"}
                            </div>
                            {order.customerPhone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3 h-3" />
                                {order.customerPhone}
                              </div>
                            )}
                            {(order.deliveryAddress || order.customerAddress) && (
                              <div className="flex items-center gap-1.5 col-span-2">
                                <MapPin className="w-3 h-3" />
                                {order.deliveryAddress || order.customerAddress}
                              </div>
                            )}
                            {order.customerName && (
                              <div className="flex items-center gap-1.5 col-span-2">
                                <Users className="w-3 h-3" />
                                {order.customerName}
                              </div>
                            )}
                            {order.gasAmount && (
                              <div className="flex items-center gap-1.5">
                                <Package className="w-3 h-3" />
                                {order.gasAmount} {t("admin.orders.cylinder")}
                              </div>
                            )}
                            {order.estimatedMinutes && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                {order.estimatedMinutes} {t("admin.orders.minute")}
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <CreditCard className="w-3 h-3" />
                              {order.paymentStatus ?? "—"}
                            </div>
                            {order.assignedProviderId && (
                              <div className="flex items-center gap-1.5">
                                <Package className="w-3 h-3" />
                                {t("admin.orders.provider")} #{order.assignedProviderId}
                              </div>
                            )}
                            {/* SMS notification status */}
                            {order.customerPhone && (
                              <div className="flex items-center gap-1.5">
                                <MessageSquare className="w-3 h-3" />
                                {order.smsDeliveredAt ? (
                                  <span className="text-emerald-600">{t("admin.orders.sms.delivered")}</span>
                                ) : order.smsDeliveryStartedAt ? (
                                  <span className="text-blue-600">{t("admin.orders.sms.started")}</span>
                                ) : (
                                  <span className="text-gray-400">{t("admin.orders.sms.not.sent")}</span>
                                )}
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
                                {t("admin.orders.confirm.delivery")}
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
                                {t("admin.orders.cancel")}
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
