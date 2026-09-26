import { Link } from 'react-router-dom';
import UoRBadge from '../ui/UoRBadge';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/70 bg-white pb-24 pt-10 md:pb-10 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <UoRBadge size="sm" />
              <span className="text-sm font-extrabold text-midnight dark:text-white">Ruhuna Lost & Found</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              The lost &amp; found for the Faculty of Technology, University of Ruhuna — report,
              match, and hand things back where they belong.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <FooterCol
              title="Explore"
              links={[
                { label: 'Feed', to: '/feed' },
                { label: 'My claims', to: '/my-claims' },
                { label: 'Alerts', to: '/notifications' },
              ]}
            />
            <FooterCol
              title="Learn"
              links={[
                { label: 'About', to: '/about' },
                { label: 'Contact', to: '/contact' },
                { label: 'Get started', to: '/login' },
              ]}
            />
            <FooterCol
              title="Staff"
              links={[{ label: 'Security desk sign-in', to: '/login?next=/admin' }]}
            />
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-slate-200/70 pt-6 text-xs text-slate-400 sm:flex-row dark:border-slate-800 dark:text-slate-500">
          <p>© {new Date().getFullYear()} Faculty of Technology · University of Ruhuna · Ruhuna Lost &amp; Found</p>
          <p>Made for the campus community.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
        {title}
      </p>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              to={l.to}
              className="text-sm text-slate-500 transition hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}