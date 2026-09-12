import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Loader2, KeyRound, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../services';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token) return toast.error('Reset link is missing the token');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    if (password !== confirm) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      toast.success('Password updated — you can now sign in!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
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
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15 backdrop-blur">
            <span className="text-3xl font-black">C</span>
          </div>
          <h1 className="text-2xl font-black">CampusLost</h1>
          <p className="mt-1 text-sm text-white/70">Choose a new password</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-2xl">
          {!token ? (
            <div className="flex flex-col items-center text-center">
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <ShieldCheck size={28} />
              </span>
              <h2 className="text-lg font-extrabold text-midnight">Invalid reset link</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                This link is missing or invalid. Request a new one to reset your password.
              </p>
              <Link to="/forgot-password" className="btn-primary mt-6">
                Request a new link
              </Link>
            </div>
          ) : (
            <>
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-midnight">
                <KeyRound size={19} /> Set a new password
              </h2>
              <p className="mb-5 mt-1 text-sm text-slate-400">Minimum 6 characters.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="password"
                    className="input-field pl-10"
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    autoComplete="new-password"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="password"
                    className="input-field pl-10"
                    placeholder="Confirm new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <span>Update password</span>}
                </button>
              </form>
              <Link to="/login" className="mt-5 block text-center text-sm font-semibold text-brand-600 hover:text-brand-700">
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}