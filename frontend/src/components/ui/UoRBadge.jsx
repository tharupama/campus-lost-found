import { GraduationCap } from 'lucide-react';

const SIZES = {
  sm: { box: 'h-8 w-8 rounded-xl', icon: 16, tag: 'h-3.5 min-w-3.5 px-0.5 text-[6px] -right-1 -top-1' },
  md: { box: 'h-10 w-10 rounded-2xl', icon: 20, tag: 'h-4 min-w-4 px-0.5 text-[7px] -right-1 -top-1' },
  lg: { box: 'h-14 w-14 rounded-3xl', icon: 26, tag: 'h-5 min-w-5 px-1 text-[8px] -right-1 -top-1' },
};

export default function UoRBadge({ size = 'md', label = 'FoT', className = '' }) {
  const s = SIZES[size] || SIZES.md;
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center bg-gradient-to-br from-brand-800 via-brand-900 to-gold-600 text-white shadow-glow ${s.box} ${className}`}
      aria-label={`${label} monogram`}
    >
      <GraduationCap size={s.icon} className="text-gold-300" />
      <span
        className={`absolute flex items-center justify-center rounded-md bg-gold-500 font-black leading-none text-brand-900 shadow-sm ring-2 ring-white/80 dark:ring-slate-900/60 ${s.tag}`}
      >
        {label}
      </span>
    </span>
  );
}