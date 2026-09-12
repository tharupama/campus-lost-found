import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, GraduationCap, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { motion } from 'framer-motion';

export default function TopBar() {
  const { user, logout } = useAuth();
  const { unread } = useNotifications();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-glow">
            <GraduationCap size={20} className="text-white" />
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-amber-400" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-extrabold text-midnight dark:text-white">CampusLost</p>
            <p className="text-[11px] text-slate-400">Lost &amp; Found</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={() => navigate('/notifications')}
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
          {user && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate('/profile')}
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-100 to-violet-100 text-sm font-extrabold text-brand-600 dark:from-brand-500/20 dark:to-violet-500/20 dark:text-brand-300"
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
                  navigate('/login');
                }}
                className="rounded-xl p-2.5 text-slate-400 transition hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800"
                aria-label="Logout"
              >
                <LogOut size={19} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}