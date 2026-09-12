import { useEffect, useState } from 'react';
import { ShieldCheck, HandCoins, Archive, ScanLine, Check, X, QrCode, KeyRound, Loader2, PackageCheck, PackageX } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import QrScanner from '../components/ui/QrScanner';
import { adminService } from '../services';

const TABS = [
  { key: 'claims', icon: HandCoins, label: 'Claims' },
  { key: 'vault', icon: Archive, label: 'Vault' },
  { key: 'scan', icon: ScanLine, label: 'Scan' },
];

export default function AdminPage() {
  const [tab, setTab] = useState('claims');
  const [claims, setClaims] = useState([]);
  const [vault, setVault] = useState([]);
  const [approvedClaims, setApprovedClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [filter, setFilter] = useState('pending');
  const [qrItem, setQrItem] = useState(null);
  const [scanCode, setScanCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const pendingDropOffs = vault.filter((i) => i.type === 'found' && i.handoverStatus !== 'in_vault');
  const vaultItems = vault.filter((i) => !pendingDropOffs.includes(i));

  const refreshPendingCount = async () => {
    try {
      const data = await adminService.getClaims('pending');
      setPendingCount(data.claims.length);
    } catch {
      // silent
    }
  };

  const loadClaims = async (status = filter) => {
    setLoading(true);
    try {
      const data = await adminService.getClaims(status);
      setClaims(data.claims);
    } catch {
      toast.error('Could not load claims');
    } finally {
      setLoading(false);
    }
    setTab('claims');
  };

  const loadVault = async () => {
    setLoading(true);
    try {
      const [vaultData, approvedData] = await Promise.all([
        adminService.getVault(),
        adminService.getClaims('approved'),
      ]);
      setVault(vaultData.items);
      setApprovedClaims(approvedData.claims);
    } catch {
      toast.error('Could not load vault');
    } finally {
      setLoading(false);
    }
    setTab('vault');
  };

  useEffect(() => {
    loadClaims('pending');
    refreshPendingCount();
  }, []);

  const claimForItem = (itemId) =>
    approvedClaims.find((c) => String(c.item?._id) === String(itemId));

  async function review(claim, status) {
    const confirmed = await Swal.fire({
      icon: 'question',
      title: `${status === 'approved' ? 'Approve' : 'Reject'} this claim?`,
      text: `Claim by ${claim.claimant?.name} on "${claim.item?.title}".`,
      showCancelButton: true,
      confirmButtonText: `Yes, ${status}`,
      confirmButtonColor: status === 'approved' ? '#4f46e5' : '#e11d48',
      cancelButtonColor: '#64748b',
    });
    if (!confirmed.isConfirmed) return;
    try {
      await adminService.reviewClaim(claim._id, status);
      toast.success(`Claim ${status}`);
      refreshPendingCount();
      loadClaims(filter);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  }

  async function doHandover({ claimId, claimantId }) {
    setVerifying(true);
    try {
      const { message } = await adminService.handover({ claimId, claimantId });
      toast.success(message);
      setScanCode('');
      await loadVault();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Handover verification failed');
      return false;
    } finally {
      setVerifying(false);
    }
  }

  async function markAvailable(item) {
    const confirmed = await Swal.fire({
      icon: 'question',
      title: 'Mark item as available?',
      text: `Confirm "${item.title}" is now stored in the guard room. This makes it visible in the public feed.`,
      showCancelButton: true,
      confirmButtonText: 'Yes, mark available',
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#64748b',
    });
    if (!confirmed.isConfirmed) return;
    try {
      const { message } = await adminService.markItemAvailable(item._id);
      toast.success(message);
      await loadVault();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not mark item as available');
    }
  }

  async function verifyCode(code) {
    const trimmed = (code || '').trim();
    if (!trimmed) {
      toast.error('Paste the claimant\u2019s QR code');
      return false;
    }
    const [claimId, ...rest] = trimmed.includes('::') ? trimmed.split('::') : [trimmed, ''];
    return doHandover({ claimId, claimantId: rest.join('::') || claimId });
  }

  async function handleScan(e) {
    e.preventDefault();
    await verifyCode(scanCode);
    if (scanCode) {
      setScanCode('');
    }
  }

  function openQr(item) {
    const claim = claimForItem(item._id);
    setQrItem({ item, claim });
  }

  function handoverCard(item) {
    const claim = claimForItem(item._id);
    if (!claim) return null;
    return doHandover({ claimId: claim._id, claimantId: claim.claimant?._id });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-4 md:pb-10">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 text-white shadow-glow">
            <ShieldCheck size={20} />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-midnight">Security Panel</h1>
            <p className="text-sm text-slate-400">Claim review · vault · QR handover</p>
          </div>
        </div>
      </div>

      <div className="mb-5 flex gap-2 rounded-2xl bg-white p-1.5 shadow-card">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={t.key === 'vault' ? loadVault : t.key === 'scan' ? () => setTab('scan') : () => loadClaims()}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition ${
              tab === t.key ? 'bg-brand-600 text-white shadow-card' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <t.icon size={16} />
            {t.label}
            {t.key === 'claims' && pendingCount > 0 && (
              <span className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] ${tab === t.key ? 'bg-white text-brand-600' : 'bg-rose-500 text-white'}`}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'claims' && (
        <div>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {[['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['resolved', 'Resolved']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setFilter(key); loadClaims(key); }}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition ${
                  filter === key ? 'bg-brand-600 text-white' : 'bg-white text-slate-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {loading ? (
            <Spinner />
          ) : claims.length === 0 ? (
            <Empty text="No claims in this state yet" />
          ) : (
            <div className="space-y-4">
              {claims.map((claim) => (
                <ClaimReviewCard key={claim._id} claim={claim} onApprove={() => review(claim, 'approved')} onReject={() => review(claim, 'rejected')} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'vault' && (
        <div>
          <p className="mb-3 text-sm text-slate-400">{vault.length} reported items · in-vault items are live in the public feed · QR unlocks on approved claim</p>
          {loading ? (
            <Spinner />
          ) : vault.length === 0 ? (
            <Empty text="Vault is empty" />
          ) : (
            <>
              {pendingDropOffs.length > 0 && (
                <div className="mb-6">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                      <PackageX size={15} />
                    </span>
                    <h2 className="text-sm font-extrabold text-midnight">
                      Awaiting drop-off · {pendingDropOffs.length}
                    </h2>
                    <span className="text-[11px] text-slate-400">hidden from public feed until verified</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {pendingDropOffs.map((item) => (
                      <div key={item._id} className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-card">
                        <div className="relative aspect-[4/3]">
                          <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                          <div className="absolute left-2 top-2 flex gap-1">
                            <Badge color="found">found</Badge>
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                              pending
                            </span>
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="truncate text-sm font-bold text-midnight">{item.title}</p>
                          <p className="mb-2 line-clamp-1 text-xs text-slate-400">
                            {item.category} · {item.location}
                            {item.createdBy && <span className="block truncate text-slate-400">held by {item.createdBy.name}</span>}
                          </p>
                          <button onClick={() => markAvailable(item)} className="btn-primary w-full !px-2 !py-2 text-xs">
                            <PackageCheck size={14} /> Mark available in guard room
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {vaultItems.map((item) => {
                const claim = claimForItem(item._id);
                const hasClaim = Boolean(claim);
                return (
                  <div key={item._id} className="overflow-hidden rounded-2xl bg-white shadow-card">
                    <div className="relative aspect-[4/3]">
                      <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                      <div className="absolute left-2 top-2 flex gap-1">
                        <Badge color={item.type}>{item.type}</Badge>
                        <Badge color={item.status}>{item.status}</Badge>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-bold text-midnight">{item.title}</p>
                      <p className="mb-2 line-clamp-1 text-xs text-slate-400">
                        {item.category} · {item.location}
                        {hasClaim && <span className="block truncate text-brand-500">→ {claim.claimant?.name}</span>}
                      </p>
                      {hasClaim ? (
                        <div className="flex items-center justify-between gap-2">
                          <button onClick={() => openQr(item)} className="btn-ghost flex-1 !px-2 !py-2 text-xs">
                            <QrCode size={14} /> QR
                          </button>
                          <button
                            onClick={() => handoverCard(item)}
                            className="btn-primary flex-1 !px-2 !py-2 text-xs"
                          >
                            <KeyRound size={14} /> Hand over
                          </button>
                        </div>
                      ) : (
                        <p className="rounded-xl bg-slate-50 py-2 text-center text-[11px] font-semibold text-slate-400">
                          No approved claim yet
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'scan' && (
        <div className="mx-auto max-w-md space-y-4">
          <div className="rounded-3xl bg-white p-6 text-center shadow-card">
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-50 text-brand-600">
              <ScanLine size={28} />
            </span>
            <h2 className="text-lg font-extrabold text-midnight">Scan QR at handover desk</h2>
            <p className="mt-1 text-sm text-slate-400">
              Point the camera at the approved claimant's QR (from their My Claims page). Verified instantly — no copy-paste needed.
            </p>
            <div className="mt-4">
              <QrScanner
                onResult={(code) => verifyCode(code)}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-card">
            <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
              No camera? Paste the code manually
            </p>
            <form onSubmit={handleScan} className="space-y-3">
              <input
                className="input-field text-center"
                placeholder="Paste claimant QR code (claimId::studentId)"
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
              />
              <button type="submit" disabled={verifying} className="btn-primary w-full">
                {verifying ? <Loader2 className="animate-spin" size={18} /> : <ScanLine size={18} />} Verify &amp; Resolve
              </button>
            </form>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-card">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Approved claims ready for handover</p>
            {approvedClaims.filter((c) => c.item?.status !== 'resolved').length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">Nothing waiting. Approve a claim to queue it here.</p>
            ) : (
              <div className="space-y-2">
                {approvedClaims.filter((c) => c.item?.status !== 'resolved').map((claim) => (
                  <button
                    key={claim._id}
                    onClick={() => doHandover({ claimId: claim._id, claimantId: claim.claimant?._id })}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-2 text-left transition hover:border-brand-300 hover:bg-brand-50"
                  >
                    <img src={claim.item?.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-midnight">{claim.item?.title}</span>
                      <span className="block truncate text-[11px] text-slate-400">
                        {claim.item?.location} · to {claim.claimant?.name} ({claim.claimant?.studentId || claim.claimant?.email})
                      </span>
                    </span>
                    <span className="text-[11px] font-semibold text-brand-600">hand over</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {qrItem && (
          <Modal title="Claimant Handover QR" onClose={() => setQrItem(null)} open>
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-2xl border-4 border-midnight bg-white p-4">
                <QRCodeSVG value={`${qrItem.claim._id}::${qrItem.claim.claimant?._id}`} size={200} />
              </div>
              <p className="text-center text-sm text-slate-500">
                Approved claimant for <span className="font-bold text-midnight">{qrItem.item.title}</span> is{' '}
                <span className="font-bold text-brand-600">{qrItem.claim.claimant?.name}</span>. Show this at the desk — security scans it to verify and resolve.
              </p>
              <Badge color="approved">approved</Badge>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-2xl shadow-card">📭</span>
      <p className="font-bold text-midnight">{text}</p>
    </div>
  );
}

function ClaimReviewCard({ claim, onApprove, onReject }) {
  const item = claim.item;
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <Badge color={claim.status}>{claim.status}</Badge>
        <span className="text-[11px] text-slate-400">claimed {formatDistanceToNow(new Date(claim.createdAt), { addSuffix: true })}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr]">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Item</p>
          {item?.image && <img src={item.image} alt={item.title} className="mb-2 h-20 w-full rounded-lg object-cover" />}
          <p className="text-sm font-bold text-midnight">{item?.title}</p>
          <p className="text-xs text-slate-400">{item?.category} · {item?.location}</p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Claimant</p>
          <p className="text-sm font-bold text-midnight">{claim.claimant?.name}</p>
          <p className="text-xs text-slate-400">{claim.claimant?.email}</p>
          <p className="mt-2 rounded-lg bg-white p-2.5 text-xs leading-relaxed text-slate-600">
            <span className="font-semibold">Proof:</span> “{claim.proofAnswer}”
          </p>
          {claim.note && <p className="mt-1.5 text-[11px] italic text-slate-400">note: {claim.note}</p>}
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            {item?.type === 'found' ? 'Secret mark (hidden from public)' : 'Match check'}
          </p>
          {item?.type === 'found' ? (
            <p className="rounded-lg bg-white p-2.5 text-xs leading-relaxed text-slate-600">
              <span className="font-semibold">Finder stored:</span> “{item.secretFeature || '—'}”
            </p>
          ) : (
            <p className="rounded-lg bg-white p-2.5 text-xs leading-relaxed text-slate-600">
              Verify the claimant's details match this lost report.
            </p>
          )}
        </div>
      </div>

      {claim.status === 'pending' ? (
        <div className="mt-4 flex gap-3">
          <button onClick={onReject} className="btn-ghost flex-1 border-rose-200 !text-rose-600 hover:bg-rose-50">
            <X size={16} /> Reject
          </button>
          <button onClick={onApprove} className="btn-primary flex-1">
            <Check size={16} /> Approve
          </button>
        </div>
      ) : (
        <div className={`mt-4 rounded-xl py-3 text-center text-sm font-semibold ${claim.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
          {claim.status === 'approved'
            ? 'Approved · awaiting handover at desk'
            : claim.status === 'resolved'
              ? 'Resolved · item handed over ✓'
              : 'Rejected by ' + (claim.reviewedBy?.name || 'security')}
        </div>
      )}
    </motion.div>
  );
}