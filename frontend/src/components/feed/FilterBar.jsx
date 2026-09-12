import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { CATEGORIES, BUILDINGS } from '../../config/constants';
import Badge from '../../components/ui/Badge';

const TABS = [
  { key: '', label: 'All' },
  { key: 'found', label: 'Found' },
  { key: 'lost', label: 'Lost' },
];

export default function FilterBar({ filters, onChange }) {
  const [open, setOpen] = useState(false);

  const chips = [
    filters.type && { key: 'type', label: filters.type },
    filters.category && { key: 'category', label: filters.category },
    filters.location && { key: 'location', label: filters.location },
  ].filter(Boolean);

  const remove = (key) => onChange({ ...filters, [key]: '' });

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          className="input-field pl-10"
          placeholder="Search items…"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
        <button
          onClick={() => setOpen(true)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
          aria-label="Filters"
        >
          <SlidersHorizontal size={19} />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onChange({ ...filters, type: t.key })}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filters.type === t.key
                ? 'bg-brand-600 text-white shadow-card'
                : 'bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => remove(chip.key)}
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
            >
              {chip.label}
              <X size={12} />
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold text-midnight dark:text-white">Filters</p>
              <Badge color="system">{CATEGORIES.length} categories</Badge>
            </div>
            <div className="mb-3">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Category</p>
              <div className="flex flex-wrap gap-1.5">
                <Chip active={!filters.category} onClick={() => onChange({ ...filters, category: '' })}>All</Chip>
                {CATEGORIES.map((c) => (
                  <Chip key={c} active={filters.category === c} onClick={() => onChange({ ...filters, category: filters.category === c ? '' : c })}>
                    {c}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Building</p>
              <div className="flex flex-wrap gap-1.5">
                <Chip active={!filters.location} onClick={() => onChange({ ...filters, location: '' })}>All</Chip>
                {BUILDINGS.map((b) => (
                  <Chip key={b} active={filters.location === b} onClick={() => onChange({ ...filters, location: filters.location === b ? '' : b })}>
                    {b}
                  </Chip>
                ))}
              </div>
            </div>
            <button className="btn-ghost mt-4 w-full" onClick={() => { setOpen(false); onChange({ ...filters, type: '', category: '', location: '' }); }}>
              Clear all
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
        active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );
}