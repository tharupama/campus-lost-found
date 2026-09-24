import { Building2, LifeBuoy, MapPin, Clock3, LogIn } from 'lucide-react';
import SiteNav from '../components/layout/SiteNav';
import Footer from '../components/landing/Footer';

const CHANNELS = [
  {
    icon: Building2,
    title: 'Guard desk',
    body: 'Found something or collecting an item? Handovers happen here, in person.',
    meta: [MapPin, 'Main Gate'],
  },
  {
    icon: LifeBuoy,
    title: 'IT help desk',
    body: 'Can’t sign in or your campus SSO account is locked? The help desk sorts it out.',
    meta: [Clock3, 'Open during campus hours'],
  },
  {
    icon: LogIn,
    title: 'Campus account',
    body: 'Everything else — reporting, claims, and alerts — happens with your university sign-in.',
    meta: [null, 'Students and staff'],
  },
];

export default function ContactPage() {
  return (
    <div className="bg-slate-50 font-sans text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-100">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-600 dark:text-brand-400">
          Contact
        </p>
        <h1 className="mt-3 font-display text-4xl font-black tracking-tight text-midnight sm:text-5xl dark:text-white">
          Reach the lost &amp; found desk.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
          Most things can be sorted from your campus account. If you need a person, the desks below
          are where a lost item ends up — and where one gets back to you.
        </p>

        <div className="mt-10 grid gap-4">
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            const MetaIcon = c.meta[0];
            return (
              <div
                key={c.title}
                className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-violet-100 text-brand-600 dark:from-brand-500/15 dark:to-violet-500/15 dark:text-brand-300">
                  <Icon size={22} />
                </span>
                <div>
                  <h2 className="text-base font-extrabold text-midnight dark:text-white">{c.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{c.body}</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400">
                    {MetaIcon && <MetaIcon size={13} />}
                    {c.meta[1]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-sm text-slate-400 dark:text-slate-500">
          For anything else, sign in and use the report flows in the app — every reply goes to the
          right desk automatically.
        </p>
      </main>
      <Footer />
    </div>
  );
}