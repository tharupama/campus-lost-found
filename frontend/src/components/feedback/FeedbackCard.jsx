import { formatDistanceToNow } from 'date-fns';
import Badge from '../ui/Badge';
import { FEEDBACK_CATEGORIES } from '../../config/constants';

export default function FeedbackCard({ feedback }) {
  const category = FEEDBACK_CATEGORIES.find((c) => c.key === feedback.category);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge color="feedback">{category?.label || feedback.category}</Badge>
        <Badge color={feedback.status}>{feedback.status}</Badge>
        <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500">
          {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}
        </span>
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {feedback.message}
      </p>
      {feedback.status === 'reviewed' && feedback.reviewedBy && (
        <p className="mt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          Reviewed by {feedback.reviewedBy.name}
          {feedback.reviewedAt
            ? ` · ${formatDistanceToNow(new Date(feedback.reviewedAt), { addSuffix: true })}`
            : ''}
        </p>
      )}
    </div>
  );
}
