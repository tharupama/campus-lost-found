import { Outlet, useLocation } from 'react-router-dom';
import SiteNav from './SiteNav';
import { useReport } from '../../contexts/ReportContext';

const HIDE_REPORT_CTA = ['/feedback'];

export default function AppShell() {
  const { openReport } = useReport();
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen">
      <SiteNav />
      <Outlet context={{ openReport }} />
      {!HIDE_REPORT_CTA.includes(pathname) && (
        <div className="hidden md:fixed md:bottom-6 md:left-1/2 md:z-40 md:flex md:-translate-x-1/2 md:gap-3">
          <button onClick={() => openReport('lost')} className="btn-primary shadow-glow">Lost an item?</button>
          <button onClick={() => openReport('found')} className="btn-ghost bg-white/90 dark:bg-slate-900/90">
            Found something?
          </button>
        </div>
      )}
    </div>
  );
}
