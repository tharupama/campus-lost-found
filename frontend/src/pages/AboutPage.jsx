import { GraduationCap, Camera, Sparkles, KeyRound, QrCode, ShieldCheck } from 'lucide-react';
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
  return (
    <div className="bg-slate-50 font-sans text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-100">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-600 dark:text-brand-400">
          About
        </p>
        <h1 className="mt-3 font-display text-4xl font-black tracking-tight text-midnight sm:text-5xl dark:text-white">
          A lost item isn’t lost forever.
        </h1>
        <p className="mt-6 text-base leading-relaxed text-slate-600 dark:text-slate-300">
          CampusLost is the lost &amp; found system for the University of Ruhuna. Every day, things
          get misplaced across the campus — a library card in the Library, a laptop charger in an
          Engineering Block lab, keys on the way to Hostel A. Most of them are found, but matching
          what was lost with what was found used to depend on luck and noticeboards.
        </p>
        <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">
          This system ties the whole loop together. Students and staff report items in under a
          minute, the match engine connects lost with found, and the guard desk handles the handover
          — securely, in person, with proof.
        </p>

        <h2 className="mt-12 font-display text-2xl font-black tracking-tight text-midnight sm:text-3xl dark:text-white">
          How it works
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
          University of Ruhuna · Matara
        </div>
      </main>
      <Footer />
    </div>
  );
}