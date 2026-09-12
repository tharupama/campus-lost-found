import { useNavigate } from 'react-router-dom';
import { Bell, BellRing, Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import { useNotifications } from '../contexts/NotificationContext';

export default function NotificationsPage() {
  const { notifications, unread, markAllRead } = useNotifications();
  const navigate = useNavigate();

  if (!notifications.length) return <Spinner full />;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-4 md:pb-10">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-glow">
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold">
                {unread}
              </span>
            )}
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-midnight">Alerts</h1>
            <p className="text-sm text-slate-400">Match alerts &amp; claim updates</p>
          </div>
        </div>
        {unread > 0 && (
          <button className="btn-ghost !py-2 text-xs" onClick={markAllRead}>
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {notifications.map((n) => (
          <button
            key={n._id}
            onClick={() => n.link && navigate(n.link)}
            className={`flex w-full items-start gap-3 rounded-2xl p-4 text-left shadow-card transition hover:shadow-glow ${
              n.read ? 'bg-white' : 'bg-brand-50 ring-1 ring-brand-200'
            }`}
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-500 shadow-card">
              {n.type === 'match' ? <BellRing size={17} /> : n.type === 'claim' ? <HandIcon /> : <Mail size={17} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="mb-0.5 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-bold text-midnight">{n.title}</span>
                <Badge color={n.type}>{n.type}</Badge>
              </span>
              <span className="block text-xs leading-relaxed text-slate-500">{n.message}</span>
              <span className="mt-1 block text-[11px] text-slate-400">
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function HandIcon() {
  return <EmojiIcon label="claim">🤝</EmojiIcon>;
}

function EmojiIcon({ children, label }) {
  return <span role="img" aria-label={label} className="text-base">{children}</span>;
}