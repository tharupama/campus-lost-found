import { ChevronLeft, ChevronRight } from 'lucide-react';

export const PAGE_SIZES = [5, 10, 12, 20, 25, 50];

export default function Pagination({ page, pageSize, total, totalPages, onChangePage, onPageSizeChange }) {
  if (!total || total < 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const navCls =
    'flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-brand-400 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-500 dark:border-slate-700 dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-400 dark:disabled:hover:border-slate-700 dark:disabled:hover:text-slate-400';

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Showing {from}–{to} of {total}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
          Page size
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 outline-none transition focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} per page
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <button className={navCls} onClick={() => onChangePage(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft size={16} />
          </button>
          <span className="px-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            {page} / {totalPages}
          </span>
          <button className={navCls} onClick={() => onChangePage(page + 1)} disabled={page >= totalPages} aria-label="Next page">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}