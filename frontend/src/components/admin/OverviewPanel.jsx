import { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  HandCoins,
  TrendingUp,
  Archive,
} from 'lucide-react';
import Spinner from '../ui/Spinner';
import toast from 'react-hot-toast';
import { adminService } from '../../services';
import { FEEDBACK_CATEGORIES, CATEGORIES } from '../../config/constants';
import {
  StatTile,
  Panel,
  AreaChart,
  BarChart,
  DonutChart,
  ProgressBar,
  CHART_COLORS,
} from '../charts';

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

const STATUS_COLORS = {
  active: CHART_COLORS[0],
  claimed: CHART_COLORS[1],
  resolved: CHART_COLORS[2],
  pending: CHART_COLORS[1],
  approved: CHART_COLORS[2],
  rejected: CHART_COLORS[4],
  lost: CHART_COLORS[0],
  found: CHART_COLORS[2],
  bug: CHART_COLORS[4],
  feature: CHART_COLORS[0],
  usability: CHART_COLORS[3],
  content: CHART_COLORS[1],
  other: CHART_COLORS[5],
  student: CHART_COLORS[0],
  guard: CHART_COLORS[1],
  admin: CHART_COLORS[3],
  user: CHART_COLORS[5],
  new: CHART_COLORS[4],
  reviewed: CHART_COLORS[2],
};

const withColor = (rows, labels) =>
  rows.map((r) => ({
    ...r,
    key: labels?.[r.key] || r.key,
    color: STATUS_COLORS[r.key] || CHART_COLORS[5],
  }));

const shortDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export default function OverviewPanel() {
  const [range, setRange] = useState(30);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (days) => {
    setLoading(true);
    try {
      setStats(await adminService.getStats(days));
    } catch {
      toast.error('Could not load insights');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(range);
  }, [load, range]);

  if (loading && !stats) return <Spinner label="Crunching the numbers…" />;

  const t = stats?.totals || {};
  const timeline = stats?.timeline || [];
  // feedbackByCategory is scoped to the selected range while totals.feedback is
  // all-time, so the bars must be normalised against the range subtotal.
  const feedbackTotal = (stats?.feedbackByCategory || []).reduce((a, f) => a + f.count, 0);

  return (
    <div className="space-y-4">
      <div className="mb-5 flex flex-wrap items-center justify-end gap-3 md:justify-between">
        <div className="hidden items-center gap-3 md:flex">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 to-gold-600 text-white shadow-glow">
            <LayoutDashboard size={20} />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-midnight dark:text-white">Overview</h1>
            <p className="text-sm text-slate-400 dark:text-slate-500">How the lost &amp; found desk is performing</p>
          </div>
        </div>
        <div className="flex gap-1.5 rounded-2xl bg-white p-1.5 shadow-card dark:bg-slate-900">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setRange(r.days)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                range === r.days
                  ? 'bg-brand-600 text-white shadow-card'
                  : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Package} label="Total reports" value={t.items ?? 0} hint={`${t.lost ?? 0} lost · ${t.found ?? 0} found`} />
        <StatTile icon={HandCoins} label="Claims awaiting review" value={t.pendingClaims ?? 0} hint={`${t.claims ?? 0} filed all time`} tone="rose" />
        <StatTile icon={Archive} label="In the guard vault" value={t.inVault ?? 0} hint={`${t.awaitingDropOff ?? 0} not dropped off yet`} tone="emerald" />
        <StatTile icon={TrendingUp} label="Resolution rate" value={`${t.resolutionRate ?? 0}%`} hint={`avg ${t.avgResolutionDays ?? 0}d to hand over`} tone="violet" />
      </div>

      <Panel title="Reports over time" subtitle={`Lost vs found items, last ${stats?.range ?? range} days`}>
        {timeline.every((d) => d.lost === 0 && d.found === 0) ? (
          <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">No reports in this window yet.</p>
        ) : (
          <AreaChart
            height={210}
            labels={timeline.map((d) => shortDate(d.date))}
            series={[
              { label: 'Lost', color: STATUS_COLORS.lost, values: timeline.map((d) => d.lost) },
              { label: 'Found', color: STATUS_COLORS.found, values: timeline.map((d) => d.found) },
            ]}
          />
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Lost vs found" subtitle="Every report ever made">
          <DonutChart
            data={withColor(stats?.itemsByType || [])}
            centerLabel="reports"
            centerValue={t.items ?? 0}
          />
        </Panel>

        <Panel title="Claim pipeline" subtitle="Every claim and where it ended up">
          <div className="space-y-3">
            {(stats?.claimsByStatus || []).map((c) => (
              <ProgressBar
                key={c.key}
                label={c.key}
                value={c.count}
                total={t.claims ?? 0}
                color={STATUS_COLORS[c.key]}
              />
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="What people lose" subtitle={`Top categories, last ${stats?.range ?? range} days`}>
          {(stats?.itemsByCategory || []).length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">No items in this window yet.</p>
          ) : (
            <BarChart
              horizontal
              data={(stats?.itemsByCategory || []).map((c) => ({
                key: c.key,
                count: c.count,
                color: CHART_COLORS[(CATEGORIES || []).indexOf(c.key) % CHART_COLORS.length] || CHART_COLORS[0],
              }))}
            />
          )}
        </Panel>

        <Panel title="Where items surface" subtitle={`Top locations, last ${stats?.range ?? range} days`}>
          {(stats?.topLocations || []).length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">No locations in this window yet.</p>
          ) : (
            <BarChart
              horizontal
              color={CHART_COLORS[2]}
              data={(stats?.topLocations || []).map((l, i) => ({
                key: l.key,
                count: l.count,
                color: CHART_COLORS[i % CHART_COLORS.length],
              }))}
            />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Item status" subtitle="Where every report sits">
          <div className="space-y-3">
            {(stats?.itemsByStatus || []).map((s) => (
              <ProgressBar
                key={s.key}
                label={s.key}
                value={s.count}
                total={t.items ?? 0}
                color={STATUS_COLORS[s.key]}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Who is using it" subtitle="Accounts by role">
          {(stats?.usersByRole || []).length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">No accounts yet.</p>
          ) : (
            <div className="space-y-3">
              {(stats?.usersByRole || []).map((r) => (
                <ProgressBar
                  key={r.key}
                  label={r.key}
                  value={r.count}
                  total={t.users ?? 0}
                  color={STATUS_COLORS[r.key]}
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="What people tell you" subtitle={`Feedback mix, last ${stats?.range ?? range} days`}>
          <div className="space-y-3">
            {withColor(stats?.feedbackByCategory || []).map((f) => (
              <ProgressBar
                key={f.key}
                label={FEEDBACK_CATEGORIES.find((c) => c.key === f.key)?.label || f.key}
                value={f.count}
                total={feedbackTotal}
                color={STATUS_COLORS[f.key]}
              />
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
