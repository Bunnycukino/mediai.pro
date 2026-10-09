import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";
import {
  Stethoscope, Globe2, BookOpen, ShieldCheck, ArrowRight,
  Sparkles, Activity,
} from "lucide-react";

const HERO_IMG = "https://images.unsplash.com/photo-1738117394130-37a190a4c36b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHwxfHxzb2Z0JTIwYWJzdHJhY3QlMjBlYXJ0aHklMjBiZWlnZSUyMGdyZWVuJTIwdGV4dHVyZXxlbnwwfHx8fDE3NzgyMzkxNDV8MA&ixlib=rb-4.1.0&q=85";
const DOCTOR_IMG = "https://images.unsplash.com/photo-1758691461935-202e2ef6b69f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzN8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwY29uc3VsdGF0aW9uJTIwcGF0aWVudCUyMGRvY3RvcnxlbnwwfHx8fDE3NzgyMzkxMTl8MA&ixlib=rb-4.1.0&q=85";

export default function Landing() {
  const { t } = useI18n();

  const features = [
    { icon: Sparkles, key: "A" },
    { icon: Activity, key: "B" },
    { icon: BookOpen, key: "C" },
    { icon: ShieldCheck, key: "D" },
  ];

  return (
    <div className="min-h-screen bg-[#F9F8F6]">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{ backgroundImage: `url(${HERO_IMG})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#F9F8F6]/70 via-[#F9F8F6]/85 to-[#F9F8F6]" />

        <div className="max-w-7xl mx-auto px-6 md:px-12 pt-16 md:pt-28 pb-20 md:pb-32 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur border border-[#E1DFDA] text-xs uppercase tracking-[0.25em] text-[#5C6A64] mb-8">
              <Stethoscope className="w-3.5 h-3.5 text-[#8BA888]" />
              <span>mediai.pro</span>
              <span className="text-[#8BA888]">•</span>
              <span>private AI doctor</span>
            </div>
            <h1 className="font-heading font-light text-4xl sm:text-5xl lg:text-6xl text-[#1A2E25] leading-[1.05] tracking-tight">
              {t("tagline").split("—")[0]}
              <span className="block text-[#8BA888] italic font-normal mt-2">
                {t("tagline").split("—")[1]}
              </span>
            </h1>
            <p className="mt-8 text-lg text-[#5C6A64] leading-relaxed max-w-2xl">
              {t("subhero")}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full btn-sage h-14 px-8 text-base" data-testid="hero-cta-start">
                <Link to="/register">
                  {t("getStarted")} <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full h-14 px-8 text-base border-[#E1DFDA] bg-white/70 backdrop-blur" data-testid="hero-cta-signin">
                <Link to="/login">{t("signIn")}</Link>
              </Button>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-6 text-xs uppercase tracking-[0.25em] text-[#5C6A64]">
              <span>WHO</span><span>•</span>
              <span>CDC</span><span>•</span>
              <span>NIH</span><span>•</span>
              <span>FDA</span><span>•</span>
              <span>PubMed</span>
            </div>
          </div>

          <div className="lg:col-span-5 animate-fade-up" style={{ animationDelay: "0.15s" }}>
            <div className="relative rounded-3xl overflow-hidden border border-[#E1DFDA] shadow-[0_30px_80px_rgba(26,46,37,0.12)]">
              <img src={DOCTOR_IMG} alt="" className="w-full h-[420px] md:h-[520px] object-cover" />
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/90 backdrop-blur border border-[#E1DFDA] p-4">
                <div className="text-[10px] tracking-[0.3em] uppercase text-[#8BA888]">Live consultation</div>
                <div className="text-sm text-[#1A2E25] mt-1">"My migraine is worse in the morning..."</div>
                <div className="dot-typing text-[#8BA888] mt-2"><span>•</span><span>•</span><span>•</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-20">
        <div className="max-w-2xl mb-14">
          <div className="text-xs uppercase tracking-[0.3em] text-[#5C6A64] mb-4">Designed with care</div>
          <h2 className="font-heading text-3xl md:text-5xl text-[#1A2E25] leading-tight">
            Medical guidance that <span className="italic text-[#8BA888]">listens</span>, explains, and cites its work.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map(({ icon: Icon, key }) => (
            <div key={key} className="rounded-3xl bg-white border border-[#E1DFDA] p-8 hover:-translate-y-1 transition-transform duration-300" data-testid={`feature-${key}`}>
              <div className="w-12 h-12 rounded-2xl bg-[#8BA888]/12 text-[#8BA888] flex items-center justify-center mb-6">
                <Icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h3 className="font-heading text-xl text-[#1A2E25] mb-2">{t(`landingFeature${key}`)}</h3>
              <p className="text-[#5C6A64] leading-relaxed">{t(`landingFeature${key}Desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white border-y border-[#E1DFDA]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { n: "01", t: "Tell MediAI what's bothering you", d: "Type or speak — share symptoms, history, or a question. The AI factors in your health profile." },
            { n: "02", t: "Get a structured, sourced answer", d: "Likely causes, self-care, when to see a doctor, red flags — all backed by authoritative sources." },
            { n: "03", t: "Continue the conversation", d: "Switch models for second opinions. Save threads. Listen to answers in your language." },
          ].map((s) => (
            <div key={s.n} className="">
              <div className="text-6xl font-heading font-light text-[#8BA888]/50 mb-6">{s.n}</div>
              <h3 className="font-heading text-xl text-[#1A2E25] mb-3">{s.t}</h3>
              <p className="text-[#5C6A64] leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-24 text-center">
        <Globe2 className="w-10 h-10 text-[#8BA888] mx-auto mb-6" strokeWidth={1.4} />
        <h2 className="font-heading text-4xl md:text-5xl text-[#1A2E25] mb-6">
          A second opinion, in any language, anytime.
        </h2>
        <p className="text-[#5C6A64] max-w-xl mx-auto mb-10 text-lg">
          Free to start. No insurance. Just clear, careful answers — with the sources to back them.
        </p>
        <Button asChild size="lg" className="rounded-full btn-sage h-14 px-10 text-base" data-testid="cta-bottom">
          <Link to="/register">
            {t("getStarted")} <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </section>

      <footer className="border-t border-[#E1DFDA] py-10 text-center text-xs uppercase tracking-[0.3em] text-[#5C6A64]">
        MediAI AI &nbsp;•&nbsp; mediai.pro &nbsp;•&nbsp; Educational use only
      </footer>
    </div>
  );
}
