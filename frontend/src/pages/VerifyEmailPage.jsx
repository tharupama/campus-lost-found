import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, MailCheck, XCircle, ShieldCheck } from 'lucide-react';
import { authService } from '../services';
import UoRBadge from '../components/ui/UoRBadge';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState(token ? 'loading' : 'missing');
  const [error, setError] = useState('');
  const ranRef = useRef(false);

  useEffect(() => {
    if (!token || ranRef.current) return;
    ranRef.current = true;
    setStatus('loading');
    authService
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setError(err.response?.data?.message || 'Could not verify your email');
        setStatus('error');
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="mb-6 flex flex-col items-center text-center text-white">
          <div className="mb-4">
            <UoRBadge size="lg" />
          </div>
          <h1 className="text-2xl font-black">Ruhuna Lost &amp; Found</h1>
          <p className="mt-1 text-sm text-white/70">Confirm your email</p>
        </div>

        <div className="auth-card rounded-3xl bg-white p-6 shadow-2xl">
          {status === 'loading' && (
            <div className="flex flex-col items-center text-center">
              <Loader2 size={32} className="mb-4 animate-spin text-brand-500" />
              <h2 className="text-lg font-extrabold text-midnight">Confirming your email…</h2>
              <p className="mt-2 text-sm text-slate-400">Just a moment while we activate your account.</p>
            </div>
          )}

          {status === 'missing' && (
            <div className="flex flex-col items-center text-center">
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <ShieldCheck size={28} />
              </span>
              <h2 className="text-lg font-extrabold text-midnight">Invalid confirmation link</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                This link is missing or invalid. Request a new confirmation email from the sign-in page.
              </p>
              <Link to="/login" className="btn-primary mt-6 w-full">
                Back to sign in
              </Link>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center text-center">
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <MailCheck size={30} />
              </span>
              <h2 className="text-lg font-extrabold text-midnight">Email confirmed!</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Your account is now active. You can sign in with your campus credentials.
              </p>
              <Link to="/login" className="btn-primary mt-6 w-full">
                Sign in now
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center text-center">
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
                <XCircle size={30} />
              </span>
              <h2 className="text-lg font-extrabold text-midnight">Verification failed</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {error} You can request a new confirmation link from the sign-in page.
              </p>
              <Link to="/login" className="btn-primary mt-6 w-full">
                Back to sign in
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}