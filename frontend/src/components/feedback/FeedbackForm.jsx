import { useState } from 'react';
import toast from 'react-hot-toast';
import { Send, Bug, Lightbulb, Wand2, Database, Ellipsis, Loader2 } from 'lucide-react';
import { feedbackService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { FEEDBACK_CATEGORIES } from '../../config/constants';

const CATEGORY_ICONS = {
  bug: Bug,
  feature: Lightbulb,
  usability: Wand2,
  content: Database,
  other: Ellipsis,
};

const MAX_MESSAGE = 2000;

export default function FeedbackForm({ onSubmitted }) {
  const { user } = useAuth();
  const [category, setCategory] = useState('bug');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (message.trim().length < 10) return toast.error('Tell us a bit more — at least 10 characters');

    setSending(true);
    try {
      const data = await feedbackService.submit({ category, message: message.trim() });
      toast.success(data.message);
      setCategory('bug');
      setMessage('');
      onSubmitted?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send your feedback');
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <fieldset>
        <legend className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          What is it about?
        </legend>
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Feedback category">
          {FEEDBACK_CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c.key] || Ellipsis;
            const active = category === c.key;
            return (
              <button
                key={c.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setCategory(c.key)}
                className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                  active
                    ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200 dark:bg-brand-500/10 dark:ring-brand-500/30'
                    : 'border-slate-200 bg-white hover:border-brand-300 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-brand-500/40'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition ${
                    active
                      ? 'bg-gradient-to-br from-brand-700 to-gold-600 text-white'
                      : 'bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300'
                  }`}
                >
                  <Icon size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold text-midnight dark:text-white">{c.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {c.body}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6">
        <label
          htmlFor="feedback-message"
          className="mb-3 block text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500"
        >
          Tell us more
        </label>
        <textarea
          id="feedback-message"
          className="input-field"
          rows={5}
          maxLength={MAX_MESSAGE}
          placeholder="What happened, or what would make this better?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <span>At least 10 characters.</span>
          <span className={message.length > MAX_MESSAGE - 100 ? 'font-bold text-brand-600' : ''}>
            {message.length} / {MAX_MESSAGE}
          </span>
        </div>
      </div>

      <button type="submit" disabled={sending} className="btn-primary mt-5 w-full justify-center !py-3">
        {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
        {sending ? 'Sending…' : 'Send feedback'}
      </button>
      <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
        Sent as {user?.name} ({user?.email}). Admins are emailed and alerted instantly.
      </p>
    </form>
  );
}
