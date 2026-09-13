import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, CalendarDays, ArrowLeft, HandCoins, SearchCheck, KeyRound, ShieldCheck } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ReportModal from '../components/ReportModal';
import { Field } from '../components/ui/Field';
import { itemService, claimService } from '../services';
import { useAuth } from '../contexts/AuthContext';

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claimOpen, setClaimOpen] = useState(false);
  const [foundReportOpen, setFoundReportOpen] = useState(false);
  const [proof, setProof] = useState('');
  const [note, setNote] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    itemService
      .getItem(id)
      .then((data) => setItem(data.item))
      .catch(() => toast.error('Item not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner full />;
  if (!item) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg font-bold">Item not found</p>
        <button className="btn-ghost" onClick={() => navigate('/')}>Back to feed</button>
      </div>
    );
  }

  const ownsItem = user?._id === item.createdBy?._id;
  const canClaim = user && !ownsItem && item.status === 'active';

  async function submitClaim(e) {
    e.preventDefault();
    if (!proof.trim()) return toast.error('Describe your proof or secret mark');
    if (!contactNumber.trim()) return toast.error('Add a contact number so security can reach you');
    setSubmitting(true);
    try {
      await claimService.createClaim({ itemId: item._id, proofAnswer: proof, note, contactNumber: contactNumber.trim() });
      toast.success('Claim submitted — security will review it');
      setClaimOpen(false);
      setProof('');
      setNote('');
      setContactNumber('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit claim');
    } finally {
      setSubmitting(false);
    }
  }

  function openClaimModal() {
    setContactNumber(user?.mobileNumber || '');
    setClaimOpen(true);
  }

  const isFound = item.type === 'found';

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-4">
      <button onClick={() => navigate(-1)} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-600 dark:text-slate-400">
        <ArrowLeft size={17} /> Back
      </button>

      <div className="overflow-hidden rounded-3xl bg-white shadow-card dark:bg-slate-900">
        <div className="relative">
          {item.image ? (
            <img src={item.image} alt={item.title} className="max-h-[420px] w-full object-cover" />
          ) : (
            <div className="flex h-56 items-center justify-center bg-gradient-to-br from-brand-100 to-violet-100 dark:from-brand-500/20 dark:to-violet-500/20">
              <ShieldCheck className="text-brand-300" size={56} />
            </div>
          )}
          <div className="absolute left-3 top-3 flex gap-1.5">
            <Badge color={item.type}>{item.type}</Badge>
            <Badge color={item.status}>{item.status}</Badge>
          </div>
        </div>

        <div className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-extrabold text-midnight dark:text-white">{item.title}</h1>
            <Badge color="system">{item.category}</Badge>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1"><MapPin size={15} /> {item.location}</span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={15} title="Date" />
              {format(new Date(item.date), 'PPP')} · {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
            </span>
          </div>

          {item.description && (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {item.description}
            </p>
          )}

          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-slate-800">
            <span>Reported by <span className="font-semibold text-slate-600 dark:text-slate-300">{item.createdBy?.name}</span></span>
            {isFound && item.status === 'active' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                <KeyRound size={12} /> Owner unlocked by secret mark
              </span>
            )}
          </div>

          {canClaim ? (
            isFound ? (
              <>
                <button className="btn-primary w-full" onClick={openClaimModal}>
                  <HandCoins size={18} /> This Is Mine!
                </button>
                <p className="text-center text-[11px] text-slate-400">
                  This is a <span className="font-semibold text-emerald-600">Found</span> item. If it's yours, claim it and answer the secret mark.
                </p>
              </>
            ) : (
              <>
                <button className="btn-primary w-full" onClick={() => setFoundReportOpen(true)}>
                  <SearchCheck size={18} /> I Found This!
                </button>
                <p className="text-center text-[11px] text-slate-400">
                  This is a <span className="font-semibold text-rose-600">Lost</span> item. If you found something like it, report it so we can match you with the owner.
                </p>
              </>
            )
          ) : ownsItem ? (
            <p className="w-full rounded-xl bg-brand-50 py-3 text-center text-sm font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
              You reported this item
            </p>
          ) : (
            <p className="w-full rounded-xl bg-slate-100 py-3 text-center text-sm font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {item.status === 'claimed' ? 'Already claimed — pending handover' : 'This item has been resolved'}
            </p>
          )}
        </div>
      </div>

      {foundReportOpen && (
        <ReportModal
          open={foundReportOpen}
          type="found"
          prefill={{ category: item.category, location: item.location }}
          onClose={() => setFoundReportOpen(false)}
        />
      )}

      <Modal open={claimOpen} onClose={() => setClaimOpen(false)} title="Claim this item">
        <form onSubmit={submitClaim} className="space-y-4">
          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            {isFound
              ? 'This item has a secret mark set by the finder. To prove it is yours, describe the secret mark exactly as you remember it.'
              : 'Describe identifying details only the real owner would know — color, stickers, scratches, contents, etc.'}
          </div>
          <Field label={isFound ? 'Secret mark answer' : 'Proof details'}>
            <textarea className="input-field min-h-24 resize-none" value={proof} onChange={(e) => setProof(e.target.value)} placeholder="Type your answer…" required />
          </Field>
          <Field label="Contact Number" hint="Security calls or texts this number to reach you for pickup">
            <input
              inputMode="tel"
              className="input-field"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder={user?.mobileNumber ? 'Prefilled from your profile — edit if needed' : 'e.g. 0777 123 456'}
              required
            />
          </Field>
          <Field label="Extra note (optional)">
            <input className="input-field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Where you left it, when…" />
          </Field>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Submitting…' : 'Submit claim'}
          </button>
          <p className="text-center text-[11px] text-slate-400">
            Security verifies answers side-by-side before approval.
          </p>
        </form>
      </Modal>
    </div>
  );
}