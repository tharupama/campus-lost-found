import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HandCoins, MapPin, QrCode } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import { claimService } from '../services';

export default function MyClaimsPage() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrClaim, setQrClaim] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    claimService
      .getMyClaims(page, pageSize)
      .then((data) => {
        setClaims(data.claims);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, pageSize]);

  if (loading) return <Spinner full />;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-4 md:pb-10">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-glow">
          <HandCoins size={20} />
        </span>
        <div>
          <h1 className="text-xl font-extrabold text-midnight dark:text-white">My Claims</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500">Track Pending → Approved → Handed Over</p>
        </div>
      </div>

      {claims.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <span className="mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-3xl shadow-card dark:bg-slate-900">📌</span>
          <p className="font-bold text-midnight dark:text-white">No claims yet</p>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Browse the feed and hit “This Is Mine” on something that looks familiar.</p>
          <Link to="/" className="btn-primary mt-4">Browse feed</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => {
            const item = claim.item;
            const isApproved = claim.status === 'approved';
            const isResolved = claim.status === 'resolved';
            return (
              <div key={claim._id} className="flex gap-3 rounded-2xl bg-white p-3 shadow-card dark:bg-slate-900">
                {item?.image ? (
                  <Link to={item ? `/items/${item._id}` : '#'} className="h-20 w-24 shrink-0 overflow-hidden rounded-xl">
                    <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                  </Link>
                ) : (
                  <span className="flex h-20 w-24 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl dark:bg-slate-800">🖼️</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-midnight dark:text-white">{item?.title || 'Item'}</p>
                    <Badge color={claim.status}>{claim.status === 'resolved' ? 'handed over' : claim.status}</Badge>
                  </div>
                  <p className="mb-1 text-xs text-slate-400 dark:text-slate-500">
                    {item?.location && <span className="inline-flex items-center gap-0.5"><MapPin size={11} /> {item.location}</span>}{' '}
                    · claimed {formatDistanceToNow(new Date(claim.createdAt), { addSuffix: true })}
                  </p>
                  <p className="line-clamp-1 text-xs text-slate-500 italic dark:text-slate-400">“{claim.proofAnswer}”</p>
                  {isApproved && (
                    <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 dark:bg-emerald-500/10">
                      <p className="text-[11px] font-semibold text-emerald-700">
                        Approved! Show this QR at the security desk.
                      </p>
                      <button
                        onClick={() => setQrClaim(claim)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-700"
                      >
                        <QrCode size={13} /> Show code
                      </button>
                    </div>
                  )}
                  {isResolved && (
                    <p className="mt-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Handed over at the security desk. Case closed — enjoy your item back!
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        onChangePage={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
      />

      <Modal open={Boolean(qrClaim)} onClose={() => setQrClaim(null)} title="Your handover QR code">
        {qrClaim && (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-2xl border-4 border-midnight bg-white p-4 dark:border-white dark:bg-slate-900">
              <QRCodeSVG value={`${qrClaim._id}::${qrClaim.claimant}`} size={220} />
            </div>
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Show this at the security desk for{' '}
              <span className="font-bold text-midnight dark:text-white">{qrClaim.item?.title}</span>. The guard scans it to verify
              your claim is approved and hands over the item.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}