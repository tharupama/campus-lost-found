import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, Sun, Moon, Bell, LogOut, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import UoRBadge from '../ui/UoRBadge';

const BASE_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/feed', label: 'Feed', end: true },
  { to: '/about', label: 'About', end: false },
  { to: '/contact', label: 'Contact', end: false },
];

export default function SiteNav() {
  const { user, logout } = useAuth();
  const { unread } = useNotifications();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = [
    ...BASE_LINKS,
    ...(user && ['admin', 'guard'].includes(user.role)
      ? [{ to: user.role === 'guard' ? '/guard' : '/admin', label: user.role === 'guard' ? 'Guard' : 'Admin', end: false }]
      : []),
  ];

  function go(path) {
    setOpen(false);
    navigate(path);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Ruhuna Lost & Found home">
          <UoRBadge size="md" />
          <span className="leading-tight">
            <span className="block text-sm font-extrabold text-midnight dark:text-white">Ruhuna Lost & Found</span>
            <span className="block text-[11px] text-slate-400">Faculty of Technology</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-midnight dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {user ? (
            <>
              <button
                onClick={() => go('/notifications')}
                className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label="Notifications"
              >
                <Bell size={21} />
                {unread > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white"
                  >
                    {unread > 9 ? '9+' : unread}
                  </motion.span>
                )}
              </button>
              <button
                onClick={() => go('/profile')}
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-100 to-gold-100 text-sm font-extrabold text-brand-600 dark:from-brand-500/20 dark:to-gold-500/20 dark:text-brand-300"
                aria-label="My profile"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  user.name?.charAt(0).toUpperCase()
                )}
              </button>
              <button
                onClick={() => {
                  logout();
                  go('/login');
                }}
                className="rounded-xl p-2.5 text-slate-400 transition hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800"
                aria-label="Logout"
              >
                <LogOut size={19} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => go('/login')}
                className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:text-midnight sm:block dark:text-slate-300 dark:hover:text-white"
              >
                Sign in
              </button>
              <Link
                to="/login"
                className="hidden items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand-700 to-gold-600 px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:from-brand-800 hover:to-gold-700 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:inline-flex"
              >
                Get started
                <ArrowRight size={16} />
              </Link>
            </>
          )}

          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-xl p-2.5 text-slate-600 transition hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-slate-200/70 bg-white/95 backdrop-blur-lg md:hidden dark:border-slate-800 dark:bg-slate-950/95"
            aria-label="Mobile"
          >
            <div className="mx-auto max-w-6xl space-y-1 px-4 py-4 sm:px-6">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-xl px-3 py-3 text-base font-semibold transition ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              <div className="!mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                {user ? (
                  <>
                    <button onClick={() => go('/profile')} className="btn-ghost w-full justify-center">
                      My profile
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        go('/login');
                      }}
                      className="btn-ghost w-full justify-center hover:text-rose-500"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setOpen(false)} className="btn-primary w-full justify-center">
                      Get started
                    </Link>
                    <Link to="/login" onClick={() => setOpen(false)} className="btn-ghost w-full justify-center">
                      Sign in
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
