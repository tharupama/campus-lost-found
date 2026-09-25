import { MapPin, CalendarDays, ShieldCheck } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import Badge from './Badge';
import { motion } from 'framer-motion';

export default function ItemCard({ item, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="group flex w-full flex-col overflow-hidden rounded-2xl bg-white text-left shadow-card transition hover:shadow-glow dark:bg-slate-900"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-100 to-gold-100 dark:from-brand-500/20 dark:to-gold-500/20">
            <ShieldCheck className="text-brand-300" size={40} />
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1.5">
          <Badge color={item.type}>{item.type}</Badge>
          {item.status !== 'active' && <Badge color={item.status}>{item.status}</Badge>}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 text-sm font-bold text-midnight dark:text-white">{item.title}</p>
          <Badge color="system">{item.category}</Badge>
        </div>
        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">
            <MapPin size={13} />
            {item.location}
          </span>
          <span className="inline-flex items-center gap-1" title={format(new Date(item.date), 'PP')}>
            <CalendarDays size={13} />
            {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
          </span>
        </div>
      </div>
    </motion.button>
  );
}