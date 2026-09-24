import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SiteNav from './SiteNav';
import BottomNav from './BottomNav';
import ReportModal from '../ReportModal';

export default function AppShell() {
  const [report, setReport] = useState(false);
  const [reportType, setReportType] = useState('lost');

  function openReport(type = 'select') {
    setReportType(type);
    setReport(true);
  }

  return (
    <div className="min-h-screen">
      <SiteNav />
      <Outlet context={{ openReport }} />
      <BottomNav openReport={() => openReport()} />
      <div className="hidden md:fixed md:bottom-6 md:left-1/2 md:z-40 md:flex md:-translate-x-1/2 md:gap-3">
        <button onClick={() => openReport('lost')} className="btn-primary shadow-glow">Lost an item?</button>
        <button onClick={() => openReport('found')} className="btn-ghost bg-white/90 dark:bg-slate-900/90">
          Found something?
        </button>
      </div>
      <ReportModal open={report} type={reportType} onClose={(refresh) => { setReport(false); }} />
    </div>
  );
}