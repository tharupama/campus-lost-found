import { Loader2 } from 'lucide-react';

export default function Spinner({ label = 'Loading', full }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-slate-400 ${
        full ? 'min-h-[60vh]' : 'py-12'
      }`}
    >
      <Loader2 className="animate-spin text-brand-500" size={36} />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}