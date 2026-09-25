import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Building2,
  LifeBuoy,
  MapPin,
  Clock3,
  LogIn,
  ShieldCheck,
  UserRound,
  Mail,
  Phone,
  Send,
  MessageSquare,
} from 'lucide-react';
import SiteNav from '../components/layout/SiteNav';
import Footer from '../components/landing/Footer';
import { useAuth } from '../contexts/AuthContext';
import { contactService } from '../services';

const PICK = [
  {
    key: 'admin',
    label: 'Admin',
    icon: ShieldCheck,
    body: 'For system, account, and policy questions about the lost & found.',
  },
  {
    key: 'guard',
    label: 'Security guard',
    icon: Building2,
    body: 'For a lost or found item — handover, vault, or the guard desk.',
  },
];

export default function ContactPage() {
  const { user } = useAuth();
  const [recipient, setRecipient] = useState('admin');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [mobileNumber, setMobileNumber] = useState(user?.mobileNumber || '');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [staff, setStaff] = useState({ admins: [], guards: [] });

  useEffect(() => {
    contactService
      .getStaff()
      .then(setStaff)
      .catch(() => toast.error('Could not load the desk contact details'));
  }, []);

  const staffForRole = (role) => (role === 'admin' ? staff.admins : staff.guards);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return toast.error('Enter your name');
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return toast.error('Enter a valid email address');
    }
    if (message.trim().length < 5) return toast.error('Message should be at least 5 characters');
    setSending(true);
    try {
      const data = await contactService.send({
        recipientRole: recipient,
        name: name.trim(),
        email: email.trim(),
        mobileNumber: mobileNumber.trim(),
        message: message.trim(),
      });
      toast.success(data.message);
      setMessage('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send your message');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-slate-50 font-sans text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-100">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-600 dark:text-brand-400">
          Contact
        </p>
        <h1 className="mt-3 font-display text-4xl font-black tracking-tight text-midnight sm:text-5xl dark:text-white">
          Reach the lost &amp; found desk.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
          Send a message straight to the admin or security team. It arrives as a real-time alert on
          their desks — no phone call needed.
        </p>

        <div className="mt-10">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            1 · Who are you contacting?
          </p>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Contact recipient">
            {PICK.map((p) => {
              const Icon = p.icon;
              const active = recipient === p.key;
              const members = staffForRole(p.key);
              return (
                <button
                  key={p.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setRecipient(p.key)}
                  className={`flex items-start gap-3 rounded-2xl border p-5 text-left transition ${
                    active
                      ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200 dark:bg-brand-500/10 dark:ring-brand-500/30'
                      : 'border-slate-200 bg-white hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-500/40'
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition ${
                      active
                        ? 'bg-gradient-to-br from-brand-700 to-gold-600 text-white'
                        : 'bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300'
                    }`}
                  >
                    <Icon size={21} />
                  </span>
                  <span>
                    <span className={`block text-base font-extrabold text-midnight dark:text-white`}>
                      {p.label}
                    </span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                      {p.body}
                    </span>
                    {members.length > 0 && (
                      <span className="mt-3 block space-y-1.5 border-t border-slate-200 pt-3 dark:border-slate-800">
                        {members.map((m) => (
                          <span key={m._id} className="block space-y-0.5">
                            {m.name && (
                              <span className="block text-xs font-bold text-midnight dark:text-white">
                                {m.name}
                              </span>
                            )}
                            {m.email && (
                              <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                <Mail size={12} className="shrink-0 text-brand-500" />
                                {m.email}
                              </span>
                            )}
                            {m.mobileNumber && (
                              <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                <Phone size={12} className="shrink-0 text-brand-500" />
                                {m.mobileNumber}
                              </span>
                            )}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-10">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            2 · Your message
          </p>
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="relative">
                  <UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    className="input-field pl-10"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    className="input-field pl-10"
                    placeholder="Mobile number (optional)"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    autoComplete="tel"
                  />
                </div>
              </div>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  className="input-field pl-10"
                  placeholder="you@campus.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="relative">
                <MessageSquare className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                <textarea
                  className="input-field pl-10"
                  rows={5}
                  placeholder="What do you need help with?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" disabled={sending} className="btn-primary mt-5 w-full justify-center !py-3.5">
              <Send size={17} />
              {sending ? 'Sending…' : 'Send message'}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400 dark:text-slate-500">
              <Clock3 size={12} />
              Delivered instantly to every on-duty {recipient === 'admin' ? 'admin' : 'security guard'}.
            </p>
          </form>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            const MetaIcon = c.meta[0];
            return (
              <div
                key={c.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <Icon size={20} className="text-brand-500" />
                <h2 className="mt-3 text-sm font-extrabold text-midnight dark:text-white">{c.title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{c.body}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                  {MetaIcon && <MetaIcon size={12} />}
                  {c.meta[1]}
                </span>
              </div>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}

const CHANNELS = [
  {
    icon: Building2,
    title: 'Guard desk',
    body: 'Found something or collecting an item? Handovers happen here, in person.',
    meta: [MapPin, 'Main Gate'],
  },
  {
    icon: LifeBuoy,
    title: 'IT help desk',
    body: 'Can’t sign in or your campus SSO account is locked? The help desk sorts it out.',
    meta: [Clock3, 'Open during campus hours'],
  },
  {
    icon: LogIn,
    title: 'Campus account',
    body: 'Reporting, claims, and alerts all run through your university sign-in.',
    meta: [null, 'Students and staff'],
  },
];