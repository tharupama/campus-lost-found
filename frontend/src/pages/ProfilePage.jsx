import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Loader2,
  Save,
  ShieldCheck,
  UserRound,
  HandCoins,
  PackageSearch,
  ChevronRight,
  QrCode,
  MapPin,
  ShieldOff,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { Field } from '../components/ui/Field';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import Pagination from '../components/ui/Pagination';
import { authService, claimService, itemService } from '../services';

const TABS = [
  { key: 'claims', icon: HandCoins, label: 'Claims' },
  { key: 'found', icon: PackageSearch, label: 'Found' },
  { key: 'lost', icon: PackageSearch, label: 'Lost' },
];

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    mobileNumber: '',
    address: '',
    currentPassword: '',
    newPassword: '',
  });
  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [activityTab, setActivityTab] = useState('claims');
  const [claims, setClaims] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [qrClaim, setQrClaim] = useState(null);
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState(10);

  useEffect(() => {
    Promise.all([claimService.getMyClaims(1, 100), itemService.getMyItems('', 1, 100)])
      .then(([claimsData, itemsData]) => {
        setClaims(claimsData.claims);
        setMyItems(itemsData.items);
      })
      .catch(() => {})
      .finally(() => setActivityLoading(false));
  }, []);

  useEffect(() => {
    setActivityPage(1);
  }, [activityTab]);

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        name: user.name || '',
        mobileNumber: user.mobileNumber || '',
        address: user.address || '',
      }));
      setPreview(user.avatar || null);
    }
  }, [user]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const paginate = (arr) => {
    const start = (activityPage - 1) * activityPageSize;
    return arr.slice(start, start + activityPageSize);
  };

  const activitySource =
    activityTab === 'claims' ? claims : myItems.filter((i) => i.type === activityTab);

  const tabCount = (key) =>
    key === 'claims' ? claims.length : myItems.filter((i) => i.type === key).length;

  function applyFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image must be under 8MB');
      return;
    }
    setAvatar(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  }

  function onFileChange(e) {
    applyFile(e.target.files?.[0]);
    e.target.value = '';
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Username cannot be empty');
    if (form.newPassword && form.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (form.newPassword && !form.currentPassword) {
      toast.error('Enter your current password to change it');
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('mobileNumber', form.mobileNumber.trim());
      fd.append('address', form.address.trim());
      if (avatar) fd.append('avatar', avatar);
      if (form.newPassword) {
        fd.append('currentPassword', form.currentPassword);
        fd.append('newPassword', form.newPassword);
      }

      const { user: updated, message } = await authService.updateProfile(fd);
      updateUser(updated);
      toast.success(message || 'Profile updated');
      setForm((f) => ({ ...f, currentPassword: '', newPassword: '' }));
      setAvatar(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-4 md:pb-10">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 to-gold-600 text-white shadow-glow">
          <UserRound size={20} />
        </span>
        <div>
          <h1 className="text-xl font-extrabold text-midnight dark:text-white">My Profile</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500">Keep your contact details up to date</p>
        </div>
        {user && ['admin', 'guard'].includes(user.role) && (
          <button onClick={() => navigate(user.role === 'guard' ? '/guard' : '/admin')} className="btn-ghost ml-auto !px-3 !py-2 text-xs">
            <ShieldCheck size={15} /> Security Panel
          </button>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 md:items-start md:gap-5">
        <div className="rounded-3xl bg-white p-5 shadow-card dark:bg-slate-900">
          <Field label="Profile Picture">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setAvatarOpen(true)}
                className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-brand-400 dark:border-slate-700 dark:bg-slate-800"
              >
                {preview ? (
                  <img src={preview} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <UserRound size={28} className="text-slate-300" />
                )}
                <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white shadow-card">
                  <Camera size={13} />
                </span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
              <p className="text-xs leading-relaxed text-slate-400 dark:text-slate-500">
                Choose a photo so people recognize you when you pick up or hand over items.
              </p>
            </div>
          </Field>

          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Username">
                <input className="input-field" value={form.name} onChange={set('name')} placeholder="Your username" />
              </Field>
              <Field label="Email">
                <input className="input-field bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400" value={user?.email || ''} disabled />
              </Field>
            </div>

            <Field label="Mobile Number">
              <input
                className="input-field"
                value={form.mobileNumber}
                onChange={set('mobileNumber')}
                placeholder="e.g. 0777 123 456"
                inputMode="tel"
              />
            </Field>

            <Field label="Address">
              <textarea
                className="input-field min-h-20 resize-none"
                value={form.address}
                onChange={set('address')}
                placeholder="Campus hall, room, hostel block…"
              />
            </Field>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-card dark:bg-slate-900">
          <p className="mb-1 text-sm font-extrabold text-midnight dark:text-white">Change Password</p>
          <p className="mb-4 text-xs text-slate-400 dark:text-slate-500">Leave blank to keep your current password</p>
          <div className="space-y-4">
            <Field label="Current Password">
              <input type="password" className="input-field" value={form.currentPassword} onChange={set('currentPassword')} placeholder="Current password" autoComplete="current-password" />
            </Field>
            <Field label="New Password" hint="At least 6 characters">
              <input type="password" className="input-field" value={form.newPassword} onChange={set('newPassword')} placeholder="New password" autoComplete="new-password" />
            </Field>
          </div>
        </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
          <button type="submit" disabled={saving} className="btn-primary w-full md:w-auto">
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save Changes
          </button>
        </div>
      </form>

      <TwoFactorCard />

      <Modal open={avatarOpen} onClose={() => setAvatarOpen(false)} title="Profile Picture">
        <div className="flex flex-col items-center justify-center gap-4">
          <div
            role="button"
            tabIndex={0}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              applyFile(e.dataTransfer.files?.[0]);
            }}
            className={`flex w-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-6 transition ${
              dragOver
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
            }`}
          >
            <div className="h-48 w-48 shrink-0 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-card dark:border-slate-700 dark:bg-slate-800">
              {preview ? (
                <img src={preview} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
                  <UserRound size={60} />
                </div>
              )}
            </div>
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              {dragOver ? 'Drop the image to set it' : 'Drag &amp; drop a photo here, or use the button below.'}
            </p>
          </div>

          <button type="button" onClick={() => fileRef.current?.click()} className="btn-primary w-full">
            <Camera size={16} /> Change Picture
          </button>
        </div>
      </Modal>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500">My Activity</h2>

        <div className="mb-4 flex gap-2 rounded-2xl bg-white p-1.5 shadow-card dark:bg-slate-900">
          {TABS.map((t) => {
            const count = tabCount(t.key);
            return (
              <button
                key={t.key}
                onClick={() => setActivityTab(t.key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition ${
                  activityTab === t.key ? 'bg-brand-600 text-white shadow-card' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                <t.icon size={15} />
                {t.label}
                {count > 0 && (
                  <span className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] ${activityTab === t.key ? 'bg-white text-brand-600' : 'bg-slate-100 text-slate-500'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activityLoading ? (
          <Spinner />
        ) : activityTab === 'claims' ? (
          <ActivityList
            items={paginate(claims)}
            empty={['No claims yet', 'Browse the feed and hit "This Is Mine" on something that looks familiar.', '/', 'Browse feed']}
            render={(claim) => {
              const item = claim.item;
              const isApproved = claim.status === 'approved';
              const isResolved = claim.status === 'resolved';
              return (
                <>
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-midnight dark:text-white">{item?.title || 'Item'}</p>
                      <Badge color={claim.status}>{isResolved ? 'handed over' : claim.status}</Badge>
                    </div>
                    <p className="mb-1 text-xs text-slate-400 dark:text-slate-500">
                      <MapPin size={11} className="inline" /> {item?.location || '—'} · claimed{' '}
                      {formatDistanceToNow(new Date(claim.createdAt), { addSuffix: true })}
                    </p>
                    <p className="line-clamp-1 text-xs text-slate-500 italic dark:text-slate-400">“{claim.proofAnswer}”</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {isApproved && (
                      <button
                        onClick={() => setQrClaim(claim)}
                        className="btn-ghost !px-2.5 !py-2 text-xs !text-emerald-700 hover:!bg-emerald-50 dark:!text-emerald-400 dark:hover:!bg-emerald-500/10"
                        title="Show handover QR"
                      >
                        <QrCode size={14} /> QR
                      </button>
                    )}
                    {item && (
                      <button
                        onClick={() => navigate(`/items/${item._id}`)}
                        className="btn-ghost !px-2.5 !py-2 text-xs"
                      >
                        View <ChevronRight size={13} />
                      </button>
                    )}
                  </div>
                </>
              );
            }}
          />
        ) : (
          <ActivityList
            items={paginate(myItems.filter((i) => i.type === activityTab))}
            empty={
              activityTab === 'found'
                ? ['No found items yet', 'Found something? Report it and drop it off at the guard room.', '/', 'Report an item']
                : ['No lost items yet', 'Lost something? Report it so the campus can help find it.', '/', 'Report an item']
            }
            render={(item) => {
              const handoverChip =
                item.type === 'found' && item.handoverStatus !== 'in_vault'
                  ? { label: 'awaiting drop-off', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' }
                  : item.type === 'found'
                    ? { label: 'in guard room', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' }
                    : null;
              return (
                <>
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-midnight dark:text-white">{item.title}</p>
                      <div className="flex shrink-0 items-center gap-1">
                        {handoverChip && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${handoverChip.cls}`}>
                            {handoverChip.label}
                          </span>
                        )}
                        <Badge color={item.status}>{item.status}</Badge>
                      </div>
                    </div>
                    <p className="mb-1 text-xs text-slate-400 dark:text-slate-500">
                      <MapPin size={11} className="inline" /> {item.location} · {item.category} · reported{' '}
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                    {item.type === 'found' && item.handoverStatus === 'pending' && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">
                        Hand it over to the guard room to make it visible publicly.
                      </p>
                    )}
                  </div>
                  <button onClick={() => navigate(`/items/${item._id}`)} className="btn-ghost shrink-0 !px-2.5 !py-2 text-xs">
                    View <ChevronRight size={13} />
                  </button>
                </>
              );
            }}
          />
        )}

        {activitySource.length > 0 && (
          <Pagination
            page={activityPage}
            pageSize={activityPageSize}
            total={activitySource.length}
            totalPages={Math.max(1, Math.ceil(activitySource.length / activityPageSize))}
            onChangePage={setActivityPage}
            onPageSizeChange={(s) => { setActivityPageSize(s); setActivityPage(1); }}
          />
        )}
      </div>

      <Modal open={Boolean(qrClaim)} onClose={() => setQrClaim(null)} title="Your handover QR code">
        {qrClaim && (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-2xl border-4 border-midnight bg-white p-4 dark:border-white dark:bg-slate-900">
              <QRCodeSVG value={`${qrClaim._id}::${qrClaim.claimant}`} size={200} />
            </div>
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Show this at the security desk for <span className="font-bold text-midnight dark:text-white">{qrClaim.item?.title}</span>.
              The guard scans it to verify your claim is approved and hands over the item.
            </p>
            <Badge color="approved">approved</Badge>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ActivityList({ items, empty, render }) {
  const navigate = useNavigate();
  const [title, subtitle, to, label] = empty;
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-3xl bg-white py-14 text-center shadow-card dark:bg-slate-900">
        <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-50 text-2xl dark:bg-slate-800">📭</span>
        <p className="font-bold text-midnight dark:text-white">{title}</p>
        <p className="mt-1 max-w-xs text-sm text-slate-400 dark:text-slate-500">{subtitle}</p>
        {to && (
          <button onClick={() => navigate(to)} className="btn-primary mt-4">
            {label}
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((entry, idx) => (
        <div key={entry._id || idx} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card dark:bg-slate-900">
          {entry?.item?.image || entry.image ? (
            <img
              src={entry.item?.image || entry.image}
              alt={entry.item?.title || entry.title}
              className="h-20 w-24 shrink-0 cursor-pointer rounded-xl object-cover"
              onClick={() => navigate(`/items/${(entry.item || entry)._id}`)}
            />
          ) : (
            <span className="flex h-20 w-24 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl dark:bg-slate-800">🖼️</span>
          )}
          <div className="min-w-0 flex-1">{render(entry)}</div>
        </div>
      ))}
    </div>
  );
}

function RecoveryCodes({ codes, onDone, onCopy, copied }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-amber-50 p-3 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
        Save these codes somewhere safe. Each one works once if you lose your authenticator, and you will not see them again.
      </div>
      <div className="grid grid-cols-2 gap-2">
        {codes.map((c) => (
          <code
            key={c}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm font-bold tracking-wide text-midnight dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            {c}
          </code>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCopy} className="btn-ghost flex-1">
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy all'}
        </button>
        <button type="button" onClick={onDone} className="btn-primary flex-1">
          I&apos;ve saved them
        </button>
      </div>
    </div>
  );
}

function TwoFactorCard() {
  const [status, setStatus] = useState({ enabled: false, recoveryCodesRemaining: 0 });
  const [statusLoading, setStatusLoading] = useState(true);
  const [mode, setMode] = useState(null);
  const [setup, setSetup] = useState(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    authService
      .getTwoFactorStatus()
      .then((data) => active && setStatus(data))
      .catch(() => {})
      .finally(() => active && setStatusLoading(false));
    return () => {
      active = false;
    };
  }, []);

  function reset() {
    setMode(null);
    setSetup(null);
    setCode('');
    setPassword('');
    setCodes(null);
    setCopied(false);
    setBusy(false);
  }

  async function startEnable() {
    setMode('enable');
    setSetup(null);
    setCodes(null);
    setCode('');
    setSetupLoading(true);
    try {
      const data = await authService.setupTwoFactor();
      setSetup(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start 2FA setup');
      setMode(null);
    } finally {
      setSetupLoading(false);
    }
  }

  async function submitEnable(e) {
    e.preventDefault();
    if (code.trim().length < 6) return toast.error('Enter the 6-digit code');
    setBusy(true);
    try {
      const data = await authService.enableTwoFactor(code.trim());
      setCodes(data.recoveryCodes || []);
      setStatus({ enabled: true, recoveryCodesRemaining: (data.recoveryCodes || []).length });
      toast.success(data.message || 'Two-factor authentication enabled');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not enable 2FA');
    } finally {
      setBusy(false);
    }
  }

  async function submitDisable(e) {
    e.preventDefault();
    if (!password) return toast.error('Enter your password');
    setBusy(true);
    try {
      await authService.disableTwoFactor(password);
      setStatus({ enabled: false, recoveryCodesRemaining: 0 });
      toast.success('Two-factor authentication disabled');
      reset();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not disable 2FA');
    } finally {
      setBusy(false);
    }
  }

  async function submitRegenerate(e) {
    e.preventDefault();
    if (!password) return toast.error('Enter your password');
    setBusy(true);
    try {
      const data = await authService.regenerateRecoveryCodes(password);
      setCodes(data.recoveryCodes || []);
      setStatus((s) => ({ ...s, recoveryCodesRemaining: (data.recoveryCodes || []).length }));
      toast.success('New recovery codes generated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not regenerate codes');
    } finally {
      setBusy(false);
    }
  }

  async function copyCodes() {
    try {
      await navigator.clipboard.writeText((codes || []).join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed — select the codes manually');
    }
  }

  return (
    <>
      <div className="mt-6 rounded-3xl bg-white p-5 shadow-card dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
              status.enabled ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
            }`}
          >
            {status.enabled ? <ShieldCheck size={20} /> : <ShieldOff size={20} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-extrabold text-midnight dark:text-white">
              Two-factor authentication
              {status.enabled && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                  On
                </span>
              )}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {statusLoading
                ? 'Checking status…'
                : status.enabled
                  ? `Authenticator app · ${status.recoveryCodesRemaining} recovery code${status.recoveryCodesRemaining === 1 ? '' : 's'} left`
                  : 'Add a code from your authenticator app for extra security.'}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {status.enabled ? (
              <>
                <button type="button" onClick={() => { setMode('regen'); setCode(''); setPassword(''); setCodes(null); }} className="btn-ghost !px-3 !py-2 text-xs">
                  <RefreshCw size={14} /> Recovery codes
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('disable'); setPassword(''); }}
                  className="btn-ghost !px-3 !py-2 text-xs !text-rose-600 hover:!bg-rose-50 dark:!text-rose-400 dark:hover:!bg-rose-500/10"
                >
                  <ShieldOff size={14} /> Disable
                </button>
              </>
            ) : (
              <button type="button" onClick={startEnable} disabled={statusLoading} className="btn-primary !px-4 !py-2 text-xs">
                <ShieldCheck size={14} /> Enable 2FA
              </button>
            )}
          </div>
        </div>
      </div>

      <Modal open={mode === 'enable'} onClose={reset} title="Set up two-factor authentication">
        {codes ? (
          <RecoveryCodes codes={codes} onDone={reset} onCopy={copyCodes} copied={copied} />
        ) : setupLoading || !setup ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 className="animate-spin" size={22} />
          </div>
        ) : (
          <form onSubmit={submitEnable} className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Scan this with Google Authenticator, Authy, or any TOTP app, then enter the 6-digit code it shows.
            </p>
            <div className="flex justify-center rounded-2xl border-4 border-midnight bg-white p-4 dark:border-white dark:bg-slate-900">
              <QRCodeSVG value={setup.otpauthUrl} size={180} />
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Can&apos;t scan it? Enter this key</p>
              <code className="mt-1 block break-all text-xs font-bold text-midnight dark:text-white">{setup.secret}</code>
            </div>
            <Field label="Verification code">
              <input
                className="input-field text-center text-lg tracking-[0.4em]"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                placeholder="••••••"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
            </Field>
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={16} />} Verify &amp; enable
            </button>
          </form>
        )}
      </Modal>

      <Modal open={mode === 'disable'} onClose={reset} title="Disable two-factor authentication">
        {codes ? (
          <RecoveryCodes codes={codes} onDone={reset} onCopy={copyCodes} copied={copied} />
        ) : (
          <form onSubmit={submitDisable} className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This removes the extra security and revokes all trusted devices. Enter your password to confirm.
            </p>
            <Field label="Password">
              <input
                type="password"
                className="input-field"
                autoFocus
                placeholder="Current password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full !bg-rose-600 hover:!bg-rose-700"
            >
              {busy ? <Loader2 className="animate-spin" size={18} /> : <ShieldOff size={16} />} Disable 2FA
            </button>
          </form>
        )}
      </Modal>

      <Modal open={mode === 'regen'} onClose={reset} title="New recovery codes">
        {codes ? (
          <RecoveryCodes codes={codes} onDone={reset} onCopy={copyCodes} copied={copied} />
        ) : (
          <form onSubmit={submitRegenerate} className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Generate a fresh set of recovery codes. Your old codes will stop working immediately.
            </p>
            <Field label="Password">
              <input
                type="password"
                className="input-field"
                autoFocus
                placeholder="Current password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={16} />} Generate codes
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}