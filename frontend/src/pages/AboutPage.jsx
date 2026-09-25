import { GraduationCap, Camera, Sparkles, KeyRound, QrCode, ShieldCheck, MapPin } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import SiteNav from '../components/layout/SiteNav';
import Footer from '../components/landing/Footer';

const HIGHLIGHTS = [
  {
    icon: Camera,
    title: 'Report with a photo',
    body: 'Tell us what’s gone or found with a photo and a building. Photos stay private until you are matched.',
  },
  {
    icon: Sparkles,
    title: 'Auto-match engine',
    body: 'Lost and found reports are compared automatically, so you hear the moment something could be yours.',
  },
  {
    icon: KeyRound,
    title: 'Secret-mark claims',
    body: 'Prove an item is yours by describing a hidden detail. Security verifies it before any handover.',
  },
  {
    icon: QrCode,
    title: 'QR handover',
    body: 'Every return is logged with a scannable code at the guard desk — no handshake chains or confusion.',
  },
];

export default function AboutPage() {
  const reduce = useReducedMotion();

  return (
    <div className="bg-slate-50 font-sans text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-100">
      <SiteNav />
      <main>
        {/* ------- HERO ------- */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -top-24 left-1/2 h-[30rem] w-[46rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-brand-200 via-gold-200 to-transparent opacity-70 blur-3xl dark:from-brand-500/20 dark:via-gold-500/15" />
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

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-16">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-600 dark:text-brand-400">
                About
              </p>
              <h1 className="mt-3 font-display text-4xl font-black tracking-tight text-midnight sm:text-5xl dark:text-white">
                A lost item isn’t lost forever.
              </h1>
              <p className="mt-6 text-base leading-relaxed text-slate-600 dark:text-slate-300">
                Ruhuna Lost &amp; Found is the lost &amp; found system for the Faculty of Technology,
                University of Ruhuna. Every day, things get misplaced on campus — a library card, a
                laptop charger in an Engineering Block lab, keys on the way to Hostel A. Most of them
                are found, but matching what was lost with what was found used to depend on luck and
                noticeboards.
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">
                This system ties the whole loop together. Students and staff report items in under a
                minute, the match engine connects lost with found, and the guard desk handles the
                handover — securely, in person, with proof.
              </p>
            </motion.div>

            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="absolute -inset-6 -rotate-2 rounded-[2rem] border border-brand-200/70 bg-white shadow-2xl dark:border-brand-500/20 dark:bg-slate-900" aria-hidden="true" />
              <img
                src="/about.png"
                alt="The Faculty of Technology at the University of Ruhuna"
                className="relative rotate-1 rounded-[1.75rem] border border-white/10 object-cover shadow-xl transition duration-300 hover:rotate-0 dark:border-white/5 dark:shadow-[0_24px_60px_-15px_rgba(212,154,12,0.75)]"
              />
              <div className="absolute -bottom-6 -left-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-card sm:-left-8 dark:border-slate-700 dark:bg-slate-900">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-700 to-gold-600 text-white">
                  <MapPin size={18} />
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-extrabold text-midnight dark:text-white">Faculty of Technology</span>
                  <span className="block text-[11px] text-slate-400">University of Ruhuna · Matara</span>
                </span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ------- HOW IT WORKS ------- */}
        <section className="border-t border-slate-200/70 bg-white py-14 sm:py-20 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-600 dark:text-brand-400">
              Our system
            </p>
            <h2 className="mt-2 font-display text-2xl font-black tracking-tight text-midnight sm:text-3xl dark:text-white">
              How it works
            </h2>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {HIGHLIGHTS.map((h) => {
                const Icon = h.icon;
                return (
                  <div
                    key={h.title}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <Icon size={22} className="text-brand-500" />
                    <h3 className="mt-3 text-base font-extrabold text-midnight dark:text-white">{h.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{h.body}</p>
                  </div>
                );
              })}
            </div>

          <div className="mt-10 flex items-start gap-3 rounded-2xl border border-brand-200 bg-white p-5 dark:border-brand-500/30 dark:bg-slate-900">
            <ShieldCheck size={20} className="mt-0.5 shrink-0 text-brand-500" />
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Returns are handled by the campus security desk with a QR handover code. Guards verify
              every claim, and the admin panel keeps a full record of everything collected and returned.
            </p>
          </div>

          <div className="mt-12 flex items-center gap-3 text-sm text-slate-400 dark:text-slate-500">
              <GraduationCap size={18} className="text-brand-500" />
              Faculty of Technology · University of Ruhuna · Matara
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}