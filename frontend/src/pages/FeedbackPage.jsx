import { MessageSquareQuote } from 'lucide-react';
import FeedbackPanel from '../components/feedback/FeedbackPanel';

export default function FeedbackPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-4 md:pb-10">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 to-gold-600 text-white shadow-glow">
          <MessageSquareQuote size={20} />
        </span>
        <div>
          <h1 className="text-xl font-extrabold text-midnight dark:text-white">Feedback</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500">Tell us what is working and what is not</p>
        </div>
      </div>

      <FeedbackPanel />
    </div>
  );
}
