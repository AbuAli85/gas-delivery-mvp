/**
 * AboutUs — صفحة "من نحن" / About Us
 * Fully bilingual AR/EN via useLanguage hook.
 */
import { useLocation } from "wouter";
import {
  Flame, Target, Eye, Heart, Zap, ShieldCheck,
  Users, MapPin, Star, ChevronRight, ChevronLeft,
  ArrowRight, ArrowLeft, Clock, Truck, Award, TrendingUp,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

/* ── Stat card ─────────────────────────────────────────────────── */
function StatCard({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <div
      className="flex flex-col items-center gap-2 p-5 rounded-3xl"
      style={{ background: "oklch(0.13 0 0)", border: "1px solid rgba(255,255,255,0.07)" }}
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
      style={{ background: "oklch(0.13 0 0)", border: "1px solid rgba(255,255,255,0.07)" }}
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

/* ── Section heading ────────────────────────────────────────────── */
function SectionHeading({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-1 h-6 rounded-full" style={{ background: "oklch(0.71 0.18 54)" }} />
      <h2 className="text-white font-black text-xl">{title}</h2>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */
export default function AboutUs() {
  const [, navigate] = useLocation();
  const { t, dir } = useLanguage();

  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const ArrowIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

  const areas = {
    ar: ["الموالح", "المعبيلة", "الخوض", "مطرح", "العذيبة", "الروي", "الخوير", "القرم", "بوشر", "غلا"],
    en: ["Al Mowaleh", "Al Maabilah", "Al Khoud", "Mutrah", "Al Azaiba", "Al Ruwi", "Al Khuwair", "Al Qurm", "Bawshar", "Ghala"],
  };
  const moreLabel = dir === "rtl" ? "+١٧ حياً" : "+17 more";

  return (
    <div
      className="mobile-screen overflow-y-auto"
      style={{ background: "oklch(0.09 0 0)" }}
      dir={dir}
    >
      {/* ── Header ── */}
      <div
        className="relative px-5 pt-12 pb-10 overflow-hidden"
        style={{
          background: "linear-gradient(160deg, oklch(0.09 0 0) 0%, oklch(0.18 0.08 54) 60%, oklch(0.12 0.04 54) 100%)",
        }}
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-white/60 text-sm mb-6 hover:text-white transition-colors"
        >
          <BackIcon className="w-4 h-4" />
          <span>{t("about.back")}</span>
        </button>

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

        <h1 className="text-white font-black text-3xl leading-tight mb-3">{t("about.title")}</h1>
        <p className="text-white/60 text-base leading-relaxed">{t("about.subtitle")}</p>

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
          <SectionHeading title={t("about.story.title")} />
          <div
            className="rounded-3xl p-5"
            style={{ background: "oklch(0.13 0 0)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <p className="text-white/70 text-sm leading-loose">
              <span className="text-orange-400 font-bold">OWASEEL</span>{" "}
              {t("about.story.p1").replace("أًوصّل", "").replace("OWASEEL", "").trim()}
            </p>
            <p className="text-white/70 text-sm leading-loose mt-3">{t("about.story.p2")}</p>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="flex flex-col gap-4">
          <SectionHeading title={t("about.stats.title")} />
          <div className="grid grid-cols-2 gap-3">
            <StatCard value="+500" label={t("about.stats.orders")} icon={<Truck className="w-5 h-5 text-orange-400" />} />
            <StatCard value="30m" label={t("about.stats.speed")} icon={<Clock className="w-5 h-5 text-orange-400" />} />
            <StatCard value="27" label={t("about.stats.areas")} icon={<MapPin className="w-5 h-5 text-orange-400" />} />
            <StatCard value="4.9★" label={t("about.stats.rating")} icon={<Star className="w-5 h-5 text-orange-400" />} />
          </div>
        </section>

        {/* ── Vision & Mission ── */}
        <section className="flex flex-col gap-4">
          <SectionHeading title={t("about.vision.title")} />

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
              <p className="text-orange-400 font-bold text-xs tracking-wider mb-1">{t("about.vision.label")}</p>
              <p className="text-white font-bold text-base leading-snug mb-2">{t("about.vision.heading")}</p>
              <p className="text-white/55 text-sm leading-relaxed">{t("about.vision.desc")}</p>
            </div>
          </div>

          <div
            className="rounded-3xl p-5 flex gap-4"
            style={{ background: "oklch(0.13 0 0)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "oklch(0.71 0.18 54 / 0.15)", border: "1px solid oklch(0.71 0.18 54 / 0.4)" }}
            >
              <Target className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-orange-400 font-bold text-xs tracking-wider mb-1">{t("about.mission.label")}</p>
              <p className="text-white font-bold text-base leading-snug mb-2">{t("about.mission.heading")}</p>
              <p className="text-white/55 text-sm leading-relaxed">{t("about.mission.desc")}</p>
            </div>
          </div>
        </section>

        {/* ── Values ── */}
        <section className="flex flex-col gap-4">
          <SectionHeading title={t("about.values.title")} />
          <div className="flex flex-col gap-3">
            <ValueCard icon={<Zap className="w-5 h-5 text-orange-400" />} title={t("about.values.speed.title")} desc={t("about.values.speed.desc")} />
            <ValueCard icon={<ShieldCheck className="w-5 h-5 text-orange-400" />} title={t("about.values.safety.title")} desc={t("about.values.safety.desc")} />
            <ValueCard icon={<Heart className="w-5 h-5 text-orange-400" />} title={t("about.values.service.title")} desc={t("about.values.service.desc")} />
            <ValueCard icon={<TrendingUp className="w-5 h-5 text-orange-400" />} title={t("about.values.transparency.title")} desc={t("about.values.transparency.desc")} />
          </div>
        </section>

        {/* ── Team ── */}
        <section className="flex flex-col gap-4">
          <SectionHeading title={t("about.team.title")} />
          <p className="text-white/55 text-sm leading-relaxed">{t("about.team.desc")}</p>
          <div className="grid grid-cols-3 gap-3">
            <TeamCard
              initials="ف.ع"
              name={t("about.team.member1.name")}
              role={t("about.team.member1.role")}
              color="linear-gradient(135deg, oklch(0.71 0.18 54), oklch(0.55 0.22 40))"
            />
            <TeamCard
              initials="م.ح"
              name={t("about.team.member2.name")}
              role={t("about.team.member2.role")}
              color="linear-gradient(135deg, oklch(0.55 0.18 145), oklch(0.40 0.15 160))"
            />
            <TeamCard
              initials="أ.س"
              name={t("about.team.member3.name")}
              role={t("about.team.member3.role")}
              color="linear-gradient(135deg, oklch(0.55 0.18 260), oklch(0.40 0.15 280))"
            />
          </div>
        </section>

        {/* ── Coverage ── */}
        <section className="flex flex-col gap-4">
          <SectionHeading title={t("about.coverage.title")} />
          <div
            className="rounded-3xl p-5"
            style={{ background: "oklch(0.13 0 0)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-start gap-3 mb-4">
              <MapPin className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-bold text-sm mb-1">{t("about.coverage.heading")}</p>
                <p className="text-white/55 text-xs leading-relaxed">{t("about.coverage.desc")}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(dir === "rtl" ? areas.ar : areas.en).map((area) => (
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
                {moreLabel}
              </span>
            </div>
          </div>
        </section>

        {/* ── Quality badge ── */}
        <section>
          <div
            className="rounded-3xl p-5 flex gap-4 items-center"
            style={{
              background: "linear-gradient(135deg, oklch(0.13 0 0), oklch(0.17 0.06 54))",
              border: "1px solid oklch(0.71 0.18 54 / 0.3)",
            }}
          >
            <Award className="w-10 h-10 text-orange-400 shrink-0" />
            <p className="text-white/55 text-xs leading-relaxed">{t("about.quality.desc")}</p>
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
            <span>{t("about.cta.order")}</span>
            <ArrowIcon className="w-4 h-4" />
          </button>

          <a
            href="https://wa.me/96891000000?text=Hello%20OWASEEL"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 rounded-full py-3.5 font-semibold text-white/70 text-sm transition-all active:scale-95"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <Users className="w-4 h-4" />
            <span>{t("about.cta.whatsapp")}</span>
          </a>
        </section>

      </div>
    </div>
  );
}
