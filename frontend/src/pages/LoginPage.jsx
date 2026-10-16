import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, UserRound, Loader2, ShieldCheck, Building2, Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { DEMO_ACCOUNTS } from '../config/constants';
import UoRBadge from '../components/ui/UoRBadge';
import AuthModeToggle from '../components/ui/AuthModeToggle';

export default function LoginPage() {
  const { login, completeTwoFactor } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mfaToken, setMfaToken] = useState(null);
  const [code, setCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);

  function redirectTarget(user) {
    // Only same-origin absolute paths, so `next` can never bounce off-site.
    if (next && /^\/(?!\/)/.test(next)) return next;
    if (user.role === 'guard') return '/guard';
    return user.role === 'student' ? '/feed' : '/admin';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      return toast.error('Enter your campus email and password');
    }
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.mfaRequired) {
        setMfaToken(result.mfaToken);
        setCode('');
        setRecoveryMode(false);
        toast('Enter the code from your authenticator app');
        return;
      }
      const user = result.user;
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(redirectTarget(user));
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'emailNotVerified') {
        toast.error(data?.message || 'Your account has not been verified yet. Visit the IT help desk to activate it.');
      } else {
        toast.error(data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    if (!code.trim()) {
      return toast.error(recoveryMode ? 'Enter a recovery code' : 'Enter the 6-digit code');
    }
    setLoading(true);
    try {
      const user = await completeTwoFactor({ mfaToken, code: code.trim(), rememberDevice });
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(redirectTarget(user));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  function quickLogin(acc) {
    setEmail(acc.email);
    setPassword(acc.password);
  }

  return (
    <div className="dark relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
      <img
        src="/images/loginback.webp"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-6 flex flex-col items-center text-center text-white">
          <motion.div
            whileHover={{ rotate: -4, scale: 1.05 }}
            className="mb-4"
          >
            <UoRBadge size="lg" />
          </motion.div>
          <h1 className="text-halo text-2xl font-black text-midnight dark:text-white">RUHUNA LOST &amp; FOUND</h1>
          <p className="text-halo mt-1 flex items-center gap-1.5 text-sm text-midnight dark:text-white">
            <Building2 size={15} />
            {'Faculty of Technology · University of Ruhuna'}
          </p>
        </div>

        <div className="auth-card rounded-3xl bg-white p-6 shadow-2xl">
          {mfaToken ? (
            <>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <ShieldCheck size={20} />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold text-midnight">Two-factor verification</h2>
                  <p className="text-xs text-slate-400">
                    {recoveryMode ? 'Enter one of your saved recovery codes.' : 'Enter the 6-digit code from your authenticator app.'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    inputMode={recoveryMode ? 'text' : 'numeric'}
                    autoFocus
                    className="input-field pl-10 tracking-[0.3em]"
                    placeholder={recoveryMode ? 'XXXXX-XXXXX' : '••••••'}
                    maxLength={recoveryMode ? 11 : 6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    autoComplete="one-time-code"
                  />
                </div>

                {!recoveryMode && (
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-500">
                    <input
                      type="checkbox"
                      checked={rememberDevice}
                      onChange={(e) => setRememberDevice(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    Remember this device for 30 days
                  </label>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <span>Verify &amp; sign in</span>}
                </button>
              </form>

              <div className="mt-4 flex items-center justify-between text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryMode((v) => !v);
                    setCode('');
                  }}
                  className="text-brand-600 hover:text-brand-700"
                >
                  {recoveryMode ? 'Use authenticator code' : 'Use a recovery code'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMfaToken(null);
                    setCode('');
                    setRecoveryMode(false);
                  }}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600"
                >
                  <ArrowLeft size={13} /> Back
                </button>
              </div>
            </>
          ) : (
            <>
              <AuthModeToggle mode="login" />

              <h2 className="text-lg font-extrabold text-midnight">Sign in with your campus account</h2>
              <p className="mb-5 mt-1 text-sm text-slate-400">
                Single sign-on — one account to find and return things.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      className="input-field pl-10"
                      placeholder="you@campus.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input-field pl-10 pr-11"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <span>Sign In</span>}
                </button>
              </form>

              <div className="mt-3 text-right">
                <span
                  onClick={() => navigate('/forgot-password')}
                  className="cursor-pointer text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  Forgot password?
                </span>
              </div>

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
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
