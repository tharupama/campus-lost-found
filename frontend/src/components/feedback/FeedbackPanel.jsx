import { useCallback, useEffect, useState } from 'react';
import { MessageSquareQuote } from 'lucide-react';
import FeedbackForm from './FeedbackForm';
import FeedbackCard from './FeedbackCard';
import Pagination from '../ui/Pagination';
import Spinner from '../ui/Spinner';
import { feedbackService } from '../../services';

export default function FeedbackPanel() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async (p, s) => {
    setLoading(true);
    try {
      const data = await feedbackService.getMine(p, s);
      setFeedback(data.feedback || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page, pageSize);
  }, [load, page, pageSize]);

  function handleSubmitted() {
    if (page === 1) load(1, pageSize);
    else setPage(1);
  }

  return (
    <div className="space-y-4">
      <FeedbackForm onSubmitted={handleSubmitted} />

      <div>
        <h3 className="mb-2 text-sm font-extrabold text-midnight dark:text-white">Your feedback</h3>

        {loading ? (
          <Spinner />
        ) : feedback.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl bg-white px-4 py-10 text-center shadow-card dark:bg-slate-900">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
              <MessageSquareQuote size={22} />
            </span>
            <p className="text-sm font-bold text-midnight dark:text-white">Nothing sent yet</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400 dark:text-slate-500">
              Your first note lands here. The admin team reads every one and marks it reviewed.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {feedback.map((f) => (
              <FeedbackCard key={f._id} feedback={f} />
            ))}
          </div>
        )}

        {total > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            onChangePage={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        )}
      </div>
    </div>
  );
}
