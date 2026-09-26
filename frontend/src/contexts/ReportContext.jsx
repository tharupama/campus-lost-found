import { createContext, useCallback, useContext, useState } from 'react';
import ReportModal from '../components/ReportModal';

const ReportContext = createContext(null);

export function ReportProvider({ children }) {
  const [report, setReport] = useState(false);
  const [reportType, setReportType] = useState('lost');

  const openReport = useCallback((type) => {
    setReportType(typeof type === 'string' ? type : 'select');
    setReport(true);
  }, []);

  return (
    <ReportContext.Provider value={{ openReport }}>
      {children}
      <ReportModal open={report} type={reportType} onClose={() => setReport(false)} />
    </ReportContext.Provider>
  );
}

export function useReport() {
  return useContext(ReportContext);
}
