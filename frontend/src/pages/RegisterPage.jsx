import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Mail,
  MailCheck,
  UserRound,
  Phone,
  Lock,
  Loader2,
  Building2,
  ChevronLeft,
  Check,
  Send,
  RotateCcw,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import UoRBadge from '../components/ui/UoRBadge';
import AuthModeToggle from '../components/ui/AuthModeToggle';

const UNIVERSITY_EMAIL_RE = /^[A-Za-z0-9._%+-]+@fot\.ruh\.ac\.lk$/i;
const MOBILE_RE = /^[0-9+\-\s()]{7,20}$/;
const DRAFT_KEY = 'clf_register_draft';
const OTP_LENGTH = 6;

const STEPS = [
  { label: 'Verify email', hint: 'Enter the OTP we email you', icon: MailCheck },
  { label: 'Your details', hint: 'Username, mobile & address', icon: UserRound },
  { label: 'Set password', hint: 'Secure your new account', icon: Lock },
];

function loadDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
  } catch {
    return {};
  }
}

const STRENGTH_LEVELS = [
  { label: '', bar: 'bg-slate-200', text: 'text-slate-400' },
  { label: 'Too weak', bar: 'bg-rose-500', text: 'text-rose-500' },
  { label: 'Weak', bar: 'bg-orange-500', text: 'text-orange-500' },
  { label: 'Fair', bar: 'bg-amber-400', text: 'text-amber-500' },
  { label: 'Good', bar: 'bg-lime-500', text: 'text-lime-600' },
  { label: 'Strong', bar: 'bg-emerald-500', text: 'text-emerald-600' },
];

function scorePassword(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 6) score += 1;
  if (pw.length >= 10) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return Math.min(score, 5);
}

function PasswordStrength({ password }) {
  const score = scorePassword(password);
  const level = STRENGTH_LEVELS[score];
  const rules = [
    { met: password.length >= 6, label: 'At least 6 characters' },
    { met: /[a-z]/.test(password) && /[A-Z]/.test(password), label: 'Upper & lower case' },
    { met: /\d/.test(password), label: 'At least one number' },
    { met: /[^A-Za-z0-9]/.test(password), label: 'At least one symbol' },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1.5">
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i < score ? level.bar : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
        <span className={`w-[74px] text-right text-xs font-bold transition-colors ${level.text}`}>
          {level.label}
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {rules.map((rule) => (
          <li
            key={rule.label}
            className={`flex items-center gap-1.5 text-[11px] transition-colors ${
              rule.met ? 'font-semibold text-emerald-600' : 'text-slate-400'
            }`}
          >
            {rule.met ? (
              <Check size={12} strokeWidth={3} className="shrink-0" />
            ) : (
              <X size={12} strokeWidth={2.5} className="shrink-0" />
            )}
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stepper({ step, visited, onSelect }) {
  // Track spans from the centre of step 1 to the centre of the last step (2/3 of the row).
  const progress = ((step - 1) / (STEPS.length - 1)) * (200 / 3);
  return (
    <div className="mb-6">
      <div className="relative">
        <div className="absolute left-[16.67%] right-[16.67%] top-5 h-1 rounded-full bg-slate-200" />
        <motion.div
          className="absolute left-[16.67%] top-5 h-1 rounded-full bg-gradient-to-r from-brand-500 to-brand-700"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          style={{ maxWidth: '66.67%' }}
        />
        <div className="relative flex">
          {STEPS.map((s, i) => {
            const idx = i + 1;
            const done = step > idx;
            const active = step === idx;
            const reachable = idx <= visited;
            return (
              <button
                key={s.label}
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onSelect(idx)}
                className="flex w-1/3 flex-col items-center gap-1.5 px-1 disabled:cursor-not-allowed"
              >
                <span
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition ${
                    done
                      ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-200'
                      : active
                        ? 'border-brand-600 bg-white text-brand-600 ring-4 ring-brand-100'
                        : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  {done ? <Check size={18} strokeWidth={3} /> : idx}
                </span>
                <span
                  className={`text-center text-[11px] font-bold leading-tight ${
                    active ? 'text-brand-600' : done ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700"
          initial={{ width: 0 }}
          animate={{ width: `${(step / STEPS.length) * 100}%` }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />
      </div>
      <p className="mt-1.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
        Step {step} of {STEPS.length} · {STEPS[step - 1].hint}
      </p>
    </div>
  );
}

export default function RegisterPage() {
  const { startRegistration, verifyRegistrationOtp, completeRegistration } = useAuth();
  const navigate = useNavigate();

  const draft = useRef(loadDraft()).current;
  const initialStep = draft.regToken ? draft.step || 2 : 1;

  const [step, setStep] = useState(Math.min(Math.max(initialStep, 1), 3));
  const [visited, setVisited] = useState(Math.max(draft.visited || 1, initialStep));
  const [email, setEmail] = useState(draft.email || '');
  const [otpSent, setOtpSent] = useState(Boolean(draft.otpSent));
  const [regToken, setRegToken] = useState(draft.regToken || '');
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [username, setUsername] = useState(draft.username || '');
  const [mobileNumber, setMobileNumber] = useState(draft.mobileNumber || '');
  const [address, setAddress] = useState(draft.address || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const otpRefs = useRef([]);

  useEffect(() => {
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ step, visited, email, otpSent, regToken, username, mobileNumber, address })
    );
  }, [step, visited, email, otpSent, regToken, username, mobileNumber, address]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function clearError(field) {
    setErrors((e) => {
      if (!e[field]) return e;
      const next = { ...e };
      delete next[field];
      return next;
    });
  }

  function goTo(target) {
    setStep(target);
    setVisited((v) => Math.max(v, target));
  }

  function resetWizard() {
    setRegToken('');
    setOtpSent(false);
    setOtp(Array(OTP_LENGTH).fill(''));
    setVisited(1);
    setStep(1);
    setPassword('');
    setConfirm('');
    setErrors({});
  }

  async function sendCode() {
    const mail = email.trim().toLowerCase();
    if (!mail) {
      return setErrors({ email: 'Email is required' });
    }
    if (!UNIVERSITY_EMAIL_RE.test(mail)) {
      return setErrors({ email: 'Use your Faculty of Technology student email — must end with @fot.ruh.ac.lk' });
    }
    setErrors({});
    setLoading(true);
    try {
      const data = await startRegistration(mail);
      setEmail(mail);
      setOtp(Array(OTP_LENGTH).fill(''));
      setOtpSent(true);
      setCooldown(data.cooldownSeconds || 30);
      toast.success('Confirmation code sent — check your inbox.');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      const payload = err.response?.data;
      if (err.response?.status === 429 && payload?.retryAfter) setCooldown(payload.retryAfter);
      toast.error(payload?.message || 'Could not send the confirmation code');
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e) {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      return setErrors({ otp: `Enter the ${OTP_LENGTH}-digit code` });
    }
    setErrors({});
    setLoading(true);
    try {
      const data = await verifyRegistrationOtp(email, code);
      setRegToken(data.regToken);
      goTo(2);
      toast.success('Email confirmed!');
    } catch (err) {
      const payload = err.response?.data;
      toast.error(payload?.message || 'That code did not work');
      if (payload?.attemptsLeft === 0) setOtp(Array(OTP_LENGTH).fill(''));
    } finally {
      setLoading(false);
    }
  }

  function continueDetails(e) {
    e.preventDefault();
    const nextErrors = {};
    if (username.trim().length < 2) nextErrors.username = 'Username must be at least 2 characters';
    const mobile = mobileNumber.trim();
    const digits = mobile.replace(/\D/g, '');
    if (!mobile || !MOBILE_RE.test(mobile) || digits.length < 7 || digits.length > 15) {
      nextErrors.mobileNumber = 'Enter a valid mobile number (7–15 digits)';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    goTo(3);
  }

  async function finish(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!password) nextErrors.password = 'Password is required';
    else if (password.length < 6) nextErrors.password = 'Password must be at least 6 characters';
    else if (scorePassword(password) < 3)
      nextErrors.password = 'Password is too weak — strength must be at least Fair to continue';
    if (!confirm) nextErrors.confirm = 'Confirm your password';
    else if (confirm !== password) nextErrors.confirm = 'Passwords do not match';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      const user = await completeRegistration({
        regToken,
        username: username.trim(),
        mobileNumber: mobileNumber.trim(),
        address: address.trim(),
        password,
      });
      sessionStorage.removeItem(DRAFT_KEY);
      toast.success(user?.name ? `Welcome, ${user.name.split(' ')[0]}!` : 'Account created!');
      navigate('/feed', { replace: true });
    } catch (err) {
      const payload = err.response?.data;
      if (err.response?.status === 401) {
        resetWizard();
        toast.error(payload?.message || 'Your registration session expired — please start again.');
      } else {
        toast.error(payload?.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  }

  function useDifferentEmail() {
    resetWizard();
    setEmail('');
    sessionStorage.removeItem(DRAFT_KEY);
  }

  function handleOtpChange(i, raw) {
    const value = raw.replace(/\D/g, '');
    if (value.length > 1) {
      const chars = value.slice(0, OTP_LENGTH).split('');
      const next = Array(OTP_LENGTH).fill('');
      chars.forEach((c, k) => {
        next[k] = c;
      });
      setOtp(next);
      clearError('otp');
      otpRefs.current[Math.min(chars.length, OTP_LENGTH - 1)]?.focus();
      return;
    }
    const next = [...otp];
    next[i] = value;
    setOtp(next);
    clearError('otp');
    if (value && i < OTP_LENGTH - 1) otpRefs.current[i + 1]?.focus();
  }

  function handleOtpKeyDown(i, e) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && i > 0) otpRefs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) otpRefs.current[i + 1]?.focus();
  }

  function handleOtpPaste(e) {
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '');
    if (!text) return;
    e.preventDefault();
    handleOtpChange(0, text);
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
          <motion.div whileHover={{ rotate: -4, scale: 1.05 }} className="mb-4">
            <UoRBadge size="lg" />
          </motion.div>
          <h1 className="text-halo text-2xl font-black text-midnight dark:text-white">RUHUNA LOST &amp; FOUND</h1>
          <p className="text-halo mt-1 flex items-center gap-1.5 text-sm text-midnight dark:text-white">
            <Building2 size={15} />
            {'Faculty of Technology · University of Ruhuna'}
          </p>
        </div>

        <div className="auth-card rounded-3xl bg-white p-6 shadow-2xl">
          <AuthModeToggle mode="register" />

          <h2 className="text-lg font-extrabold text-midnight">Create your account</h2>
          <p className="mb-5 mt-1 text-sm text-slate-400">
            Three quick steps — verify your email, add your details, set a password.
          </p>

          <Stepper step={step} visited={visited} onSelect={setStep} />

          {step === 1 &&
            (regToken ? (
              <div className="flex flex-col items-center text-center">
                <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <MailCheck size={30} />
                </span>
                <h3 className="text-base font-extrabold text-midnight">Email confirmed</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  <span className="font-semibold text-slate-600">{email}</span> is verified. Continue to
                  add your details.
                </p>
                <button type="button" onClick={() => goTo(2)} className="btn-primary mt-6 w-full">
                  Continue to your details
                </button>
                <button
                  type="button"
                  onClick={useDifferentEmail}
                  className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
                >
                  <RotateCcw size={14} /> Use a different email
                </button>
              </div>
            ) : otpSent ? (
              <form onSubmit={verifyCode} className="space-y-4">
                <div className="text-center">
                  <span className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <Mail size={24} />
                  </span>
                  <h3 className="text-base font-extrabold text-midnight">Enter the code we sent</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    A {OTP_LENGTH}-digit code was sent to{' '}
                    <span className="font-semibold text-slate-600">{email}</span>. It expires in 10
                    minutes.
                  </p>
                </div>

                <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        otpRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={OTP_LENGTH}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className={`h-[52px] w-11 rounded-xl border text-center text-lg font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 ${
                        errors.otp ? 'border-red-400' : 'border-slate-200'
                      }`}
                      aria-label={`Digit ${i + 1}`}
                    />
                  ))}
                </div>
                {errors.otp && (
                  <p className="text-center text-xs font-medium text-red-500">{errors.otp}</p>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                  Verify email
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp(Array(OTP_LENGTH).fill(''));
                      setErrors({});
                    }}
                    className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-700"
                  >
                    <ChevronLeft size={15} /> Change email
                  </button>
                  <button
                    type="button"
                    disabled={cooldown > 0 || loading}
                    onClick={sendCode}
                    className="font-semibold text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); sendCode(); }} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-600">
                    University email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      className={`input-field pl-10${errors.email ? ' !border-red-400' : ''}`}
                      placeholder="you@fot.ruh.ac.lk"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearError('email');
                      }}
                      autoFocus
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Use your university email, e.g. name_2023xxxx@fot.ruh.ac.lk
                  </p>
                  {errors.email && (
                    <p className="mt-1 text-xs font-medium text-red-500">{errors.email}</p>
                  )}
                </div>

                <button type="submit" disabled={loading || cooldown > 0} className="btn-primary w-full">
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Send size={18} />
                  )}
                  {cooldown > 0 ? `Resend available in ${cooldown}s` : otpSent ? 'Send a new code' : 'Send confirmation code'}
                </button>

                <p className="text-center text-xs leading-relaxed text-slate-400">
                  We'll email you a one-time code — no confirmation links.
                </p>
              </form>
            ))}

          {step === 2 && (
            <form onSubmit={continueDetails} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-600">Username</label>
                <div className="relative">
                  <UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    className={`input-field pl-10${errors.username ? ' !border-red-400' : ''}`}
                    placeholder="How should we call you?"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      clearError('username');
                    }}
                    autoComplete="username"
                    autoFocus
                  />
                </div>
                {errors.username && (
                  <p className="mt-1 text-xs font-medium text-red-500">{errors.username}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-600">
                  Mobile number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="tel"
                    className={`input-field pl-10${errors.mobileNumber ? ' !border-red-400' : ''}`}
                    placeholder="07X XXX XXXX"
                    value={mobileNumber}
                    onChange={(e) => {
                      setMobileNumber(e.target.value);
                      clearError('mobileNumber');
                    }}
                    autoComplete="tel"
                  />
                </div>
                {errors.mobileNumber && (
                  <p className="mt-1 text-xs font-medium text-red-500">{errors.mobileNumber}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-600">
                  Address <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Residence / hostel / city"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  autoComplete="street-address"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-ghost flex items-center gap-1"
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  Continue
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={finish} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-600">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className={`input-field pl-10 pr-11${errors.password ? ' !border-red-400' : ''}`}
                    placeholder="Password (min 6 characters)"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearError('password');
                      clearError('confirm');
                    }}
                    autoComplete="new-password"
                    autoFocus
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
                {errors.password && (
                  <p className="mt-1 text-xs font-medium text-red-500">{errors.password}</p>
                )}
                <div className="mt-3">
                  <PasswordStrength password={password} />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-600">
                  Confirm password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className={`input-field pl-10 pr-11${errors.confirm ? ' !border-red-400' : ''}`}
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      clearError('confirm');
                    }}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirm && (
                  <p className="mt-1 text-xs font-medium text-red-500">{errors.confirm}</p>
                )}
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
                <span className="font-bold text-slate-600">Almost there:</span> your account is created
                only after you press Create account below.
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-ghost flex items-center gap-1"
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                  Create account
                </button>
              </div>
            </form>
          )}

          <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400">
            By creating an account you agree to the campus code of conduct.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
