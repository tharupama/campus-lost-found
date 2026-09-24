import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, UserRound, Loader2, ShieldCheck, Building2, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { DEMO_ACCOUNTS, GOOGLE_CLIENT_ID } from '../config/constants';

export default function LoginPage() {
  const { login, register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');
  const gRef = useRef(null);
  const [mode, setMode] = useState(localStorage.getItem('clf_register_mode') === 'register' ? 'register' : 'login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  function redirectTarget(user) {
    if (next && next.startsWith('/feed')) return next;
    if (user.role === 'guard') return '/guard';
    return user.role === 'student' ? '/feed' : '/admin';
  }

  useEffect(() => {
    const scriptId = 'gsi-client';
    const start = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        ux_mode: 'popup',
        callback: (resp) => handleGoogleCredential(resp?.credential),
      });
      if (gRef.current && window.google) {
        window.google.accounts.id.renderButton(gRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'rect',
          text: 'continue_with',
          width: 340,
        });
      }
    };
    if (!document.getElementById(scriptId)) {
      const s = document.createElement('script');
      s.id = scriptId;
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = start;
      document.body.appendChild(s);
    } else {
      start();
    }
    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, []);

  async function handleGoogleCredential(credential) {
    if (!credential) return toast.error('Google sign-in returned no credential');
    setLoading(true);
    try {
      const user = await googleLogin(credential);
      toast.success(
        user.name ? `Welcome, ${user.name.split(' ')[0]}!` : 'Welcome!'
      );
      localStorage.removeItem('clf_register_mode');
      navigate(redirectTarget(user));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next) {
    localStorage.setItem('clf_register_mode', next);
    setMode(next);
    setUsername('');
    setEmail('');
    setPassword('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (mode === 'register') {
      if (!username || !email || !password) return toast.error('Fill in all the fields');
      if (password.length < 6) return toast.error('Password must be at least 6 characters');
    } else if (!email || !password) {
      return toast.error('Enter your campus email and password');
    }
    setLoading(true);
    try {
      const user =
        mode === 'register'
          ? await register({ username, email, password })
          : await login(email, password);
      toast.success(
        mode === 'register' ? 'Account created — welcome!' : `Welcome back, ${user.name.split(' ')[0]}!`
      );
      localStorage.removeItem('clf_register_mode');
      navigate(redirectTarget(user));
    } catch (err) {
      toast.error(err.response?.data?.message || (mode === 'register' ? 'Registration failed' : 'Login failed'));
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
            <GraduationCap size={30} className="text-white" />
          </motion.div>
          <h1 className="text-2xl font-black">LOST AND FOUND SYSTEM</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/70">
            <Building2 size={15} />
            {'University Of Ruhuna'}
          </p>
        </div>

        <div className="auth-card rounded-3xl bg-white p-6 shadow-2xl">
          <h2 className="text-lg font-extrabold text-midnight">
            {mode === 'register' ? 'Create your account' : 'Sign in with your campus account'}
          </h2>
          <p className="mb-5 mt-1 text-sm text-slate-400">
            {mode === 'register'
              ? 'One account to find and return things. You can add more details later.'
              : 'Single sign-on — one account to find and return things.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="relative">
                <UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  className="input-field pl-10"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
            )}
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
                placeholder={mode === 'register' ? 'Password (min 6 characters)' : 'Password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : mode === 'register' ? (
                <span>Create Account</span>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-3 text-right">
              <span
                onClick={() => navigate('/forgot-password')}
                className="cursor-pointer text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                Forgot password?
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => switchMode(mode === 'register' ? 'login' : 'register')}
            className="mt-4 w-full text-center text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            {mode === 'register' ? 'Already have an account? Sign in' : 'New student? Create an account'}
          </button>

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-bold uppercase text-slate-400">or</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div ref={gRef} className="flex justify-center" />
          <p className="mt-2 text-center text-[11px] text-slate-400">
            {mode === 'register' ? 'Sign up with Google — add your mobile and address later in Profile.' : 'Continue with your Google account.'}
          </p>

          {mode === 'login' && (
            <>
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
            </>
          )}

          <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-400">
            {mode === 'register'
              ? 'By creating an account you agree to the campus code of conduct.'
              : 'Having trouble? Visit the IT help desk to activate your campus SSO account.'}
          </p>
        </div>
      </motion.div>
    </div>
  );
}