import { motion } from 'framer-motion';

const styles = {
  lost: 'bg-rose-100 text-rose-600',
  found: 'bg-emerald-100 text-emerald-600',
  active: 'bg-sky-100 text-sky-600',
  claimed: 'bg-amber-100 text-amber-600',
  resolved: 'bg-slate-200 text-slate-600',
  pending: 'bg-amber-100 text-amber-600',
  approved: 'bg-emerald-100 text-emerald-600',
  rejected: 'bg-rose-100 text-rose-600',
  match: 'bg-gold-100 text-gold-700',
  claim: 'bg-sky-100 text-sky-600',
  system: 'bg-slate-100 text-slate-500',
  contact: 'bg-fuchsia-100 text-fuchsia-600',
  feedback: 'bg-violet-100 text-violet-600',
  new: 'bg-gold-100 text-gold-700',
  reviewed: 'bg-emerald-100 text-emerald-600',
};

export default function Badge({ children, color }) {
  return (
    <motion.span layout className={`badge ${styles[color] || styles.system}`}>
      {children}
    </motion.span>
  );
}