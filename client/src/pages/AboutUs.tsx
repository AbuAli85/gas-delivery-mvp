/**
 * AboutUs — صفحة "من نحن"
 * Introduces OWASEEL: story, vision, mission, values, stats, team, CTA.
 * Dark theme matching brand: black bg, orange accents, white text.
 */
import { useLocation } from "wouter";
import {
  Flame, Target, Eye, Heart, Zap, ShieldCheck,
  Users, MapPin, Star, ChevronRight, ArrowRight,
  Clock, Truck, Award, TrendingUp,
} from "lucide-react";

/* ── Stat card ─────────────────────────────────────────────────── */
function StatCard({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <div
      className="flex flex-col items-center gap-2 p-5 rounded-3xl"
      style={{
        background: "oklch(0.13 0 0)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: "oklch(0.71 0.18 54 / 0.15)", border: "1px solid oklch(0.71 0.18 54 / 0.3)" }}
      >
        {icon}
      </div>
      <p className="text-white font-black text-2xl leading-none">{value}</p>
      <p className="text-white/50 text-xs text-center leading-snug">{label}</p>
    </div>
  );
}

/* ── Value card ─────────────────────────────────────────────────── */
function ValueCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div
      className="rounded-3xl p-5 flex flex-col gap-3"
      style={{
        background: "linear-gradient(135deg, oklch(0.13 0 0) 0%, oklch(0.16 0.04 54) 100%)",
        border: "1px solid oklch(0.71 0.18 54 / 0.2)",
      }}
    >
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: "oklch(0.71 0.18 54 / 0.15)", border: "1px solid oklch(0.71 0.18 54 / 0.35)" }}
      >
        {icon}
      </div>
      <p className="text-white font-bold text-base leading-tight">{title}</p>
      <p className="text-white/55 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

/* ── Team member card ───────────────────────────────────────────── */
function TeamCard({ initials, name, role, color }: { initials: string; name: string; role: string; color: string }) {
  return (
    <div
      className="rounded-3xl p-5 flex flex-col items-center gap-3 text-center"
      style={{
        background: "oklch(0.13 0 0)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-white font-black text-xl"
        style={{ background: color }}
      >
        {initials}
      </div>
      <div>
        <p className="text-white font-bold text-sm">{name}</p>
        <p className="text-white/45 text-xs mt-0.5">{role}</p>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */
export default function AboutUs() {
  const [, navigate] = useLocation();

  return (
    <div
      className="mobile-screen overflow-y-auto"
      style={{ background: "oklch(0.09 0 0)" }}
      dir="rtl"
    >
      {/* ── Header ── */}
      <div
        className="relative px-5 pt-12 pb-10 overflow-hidden"
        style={{
          background: "linear-gradient(160deg, oklch(0.09 0 0) 0%, oklch(0.18 0.08 54) 60%, oklch(0.12 0.04 54) 100%)",
        }}
      >
        {/* Back button */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-white/60 text-sm mb-6 hover:text-white transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
          <span>الرئيسية</span>
        </button>

        {/* Brand mark */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: "oklch(0.71 0.18 54 / 0.2)",
              border: "2px solid oklch(0.71 0.18 54 / 0.5)",
              boxShadow: "0 0 24px oklch(0.71 0.18 54 / 0.3)",
            }}
          >
            <Flame className="w-7 h-7 text-orange-400" />
          </div>
          <div>
            <p className="text-orange-400 text-xs font-bold tracking-widest">OWASEEL</p>
            <p className="text-white font-black text-2xl leading-tight">أًوصّل</p>
          </div>
        </div>

        <h1 className="text-white font-black text-3xl leading-tight mb-3">
          من نحن
        </h1>
        <p className="text-white/60 text-base leading-relaxed">
          منصة توصيل أسطوانات الغاز الأولى في مسقط — سريعة، موثوقة، وبضغطة واحدة.
        </p>

        {/* Decorative glow */}
        <div
          className="absolute top-0 left-0 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, oklch(0.71 0.18 54 / 0.12) 0%, transparent 70%)",
            transform: "translate(-30%, -30%)",
          }}
        />
      </div>

      <div className="px-5 pb-10 flex flex-col gap-8">

        {/* ── Our Story ── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 rounded-full" style={{ background: "oklch(0.71 0.18 54)" }} />
            <h2 className="text-white font-black text-xl">قصتنا</h2>
          </div>
          <div
            className="rounded-3xl p-5"
            style={{
              background: "oklch(0.13 0 0)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <p className="text-white/70 text-sm leading-loose">
              وُلدت فكرة <span className="text-orange-400 font-bold">أًوصّل</span> من تجربة حقيقية — عائلة في مسقط نفد منها الغاز في منتصف الليل، ولم تجد طريقة سهلة للحصول عليه. من تلك اللحظة، قررنا بناء منصة تجعل توصيل الغاز بسيطاً كأي طلب يومي.
            </p>
            <p className="text-white/70 text-sm leading-loose mt-3">
              اليوم، نربط بين المزودين المعتمدين وآلاف الأسر في مسقط، مع ضمان التوصيل خلال ٣٠ دقيقة أو استرداد كامل للمبلغ.
            </p>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 rounded-full" style={{ background: "oklch(0.71 0.18 54)" }} />
            <h2 className="text-white font-black text-xl">بالأرقام</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard value="+٥٠٠" label="طلب مكتمل" icon={<Truck className="w-5 h-5 text-orange-400" />} />
            <StatCard value="٣٠ د" label="متوسط وقت التوصيل" icon={<Clock className="w-5 h-5 text-orange-400" />} />
            <StatCard value="٢٧" label="حيّاً في مسقط" icon={<MapPin className="w-5 h-5 text-orange-400" />} />
            <StatCard value="٤.٩★" label="متوسط التقييم" icon={<Star className="w-5 h-5 text-orange-400" />} />
          </div>
        </section>

        {/* ── Vision & Mission ── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 rounded-full" style={{ background: "oklch(0.71 0.18 54)" }} />
            <h2 className="text-white font-black text-xl">رؤيتنا ورسالتنا</h2>
          </div>

          {/* Vision */}
          <div
            className="rounded-3xl p-5 flex gap-4"
            style={{
              background: "linear-gradient(135deg, oklch(0.13 0 0), oklch(0.17 0.06 54))",
              border: "1px solid oklch(0.71 0.18 54 / 0.25)",
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "oklch(0.71 0.18 54 / 0.15)", border: "1px solid oklch(0.71 0.18 54 / 0.4)" }}
            >
              <Eye className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-orange-400 font-bold text-xs tracking-wider mb-1">الرؤية</p>
              <p className="text-white font-bold text-base leading-snug mb-2">
                أن نكون المنصة الأولى لتوصيل الطاقة المنزلية في سلطنة عُمان
              </p>
              <p className="text-white/55 text-sm leading-relaxed">
                نسعى لتوسيع خدماتنا لتشمل جميع محافظات السلطنة، مع الحفاظ على معايير السرعة والجودة التي نفخر بها.
              </p>
            </div>
          </div>

          {/* Mission */}
          <div
            className="rounded-3xl p-5 flex gap-4"
            style={{
              background: "oklch(0.13 0 0)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "oklch(0.71 0.18 54 / 0.15)", border: "1px solid oklch(0.71 0.18 54 / 0.4)" }}
            >
              <Target className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-orange-400 font-bold text-xs tracking-wider mb-1">الرسالة</p>
              <p className="text-white font-bold text-base leading-snug mb-2">
                توصيل الغاز لكل بيت في مسقط خلال ٣٠ دقيقة — بدون تطبيق، بدون تعقيد
              </p>
              <p className="text-white/55 text-sm leading-relaxed">
                نؤمن أن الحصول على احتياجات المنزل الأساسية يجب أن يكون سهلاً وموثوقاً وبسعر ثابت لا مفاجآت فيه.
              </p>
            </div>
          </div>
        </section>

        {/* ── Values ── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 rounded-full" style={{ background: "oklch(0.71 0.18 54)" }} />
            <h2 className="text-white font-black text-xl">قيمنا</h2>
          </div>
          <div className="flex flex-col gap-3">
            <ValueCard
              icon={<Zap className="w-5 h-5 text-orange-400" />}
              title="السرعة أولاً"
              desc="كل دقيقة تهم. نضمن التوصيل خلال ٣٠ دقيقة أو نسترد المبلغ كاملاً دون أسئلة."
            />
            <ValueCard
              icon={<ShieldCheck className="w-5 h-5 text-orange-400" />}
              title="الأمان والموثوقية"
              desc="جميع مزودينا معتمدون ومدرّبون. أسطوانات الغاز تُفحص قبل كل توصيل."
            />
            <ValueCard
              icon={<Heart className="w-5 h-5 text-orange-400" />}
              title="خدمة من القلب"
              desc="نتعامل مع كل طلب كأنه لعائلتنا. رضا العميل ليس هدفاً — هو معيار نجاحنا."
            />
            <ValueCard
              icon={<TrendingUp className="w-5 h-5 text-orange-400" />}
              title="الشفافية والسعر الثابت"
              desc="سعر واحد ثابت: ٣.٣٠٠ ريال عُماني. لا رسوم خفية، لا مفاجآت عند الباب."
            />
          </div>
        </section>

        {/* ── Team ── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 rounded-full" style={{ background: "oklch(0.71 0.18 54)" }} />
            <h2 className="text-white font-black text-xl">فريقنا</h2>
          </div>
          <p className="text-white/55 text-sm leading-relaxed">
            قيادة متمرسة تجمع بين الخبرة الإدارية والرؤية الاستراتيجية لبناء منصة توصيل الطاقة الأولى في عُمان.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <TeamCard
              initials="ف.ع"
              name="فهد العامري"
              role="المؤسس ورئيس مجلس الإدارة"
              color="linear-gradient(135deg, oklch(0.71 0.18 54), oklch(0.55 0.22 40))"
            />
            <TeamCard
              initials="م.ح"
              name="مبارك الحبسي"
              role="المدير العام"
              color="linear-gradient(135deg, oklch(0.55 0.18 145), oklch(0.40 0.15 160))"
            />
            <TeamCard
              initials="أ.س"
              name="أحمد سبحاني"
              role="الرئيس التنفيذي"
              color="linear-gradient(135deg, oklch(0.55 0.18 260), oklch(0.40 0.15 280))"
            />
          </div>
        </section>

        {/* ── Coverage ── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 rounded-full" style={{ background: "oklch(0.71 0.18 54)" }} />
            <h2 className="text-white font-black text-xl">نطاق التغطية</h2>
          </div>
          <div
            className="rounded-3xl p-5"
            style={{
              background: "oklch(0.13 0 0)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-start gap-3 mb-4">
              <MapPin className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-bold text-sm mb-1">مسقط — ٢٧ حيّاً</p>
                <p className="text-white/55 text-xs leading-relaxed">
                  نغطي جميع أحياء مسقط الكبرى: السيب، مسقط القديمة، الروي، الخوير، القرم، وأكثر من ٢٢ حياً آخر.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {["الموالح", "المعبيلة", "الخوض", "مطرح", "العذيبة", "الروي", "الخوير", "القرم", "بوشر", "غلا"].map((area) => (
                <span
                  key={area}
                  className="text-xs px-2.5 py-1 rounded-full text-orange-300"
                  style={{ background: "oklch(0.71 0.18 54 / 0.12)", border: "1px solid oklch(0.71 0.18 54 / 0.25)" }}
                >
                  {area}
                </span>
              ))}
              <span
                className="text-xs px-2.5 py-1 rounded-full text-white/40"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                +١٧ حياً
              </span>
            </div>
          </div>
        </section>

        {/* ── Awards / Trust ── */}
        <section>
          <div
            className="rounded-3xl p-5 flex gap-4 items-center"
            style={{
              background: "linear-gradient(135deg, oklch(0.13 0 0), oklch(0.17 0.06 54))",
              border: "1px solid oklch(0.71 0.18 54 / 0.3)",
            }}
          >
            <Award className="w-10 h-10 text-orange-400 shrink-0" />
            <div>
              <p className="text-white font-bold text-sm leading-snug">
                ضمان الجودة والسلامة
              </p>
              <p className="text-white/55 text-xs leading-relaxed mt-1">
                جميع أسطوانات الغاز مطابقة لمعايير الهيئة العُمانية للمواصفات والمقاييس. مزودونا مرخّصون ومؤمَّن عليهم.
              </p>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="flex flex-col gap-3 pt-2">
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center justify-center gap-2 rounded-full py-4 font-bold text-white text-base transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, oklch(0.71 0.18 54), oklch(0.62 0.22 40))",
              boxShadow: "0 4px 20px oklch(0.71 0.18 54 / 0.4)",
            }}
          >
            <Flame className="w-5 h-5" />
            <span>اطلب الغاز الآن</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <a
            href="https://wa.me/96891000000?text=مرحباً، أريد الاستفسار عن خدمة أًوصّل"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 rounded-full py-3.5 font-semibold text-white/70 text-sm transition-all active:scale-95"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <Users className="w-4 h-4" />
            <span>تواصل معنا عبر واتساب</span>
          </a>
        </section>

      </div>
    </div>
  );
}
