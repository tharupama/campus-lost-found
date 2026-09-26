const BRAND = '#4f46e5';
const GOLD = '#f3b619';
const SLATE = '#94a3b8';
const ROSE = '#e11d48';
const EMERALD = '#10b981';
const VIOLET = '#8b5cf6';

export const CHART_COLORS = [BRAND, GOLD, EMERALD, VIOLET, ROSE, SLATE];

export function StatTile({ icon: Icon, label, value, hint, tone = 'brand' }) {
  const tones = {
    brand: 'from-brand-700 to-gold-600',
    rose: 'from-rose-500 to-rose-600',
    emerald: 'from-emerald-500 to-teal-600',
    violet: 'from-violet-500 to-brand-600',
    slate: 'from-slate-500 to-slate-600',
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${tones[tone]}`}>
            <Icon size={18} />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {label}
          </p>
          <p className="text-xl font-black leading-tight text-midnight dark:text-white">{value}</p>
          {hint && <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

export function Panel({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`rounded-2xl bg-white p-5 shadow-card dark:bg-slate-900 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-extrabold text-midnight dark:text-white">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Legend({ items }) {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((it) => (
        <li key={it.label} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: it.color }} />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

function niceMax(value) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

function GridLines({ top, height, count = 4 }) {
  return (
    <>
      {Array.from({ length: count + 1 }, (_, i) => {
        const y = top + (height / count) * i;
        return <line key={i} x1={0} x2={600} y1={y} y2={y} className="stroke-slate-200 dark:stroke-slate-800" strokeWidth={1} />;
      })}
    </>
  );
}

function smoothPath(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}

export function AreaChart({ series, height = 200, labels = [] }) {
  const top = 10;
  const plot = height - top - 24;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const step = 600 / Math.max(1, series[0].values.length - 1);

  const line = (values) =>
    smoothPath(values.map((v, i) => [i * step, top + plot - (v / max) * plot]));

  const area = (values) => {
    const pts = values.map((v, i) => [i * step, top + plot - (v / max) * plot]);
    if (!pts.length) return '';
    return `${line(values)} L ${pts[pts.length - 1][0]} ${top + plot} L ${pts[0][0]} ${top + plot} Z`;
  };

  return (
    <div>
      <svg viewBox={`0 0 600 ${height}`} className="w-full" role="img" aria-label="Trend over time">
        <GridLines top={top} height={plot} />
        {series.map((s) => (
          <g key={s.label}>
            <path d={area(s.values)} fill={s.color} opacity={0.12} />
            <path d={line(s.values)} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinecap="round" />
          </g>
        ))}
        {series[0]?.values.map((_, i) =>
          i % Math.ceil(series[0].values.length / 6) === 0 ? (
            <text
              key={i}
              x={i * step}
              y={height - 6}
              textAnchor={i === 0 ? 'start' : 'middle'}
              className="fill-slate-400 text-[10px]"
            >
              {labels[i] || ''}
            </text>
          ) : null
        )}
      </svg>
      <Legend items={series.map((s) => ({ label: s.label, color: s.color }))} />
    </div>
  );
}

export function BarChart({ data, height = 200, horizontal = false, color = BRAND }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  if (horizontal) {
    return (
      <ul className="space-y-2.5">
        {data.map((d) => (
          <li key={d.key}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-xs font-semibold text-slate-600 dark:text-slate-300">{d.key}</span>
              <span className="text-xs font-bold text-midnight dark:text-white">{d.count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${(d.count / max) * 100}%`, background: d.color || color }}
              />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  const top = 10;
  const plot = height - top - 24;
  const slot = 600 / Math.max(1, data.length);

  return (
    <div>
      <svg viewBox={`0 0 600 ${height}`} className="w-full" role="img" aria-label="Breakdown by category">
        <GridLines top={top} height={plot} count={3} />
        {data.map((d, i) => {
          const h = (d.count / max) * plot;
          return (
            <g key={d.key}>
              <rect
                x={i * slot + slot * 0.18}
                y={top + plot - h}
                width={slot * 0.64}
                height={Math.max(h, d.count > 0 ? 2 : 0)}
                rx={4}
                fill={d.color || color}
              />
              <text x={i * slot + slot / 2} y={height - 6} textAnchor="middle" className="fill-slate-400 text-[10px]">
                {d.key.length > 9 ? `${d.key.slice(0, 8)}…` : d.key}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function DonutChart({ data, size = 180, thickness = 26, centerLabel, centerValue }) {
  const total = data.reduce((a, d) => a + d.count, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label="Share by type">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={thickness}
            className="stroke-slate-100 dark:stroke-slate-800"
          />
          {total > 0 &&
            data.map((d) => {
              const len = (d.count / total) * circumference;
              const el = (
                <circle
                  key={d.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${len} ${circumference - len}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-midnight dark:text-white">{centerValue ?? total}</span>
          {centerLabel && <span className="text-[10px] uppercase tracking-wide text-slate-400">{centerLabel}</span>}
        </div>
      </div>
      <ul className="w-full space-y-1.5">
        {data.map((d) => (
          <li key={d.key} className="flex items-center justify-between gap-3 text-xs">
            <span className="inline-flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
              {d.key}
            </span>
            <span className="font-bold text-midnight dark:text-white">
              {d.count}
              <span className="ml-1 font-medium text-slate-400">
                {total ? Math.round((d.count / total) * 100) : 0}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProgressBar({ label, value, total, color = BRAND }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold capitalize text-slate-600 dark:text-slate-300">{label}</span>
        <span className="text-xs font-bold text-midnight dark:text-white">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
