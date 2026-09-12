import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Loader2, Send, ArrowLeft, MailCheck, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../services';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) return toast.error('Enter your email address');
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send reset link');
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
            <GraduationCap size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-black">CampusLost</h1>
          <p className="mt-1 text-sm text-white/70">Reset your password</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-2xl">
          {sent ? (
            <div className="flex flex-col items-center text-center">
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <MailCheck size={30} />
              </span>
              <h2 className="text-lg font-extrabold text-midnight">Check your inbox</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                If an account exists for <span className="font-semibold text-slate-600">{email}</span>, we sent a
                link to reset your password. It expires in 1 hour.
              </p>
              <Link to="/login" className="btn-primary mt-6">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-extrabold text-midnight">Forgot your password?</h2>
              <p className="mb-5 mt-1 text-sm text-slate-400">
                Enter your email and we'll send a secure link to set a new password.
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
                    autoFocus
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} Send reset link
                </button>
              </form>
              <Link to="/login" className="mt-5 flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700">
                <ArrowLeft size={15} /> Back to sign in
              </Link>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}