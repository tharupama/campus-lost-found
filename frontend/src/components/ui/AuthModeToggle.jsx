import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';

const MODES = [
  { key: 'login', label: 'Sign in', icon: LogIn, to: '/login' },
  { key: 'register', label: 'Create account', icon: UserPlus, to: '/register' },
];

export default function AuthModeToggle({ mode, onSwitch }) {
  const navigate = useNavigate();

  function goTo(target) {
    if (target.key === mode) return;
    onSwitch?.(target.key);
    navigate(target.to);
  }

  return (
    <div
      className="relative mb-5 grid grid-cols-2 gap-1 rounded-full bg-slate-100 p-1"
      role="group"
      aria-label="Switch between signing in and creating an account"
    >
      {MODES.map((m) => {
        const active = m.key === mode;
        const Icon = m.icon;
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => goTo(m)}
            aria-current={active ? 'page' : undefined}
            className={`relative rounded-full px-4 py-2.5 text-sm font-bold transition-colors ${
              active ? 'text-white' : 'text-slate-500 hover:bg-white/70 hover:text-slate-700'
            }`}
          >
            {active && (
              <motion.span
                layoutId="authModePill"
                initial={false}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-full bg-gradient-to-r from-brand-600 to-brand-700 shadow-glow"
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Icon size={16} />
              {m.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
