import { Home, HandCoins, Bell, ShieldCheck, Plus, MessageSquareQuote, Info, Mail } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useReport } from '../../contexts/ReportContext';
import { motion } from 'framer-motion';

const PUBLIC_LINKS = [
  { to: '/', icon: Home, label: 'Home', end: true },
  { to: '/about', icon: Info, label: 'About' },
  { to: '/contact', icon: Mail, label: 'Contact' },
];

export default function BottomNav() {
  const { user } = useAuth();
  const { unread } = useNotifications();
  const { openReport } = useReport();

  if (!user) {
    return (
      <NavFrame columns="grid-cols-3">
        {PUBLIC_LINKS.map((item) => (
          <NavItem key={item.to} item={item} />
        ))}
      </NavFrame>
    );
  }

  const isStaff = ['admin', 'guard'].includes(user.role);
  const feedback = { to: '/feedback', icon: MessageSquareQuote, label: 'Feedback' };

  const items = [
    { to: '/feed', icon: Home, label: 'Feed', end: true },
    isStaff ? feedback : { to: '/my-claims', icon: HandCoins, label: 'Claims' },
  ];

  const rightItems = [
    {
      to: '/notifications',
      icon: Bell,
      label: 'Alerts',
      dot: unread > 0,
    },
    isStaff
      ? {
          to: user.role === 'guard' ? '/guard' : '/admin',
          icon: ShieldCheck,
          label: user.role === 'guard' ? 'Guard' : 'Admin',
        }
      : feedback,
  ];

  return (
    <NavFrame columns="grid-cols-5">
      <NavItem item={items[0]} />
      <NavItem item={items[1]} />
      <button
        onClick={() => openReport()}
        className="relative -mt-5 flex flex-col items-center justify-center"
        aria-label="Report item"
      >
        <span className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 to-gold-600 text-white shadow-glow">
          <Plus size={26} />
        </span>
        <span className="mt-0.5 text-[10px] font-semibold text-slate-400">Report</span>
      </button>
      <NavItem item={rightItems[0]} />
      <NavItem item={rightItems[1]} />
    </NavFrame>
  );
}

function NavFrame({ columns, children }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/90 md:hidden">
      <div className={`mx-auto grid max-w-lg ${columns} items-center pb-[env(safe-area-inset-bottom)]`}>
        {children}
      </div>
    </nav>
  );
}

function NavItem({ item }) {
  return (
    <NavLink to={item.to} end={item.end} className="relative flex flex-col items-center py-2">
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="nav-pill"
              className="absolute -top-px h-0.5 w-8 rounded-full bg-brand-600"
            />
          )}
          <item.icon size={21} className={isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'} />
          <span
            className={`mt-0.5 text-[10px] font-semibold ${
              isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {item.label}
          </span>
          {item.dot && (
            <span className="absolute right-2 top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-rose-500">
              <span className="absolute h-full w-full animate-ping rounded-full bg-rose-500 opacity-60" />
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}