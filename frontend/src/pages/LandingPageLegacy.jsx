import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import {
  Camera,
  Sparkles,
  KeyRound,
  QrCode,
  LogIn,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import SiteNav from '../components/layout/SiteNav';
import Footer from '../components/landing/Footer';
import { BUILDINGS } from '../config/constants';
import { useAuth } from '../contexts/AuthContext';
import { useReport } from '../contexts/ReportContext';

const STEPS = [
  {
    no: '01',
    title: 'Report it',
    body: 'Tell us what’s gone or found — category, building, and a photo. It takes under a minute.',
    icon: Camera,
  },
  {
    no: '02',
    title: 'Get matched',
    body: 'The match engine compares lost with found reports and alerts you the moment something lines up.',
    icon: Sparkles,
  },
  {
    no: '03',
    title: 'Claim & collect',
    body: 'Prove it’s yours with a secret mark, then pick it up from the guard desk with a QR handover.',
    icon: KeyRound,
  },
];

const FEATURES = [
  {
    title: 'Photo reports',
    body: 'Snap what you lost or found. Photos stay private until you are matched, and finds aren’t shown to everyone upfront.',
    icon: Camera,
  },
  {
    title: 'Auto-match engine',
    body: 'Lost and found reports are compared automatically, so you hear the moment something could be yours.',
    icon: Sparkles,
  },
  {
    title: 'Secret-mark claims',
    body: 'Describe a hidden detail only you would know. Security verifies it — nobody can talk their way into your things.',
    icon: KeyRound,
  },
  {
    title: 'QR handover',
    body: 'Every return is logged with a scannable handover code at the guard desk. No handshake chains, no confusion.',
    icon: QrCode,
  },
  {
    title: 'Campus SSO',
    body: 'One university account — email or Google — signs you in. No new passwords to remember.',
    icon: LogIn,
  },
  {
    title: 'Security desk',
    body: 'Guards run a vault of collected items, and staff verify every return before it leaves the campus.',
    icon: ShieldCheck,
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openReport } = useReport();
  const reduce = useReducedMotion();

  function go(path) {
    navigate(user ? path : `/login?next=${encodeURIComponent(path)}`);
  }

  function report(type) {
    if (user) {
      openReport(type);
      return;
    }
    go(`/feed?type=${type}`);
  }

  return (
    <div className="bg-slate-50 font-sans text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-100">
      <SiteNav />

      <main>
        {/* ------- HERO ------- */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -top-40 left-1/2 h-[34rem] w-[54rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-brand-200 via-gold-200 to-transparent opacity-70 blur-3xl dark:from-brand-500/20 dark:via-gold-500/15" />
            <div
              className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
              style={{
                backgroundImage: 'radial-gradient(circle, #312e81 1px, transparent 1px)',
                backgroundSize: '22px 22px',
                maskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, black 40%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, black 40%, transparent 100%)',
              }}
            />
          </div>

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:pb-24 lg:pt-20">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-700 shadow-sm dark:border-brand-500/30 dark:bg-slate-900 dark:text-brand-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-gold-500 opacity-70" />
                  <span className="h-2 w-2 rounded-full bg-gold-500" />
                </span>
                Faculty of Technology · University of Ruhuna
              </span>

              <h1 className="mt-5 font-display text-5xl font-black leading-[1.02] tracking-tight text-midnight dark:text-white sm:text-6xl">
                Nothing stays{' '}
                <span className="relative whitespace-nowrap">
                  lost
                  <svg
                    viewBox="0 0 120 12"
                    className="absolute -bottom-2 left-0 h-3 w-full text-brand-500"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 9 C 30 3, 60 11, 118 4"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      fill="none"
                      className="opacity-80"
                    />
                  </svg>
                </span>{' '}
                on campus.
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-500 dark:text-slate-400 sm:text-lg">
                Report what you lost or found anywhere on campus — from the Library to the Engineering
                Block. The engine matches the two, you prove it’s yours with a secret mark, and you
                collect it with a QR code.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => report('lost')}
                  className="btn-primary justify-center !px-6 !py-3.5 !text-base"
                >
                  Report a lost item
                  <ArrowRight size={18} />
                </button>
                <button
                  onClick={() => report('found')}
                  className="btn-ghost justify-center !bg-white !px-6 !py-3.5 !text-base dark:!bg-slate-900"
                >
                  I found something
                </button>
              </div>

              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
                {['Photo reports', 'Secret-mark claims', 'QR handover'].map((t) => (
                  <li key={t} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-brand-500" />
                    {t}
                  </li>
                ))}
              </ul>
            </motion.div>

<motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto hidden w-full max-w-xl sm:block lg:justify-self-end"
    >
      <DotLottieReact src="/animation/Sonar_Radar.lottie" loop autoplay style={{ width: '100%', height: 'auto' }} />
    </motion.div>
          </div>
        </section>

        {/* ------- PLACES ------- */}
        <section id="places" className="scroll-mt-24 border-y border-slate-200/70 bg-white py-14 dark:border-slate-800 dark:bg-slate-900/40 sm:py-20">
          <Reveal reduce={reduce}>
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1fr] lg:gap-16">
                <motion.div
                  initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="relative order-first mx-auto hidden w-fit sm:block lg:order-none"
                >
                  <DotLottieReact src="/animation/map.lottie" loop autoplay style={{ width: 520, height: 'auto' }} />
                </motion.div>

                <div className="order-last lg:order-none">
                  <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-600 dark:text-brand-400">
                    Where things turn up
                  </p>
                  <h2 className="mt-2 max-w-2xl font-display text-3xl font-black tracking-tight text-midnight sm:text-4xl dark:text-white">
                    Pinned to a real building, not a vague “the campus”.
                  </h2>
                  <p className="mt-4 max-w-2xl text-base text-slate-500 dark:text-slate-400">
                    Every report is tagged with a building, so nothing sits in the wrong room. Check
                    your spot, search the feed, and leave nothing behind.
                  </p>
                  <ul className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {BUILDINGS.map((b, i) => (
                      <motion.li
                        key={b}
                        initial={reduce ? false : { opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ delay: i * 0.03, duration: 0.4 }}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10"
                      >
                        <MapPin size={15} className="shrink-0 text-brand-500" />
                        {b}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ------- HOW IT WORKS ------- */}
        <section id="how-it-works" className="scroll-mt-24 py-14 sm:py-20">
          <Reveal reduce={reduce}>
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="max-w-2xl">
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-600 dark:text-brand-400">
                  How it works
                </p>
                <h2 className="mt-2 font-display text-3xl font-black tracking-tight text-midnight sm:text-4xl dark:text-white">
                  From “where is it?” to “got it”.
                </h2>
              </div>

              <ol className="mt-10 grid gap-4 lg:grid-cols-3 lg:gap-6">
                {STEPS.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <li key={step.no} className="h-full">
                      <motion.div
                        initial={reduce ? false : { opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                        className="group h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-300 hover:shadow-card dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-gold-100 text-brand-600 transition group-hover:from-brand-700 group-hover:to-gold-600 group-hover:text-white dark:from-brand-500/15 dark:to-gold-500/15 dark:text-brand-300">
                            <Icon size={22} />
                          </span>
                          <span className="font-display text-4xl font-black text-slate-100 dark:text-slate-800">
                            {step.no}
                          </span>
                        </div>
                        <h3 className="mt-5 text-lg font-extrabold text-midnight dark:text-white">
                          {step.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                          {step.body}
                        </p>
                      </motion.div>
                    </li>
                  );
                })}
              </ol>

              <p className="mt-8 flex items-start justify-center gap-2 text-center text-sm text-slate-500 dark:text-slate-400">
                <ShieldCheck size={17} className="mt-0.5 shrink-0 text-brand-500" />
                Your secret mark stays private — security verifies it, and only the true owner sees the
                handover code.
              </p>
            </div>
          </Reveal>
        </section>

        {/* ------- FEATURES ------- */}
        <section className="border-y border-slate-200/70 bg-white py-14 dark:border-slate-800 dark:bg-slate-900/40 sm:py-20">
          <Reveal reduce={reduce}>
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="max-w-2xl">
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-600 dark:text-brand-400">
                  What you get
                </p>
                <h2 className="mt-2 font-display text-3xl font-black tracking-tight text-midnight sm:text-4xl dark:text-white">
                  Built around the handover, not just the post.
                </h2>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <Reveal key={f.title} reduce={reduce} delay={i * 0.05}>
                      <div className="h-full rounded-2xl border border-slate-200 bg-slate-50/60 p-6 transition hover:border-brand-300 hover:bg-white hover:shadow-card dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-brand-500/40 dark:hover:bg-slate-900">
                        <Icon size={22} className="text-brand-500" />
                        <h3 className="mt-4 text-base font-extrabold text-midnight dark:text-white">
                          {f.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                          {f.body}
                        </p>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </Reveal>
        </section>

        {/* ------- CTA ------- */}
        <section className="py-14 sm:py-20">
          <Reveal reduce={reduce}>
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="relative overflow-hidden rounded-[2rem] bg-midnight px-6 py-14 text-center sm:px-12 sm:py-20">
                <div
                  className="pointer-events-none absolute inset-0"
                  aria-hidden="true"
                  style={{
                    backgroundImage: 'radial-gradient(circle, rgba(243,182,25,0.35) 1px, transparent 1px)',
                    backgroundSize: '26px 26px',
                  }}
                />
                <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-96 -translate-x-1/2 rounded-full bg-brand-500/30 blur-3xl" aria-hidden="true" />
                <div className="relative">
                  <span className="font-ticket text-[11px] uppercase tracking-[0.3em] text-brand-300">
                    University of Ruhuna
                  </span>
                  <h2 className="mx-auto mt-3 max-w-2xl font-display text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
                    Lost something right now?
                  </h2>
                  <p className="mx-auto mt-4 max-w-xl text-base text-slate-400">
                    Don’t wait — the sooner you report, the sooner the engine can match. Finds are
                    logged and secured by the guard desk.
                  </p>
                  <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                    <button
                      onClick={() => report('lost')}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-700 to-gold-600 px-6 py-3.5 text-base font-semibold text-white shadow-glow transition hover:from-brand-800 hover:to-gold-700 active:scale-[0.98]"
                    >
                      Report a lost item
                      <ArrowRight size={18} />
                    </button>
                    <button
                      onClick={() => report('found')}
                      className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-white/20 active:scale-[0.98]"
                    >
                      I found something
                    </button>
                  </div>
                  <p className="mt-6 text-xs text-slate-500">
                    Students and staff sign in with campus SSO.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Reveal({ children, reduce = false, delay = 0, className }) {
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}