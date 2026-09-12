import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, ShieldCheck, Building2, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { DEMO_ACCOUNTS } from '../config/constants';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return toast.error('Enter your campus email and password');
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(user.role === 'student' ? '/' : '/admin');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function quickLogin(acc) {
    setEmail(acc.email);
    setPassword(acc.password);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-800 via-brand-700 to-violet-800 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="mb-6 flex flex-col items-center text-center text-white">
          <motion.div
            whileHover={{ rotate: -4, scale: 1.05 }}
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15 backdrop-blur"
          >
            <span className="text-3xl font-black">C</span>
          </motion.div>
          <h1 className="text-2xl font-black">CampusLost</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/70">
            <Building2 size={15} />
            {import.meta.env.VITE_SCHOOL_NAME || 'Summerfield University'} · Lost &amp; Found
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-2xl">
          <h2 className="text-lg font-extrabold text-midnight">Sign in with your campus account</h2>
          <p className="mb-5 mt-1 text-sm text-slate-400">
            Single sign-on — one account to find and return things.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                className="input-field pl-10"
                placeholder="you@campus.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                className="input-field pl-10"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <span>Sign In</span>}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-bold uppercase text-slate-400">Demo access</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((acc) => {
              const Icon = acc.label === 'Admin' ? ShieldCheck : acc.label === 'Guard' ? Building2 : UserRound;
              return (
                <button
                  key={acc.label}
                  type="button"
                  onClick={() => quickLogin(acc)}
                  className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 py-3 transition hover:border-brand-400 hover:bg-brand-50"
                >
                  <Icon size={18} className="text-brand-500" />
                  <span className="text-xs font-bold text-slate-600">{acc.label}</span>
                  <span className="text-[10px] text-slate-400">tap to fill</span>
                </button>
              );
            })}
          </div>

          <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-400">
            Having trouble? Visit the IT help desk to activate your campus SSO account.
          </p>
        </div>
      </motion.div>
    </div>
  );
}