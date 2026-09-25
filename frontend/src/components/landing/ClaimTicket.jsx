import { motion, useReducedMotion } from 'framer-motion';
import { QrCode, MapPin, BellRing } from 'lucide-react';

export default function ClaimTicket() {
  const reduce = useReducedMotion();

  return (
    <div className="relative mx-auto w-full max-w-sm select-none" aria-hidden="true">
      <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-brand-200 via-gold-200 to-amber-100 opacity-70 blur-2xl dark:from-brand-500/25 dark:via-gold-500/25 dark:to-amber-400/10" />

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 48, rotate: 4 }}
        animate={{ opacity: 1, y: 0, rotate: -3 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 110, damping: 15 }}
      >
        <motion.div
          animate={reduce ? undefined : { y: [0, -8, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="rounded-2xl bg-white p-5 shadow-[0_30px_60px_-15px_rgba(15,23,42,0.4)] ring-1 ring-slate-200/70 dark:bg-slate-900 dark:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] dark:ring-slate-700/80"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
                Ruhuna Lost &amp; Found
              </p>
              <p className="mt-1 font-ticket text-[10px] uppercase tracking-widest text-slate-400">
                Faculty of Technology
              </p>
            </div>
            <span className="rounded-lg bg-slate-900 px-2 py-1 font-ticket text-[11px] font-bold tracking-wider text-white dark:bg-slate-100 dark:text-slate-900">
              LF-2417
            </span>
          </div>

          <div className="relative my-4 border-t-2 border-dashed border-slate-200 dark:border-slate-700">
            <span className="absolute -left-[1.25rem] -top-[7px] h-5 w-5 rounded-full bg-slate-50 ring-4 ring-slate-200/50 dark:bg-slate-950 dark:ring-slate-800" />
            <span className="absolute -right-[1.25rem] -top-[7px] h-5 w-5 rounded-full bg-slate-50 ring-4 ring-slate-200/50 dark:bg-slate-950 dark:ring-slate-800" />
          </div>

          <div className="space-y-3 pb-4">
            <TicketRow
              icon={<MapPin size={13} />}
              label="Turned up at"
              value="Engineering Block · 2nd floor"
            />
            <TicketRow
              icon={<BellRing size={13} />}
              label="Status"
              value={
                <span className="inline-flex items-center gap-1.5 font-bold">
                  <span className="h-2 w-2 rounded-full bg-gold-500" />
                  Matched · pending pickup
                </span>
              }
            />
          </div>

          <div className="flex items-end justify-between border-t-2 border-dashed border-slate-200 pt-4 dark:border-slate-700">
            <div>
              <p className="font-ticket text-[9px] uppercase tracking-[0.25em] text-slate-400">Handover code</p>
              <div className="mt-1.5 inline-flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
                <QrCode size={44} className="text-midnight dark:text-white" />
                <span className="font-ticket text-[9px] tracking-widest text-slate-500 dark:text-slate-400">RUH-4F2K</span>
              </div>
            </div>

            <div className="relative flex rotate-[-8deg] items-center gap-1.5 rounded-lg border-2 border-rose-400/70 px-2.5 py-1.5 opacity-90">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              <span className="font-ticket text-[10px] font-bold uppercase tracking-[0.2em] text-rose-500">
                Matched
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function TicketRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-ticket text-[10px] uppercase tracking-[0.15em] text-slate-400">{label}</span>
      <span className="inline-flex items-center gap-1.5 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">
        {icon}
        {value}
      </span>
    </div>
  );
}