/**
 * ProviderRegister — انضم كمزوّد غاز
 *
 * Multi-step self-registration form:
 *   Step 1: Personal info (name, phone, email)
 *   Step 2: Zone + vehicle info
 *   Step 3: Create PIN
 *   Step 4: Submitted → redirect to onboarding status page
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  User,
  Phone,
  Mail,
  Car,
  MapPin,
  Lock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

// ── SHA-256 helper (browser native) ──────────────────────────────────────────
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Step indicator ────────────────────────────────────────────────────────────
const STEPS = ["المعلومات الشخصية", "المنطقة والمركبة", "الرمز السري", "تم الإرسال"];

function StepDot({ idx, current }: { idx: number; current: number }) {
  const done = idx < current;
  const active = idx === current;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
          done
            ? "bg-orange-500 text-white"
            : active
            ? "bg-orange-500/20 border-2 border-orange-500 text-orange-400"
            : "bg-white/5 border border-white/15 text-white/30"
        }`}
      >
        {done ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
      </div>
      <span
        className={`text-[9px] text-center leading-tight max-w-[52px] ${
          active ? "text-orange-400" : done ? "text-white/60" : "text-white/25"
        }`}
      >
        {STEPS[idx]}
      </span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ProviderRegister() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);

  // Step 1 fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Step 2 fields
  const [zoneId, setZoneId] = useState<number | null>(null);
  const [vehicleType, setVehicleType] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [nationalId, setNationalId] = useState("");

  // Step 3 fields
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");

  // Result
  const [providerId, setProviderId] = useState<number | null>(null);

  const { data: zones } = trpc.locations.listZones.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const registerMutation = trpc.providers.register.useMutation({
    onSuccess: (data) => {
      setProviderId(data.providerId);
      setStep(3);
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء التسجيل. حاول مرة أخرى.");
    },
  });

  // ── Validation per step ────────────────────────────────────────────────────
  const canProceedStep0 = name.trim().length >= 2 && phone.trim().length >= 8;
  const canProceedStep1 = zoneId !== null;
  const canProceedStep2 =
    pin.length >= 4 && pin === pinConfirm;

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const handleSubmit = async () => {
    if (!canProceedStep2) return;
    const pinHash = await sha256(pin);
    registerMutation.mutate({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      zoneId: zoneId!,
      pinHash,
      vehicleType: vehicleType.trim() || undefined,
      vehiclePlate: vehiclePlate.trim() || undefined,
      nationalId: nationalId.trim() || undefined,
    });
  };

  const goToStatus = () => {
    // Store phone + pin for the status page
    sessionStorage.setItem("providerRegPhone", phone.trim());
    sessionStorage.setItem("providerRegPin", pin);
    navigate(`/provider/onboarding/${providerId}`);
  };

  // ── Shared card wrapper ────────────────────────────────────────────────────
  const Card = ({ children }: { children: React.ReactNode }) => (
    <div
      className="rounded-2xl p-5 mb-4"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {children}
    </div>
  );

  const Field = ({
    icon,
    label,
    children,
  }: {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
  }) => (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-orange-400">{icon}</span>
        <label className="text-white/60 text-xs">{label}</label>
      </div>
      {children}
    </div>
  );

  const inputClass =
    "bg-black/30 border-white/15 text-white placeholder:text-white/30 focus-visible:border-orange-400/50 focus-visible:ring-orange-400/20 h-11 rounded-xl text-sm";

  return (
    <div className="mobile-screen" style={{ background: "oklch(0.09 0 0)" }} dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        {step > 0 && step < 3 ? (
          <button
            onClick={handleBack}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        ) : (
          <button
            onClick={() => navigate("/")}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        )}
        <div className="flex-1">
          <p className="text-white font-bold text-base">انضم كمزوّد غاز</p>
          <p className="text-white/40 text-xs">سجّل بياناتك وابدأ الاستلام خلال 24 ساعة</p>
        </div>
        <Flame className="w-6 h-6 text-orange-500" />
      </div>

      {/* Step indicator */}
      {step < 3 && (
        <div className="flex items-start justify-between px-6 pb-5">
          {STEPS.slice(0, 3).map((_, idx) => (
            <StepDot key={idx} idx={idx} current={step} />
          ))}
        </div>
      )}

      <div className="px-4 pb-8">
        {/* ── Step 0: Personal info ── */}
        {step === 0 && (
          <>
            <Card>
              <Field icon={<User className="w-4 h-4" />} label="الاسم الكامل *">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أحمد بن سالم"
                  className={inputClass}
                />
              </Field>
              <Field icon={<Phone className="w-4 h-4" />} label="رقم الهاتف (عُمان) *">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+968 9X XXX XXXX"
                  type="tel"
                  className={inputClass}
                />
              </Field>
              <Field icon={<Mail className="w-4 h-4" />} label="البريد الإلكتروني (اختياري)">
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@mail.com"
                  type="email"
                  className={inputClass}
                />
              </Field>
            </Card>
            <Button
              size="lg"
              className="w-full rounded-2xl font-bold text-base h-14"
              style={{ background: canProceedStep0 ? "oklch(0.53 0.22 27)" : undefined }}
              disabled={!canProceedStep0}
              onClick={handleNext}
            >
              التالي
              <ChevronLeft className="w-5 h-5 mr-2" />
            </Button>
          </>
        )}

        {/* ── Step 1: Zone + vehicle ── */}
        {step === 1 && (
          <>
            <Card>
              <Field icon={<MapPin className="w-4 h-4" />} label="منطقة التوصيل *">
                <div className="grid grid-cols-1 gap-2">
                  {zones?.map((zone) => (
                    <button
                      key={zone.id}
                      onClick={() => setZoneId(zone.id)}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-right transition-all border ${
                        zoneId === zone.id
                          ? "border-orange-500 bg-orange-500/15 text-orange-300"
                          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          zoneId === zone.id ? "bg-orange-500" : "bg-white/20"
                        }`}
                      />
                      {zone.name}
                    </button>
                  ))}
                  {!zones && (
                    <div className="text-white/40 text-sm text-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                      جاري تحميل المناطق...
                    </div>
                  )}
                </div>
              </Field>
            </Card>
            <Card>
              <Field icon={<Car className="w-4 h-4" />} label="نوع المركبة (اختياري)">
                <Input
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  placeholder="مثال: تويوتا هايلوكس"
                  className={inputClass}
                />
              </Field>
              <Field icon={<Car className="w-4 h-4" />} label="رقم لوحة المركبة (اختياري)">
                <Input
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  placeholder="مثال: ع أ ب 1234"
                  className={inputClass}
                />
              </Field>
              <Field icon={<User className="w-4 h-4" />} label="رقم الهوية الوطنية (اختياري)">
                <Input
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="رقم الهوية أو جواز السفر"
                  className={inputClass}
                />
              </Field>
            </Card>
            <Button
              size="lg"
              className="w-full rounded-2xl font-bold text-base h-14"
              style={{ background: canProceedStep1 ? "oklch(0.53 0.22 27)" : undefined }}
              disabled={!canProceedStep1}
              onClick={handleNext}
            >
              التالي
              <ChevronLeft className="w-5 h-5 mr-2" />
            </Button>
          </>
        )}

        {/* ── Step 2: PIN ── */}
        {step === 2 && (
          <>
            <Card>
              <p className="text-white/50 text-xs mb-4 leading-relaxed">
                اختر رمزاً سرياً من 4 أرقام أو أكثر. ستستخدمه لتسجيل الدخول لاحقاً بعد الموافقة على طلبك.
              </p>
              <Field icon={<Lock className="w-4 h-4" />} label="الرمز السري *">
                <Input
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="أدخل 4-8 أرقام"
                  type="password"
                  inputMode="numeric"
                  className={inputClass}
                />
              </Field>
              <Field icon={<Lock className="w-4 h-4" />} label="تأكيد الرمز السري *">
                <Input
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="أعد إدخال الرمز"
                  type="password"
                  inputMode="numeric"
                  className={inputClass}
                />
              </Field>
              {pin.length >= 4 && pinConfirm.length >= 4 && pin !== pinConfirm && (
                <p className="text-red-400 text-xs mt-1">الرمزان غير متطابقَين</p>
              )}
            </Card>

            {/* Summary */}
            <div
              className="rounded-2xl p-4 mb-4 text-xs text-white/50 leading-relaxed"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p className="text-white/70 font-semibold mb-2 text-sm">ملخص طلبك</p>
              <p>الاسم: <span className="text-white/80">{name}</span></p>
              <p>الهاتف: <span className="text-white/80">{phone}</span></p>
              <p>المنطقة: <span className="text-white/80">{zones?.find((z) => z.id === zoneId)?.name ?? zoneId}</span></p>
              {vehicleType && <p>المركبة: <span className="text-white/80">{vehicleType}</span></p>}
              {vehiclePlate && <p>اللوحة: <span className="text-white/80">{vehiclePlate}</span></p>}
            </div>

            <Button
              size="lg"
              className="w-full rounded-2xl font-bold text-base h-14"
              style={{ background: canProceedStep2 ? "oklch(0.53 0.22 27)" : undefined }}
              disabled={!canProceedStep2 || registerMutation.isPending}
              onClick={handleSubmit}
            >
              {registerMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin ml-2" />
              ) : (
                <CheckCircle2 className="w-5 h-5 ml-2" />
              )}
              إرسال الطلب
            </Button>
          </>
        )}

        {/* ── Step 3: Success ── */}
        {step === 3 && (
          <div className="flex flex-col items-center text-center pt-8 gap-5">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "rgba(249,115,22,0.15)", border: "2px solid rgba(249,115,22,0.4)" }}
            >
              <CheckCircle2 className="w-10 h-10 text-orange-400" />
            </div>
            <div>
              <p className="text-white font-extrabold text-xl mb-2">تم إرسال طلبك!</p>
              <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto">
                سيتم مراجعة طلبك من قِبل الفريق خلال 24 ساعة. ستتلقى إشعاراً عند الموافقة.
              </p>
            </div>

            <div
              className="w-full rounded-2xl p-4 text-sm text-right"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <p className="text-white/50 text-xs mb-3 text-center">خطوات ما بعد التسجيل</p>
              {[
                { label: "تم استلام طلبك", done: true },
                { label: "مراجعة البيانات من الفريق", done: false },
                { label: "الموافقة وتفعيل حسابك", done: false },
                { label: "ابدأ استلام الطلبات", done: false },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      item.done ? "bg-orange-500 text-white" : "bg-white/10 text-white/30"
                    }`}
                  >
                    {item.done ? "✓" : i + 1}
                  </div>
                  <span className={item.done ? "text-white/80" : "text-white/40"}>{item.label}</span>
                </div>
              ))}
            </div>

            <Button
              size="lg"
              className="w-full rounded-2xl font-bold text-base h-14"
              style={{ background: "oklch(0.53 0.22 27)" }}
              onClick={goToStatus}
            >
              تتبع حالة طلبي
            </Button>
            <button
              onClick={() => navigate("/")}
              className="text-white/40 text-sm hover:text-white/60 transition-colors"
            >
              العودة للصفحة الرئيسية
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
