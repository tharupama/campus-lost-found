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
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { Field } from '../components/ui/Field';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
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

  const [activityTab, setActivityTab] = useState('claims');
  const [claims, setClaims] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [qrClaim, setQrClaim] = useState(null);

  useEffect(() => {
    Promise.all([claimService.getMyClaims(), itemService.getMyItems()])
      .then(([claimsData, itemsData]) => {
        setClaims(claimsData.claims);
        setMyItems(itemsData.items);
      })
      .catch(() => {})
      .finally(() => setActivityLoading(false));
  }, []);

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

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image must be under 8MB');
      return;
    }
    setAvatar(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
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
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 text-white shadow-glow">
          <UserRound size={20} />
        </span>
        <div>
          <h1 className="text-xl font-extrabold text-midnight">My Profile</h1>
          <p className="text-sm text-slate-400">Keep your contact details up to date</p>
        </div>
        {user && ['admin', 'guard'].includes(user.role) && (
          <button onClick={() => navigate('/admin')} className="btn-ghost ml-auto !px-3 !py-2 text-xs">
            <ShieldCheck size={15} /> Security Panel
          </button>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 md:items-start md:gap-5">
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <Field label="Profile Picture">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-brand-400"
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
              <p className="text-xs leading-relaxed text-slate-400">
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
                <input className="input-field bg-slate-50 text-slate-500" value={user?.email || ''} disabled />
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

        <div className="rounded-3xl bg-white p-5 shadow-card">
          <p className="mb-1 text-sm font-extrabold text-midnight">Change Password</p>
          <p className="mb-4 text-xs text-slate-400">Leave blank to keep your current password</p>
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

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-400">My Activity</h2>

        <div className="mb-4 flex gap-2 rounded-2xl bg-white p-1.5 shadow-card">
          {TABS.map((t) => {
            const count = t.key === 'claims' ? claims.length : myItems.filter((i) => i.type === t.key).length;
            return (
              <button
                key={t.key}
                onClick={() => setActivityTab(t.key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition ${
                  activityTab === t.key ? 'bg-brand-600 text-white shadow-card' : 'text-slate-500 hover:bg-slate-50'
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
            items={claims}
            empty={['No claims yet', 'Browse the feed and hit "This Is Mine" on something that looks familiar.', '/', 'Browse feed']}
            render={(claim) => {
              const item = claim.item;
              const isApproved = claim.status === 'approved';
              const isResolved = claim.status === 'resolved';
              return (
                <>
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-midnight">{item?.title || 'Item'}</p>
                      <Badge color={claim.status}>{isResolved ? 'handed over' : claim.status}</Badge>
                    </div>
                    <p className="mb-1 text-xs text-slate-400">
                      <MapPin size={11} className="inline" /> {item?.location || '—'} · claimed{' '}
                      {formatDistanceToNow(new Date(claim.createdAt), { addSuffix: true })}
                    </p>
                    <p className="line-clamp-1 text-xs text-slate-500 italic">“{claim.proofAnswer}”</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {isApproved && (
                      <button
                        onClick={() => setQrClaim(claim)}
                        className="btn-ghost !px-2.5 !py-2 text-xs !text-emerald-700 hover:!bg-emerald-50"
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
            items={myItems.filter((i) => i.type === activityTab)}
            empty={
              activityTab === 'found'
                ? ['No found items yet', 'Found something? Report it and drop it off at the guard room.', '/', 'Report an item']
                : ['No lost items yet', 'Lost something? Report it so the campus can help find it.', '/', 'Report an item']
            }
            render={(item) => {
              const handoverChip =
                item.type === 'found' && item.handoverStatus !== 'in_vault'
                  ? { label: 'awaiting drop-off', cls: 'bg-amber-100 text-amber-700' }
                  : item.type === 'found'
                    ? { label: 'in guard room', cls: 'bg-emerald-50 text-emerald-700' }
                    : null;
              return (
                <>
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-midnight">{item.title}</p>
                      <div className="flex shrink-0 items-center gap-1">
                        {handoverChip && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${handoverChip.cls}`}>
                            {handoverChip.label}
                          </span>
                        )}
                        <Badge color={item.status}>{item.status}</Badge>
                      </div>
                    </div>
                    <p className="mb-1 text-xs text-slate-400">
                      <MapPin size={11} className="inline" /> {item.location} · {item.category} · reported{' '}
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                    {item.type === 'found' && item.handoverStatus === 'pending' && (
                      <p className="text-[11px] text-amber-600">
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
      </div>

      <Modal open={Boolean(qrClaim)} onClose={() => setQrClaim(null)} title="Your handover QR code">
        {qrClaim && (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-2xl border-4 border-midnight bg-white p-4">
              <QRCodeSVG value={`${qrClaim._id}::${qrClaim.claimant}`} size={200} />
            </div>
            <p className="text-center text-sm text-slate-500">
              Show this at the security desk for <span className="font-bold text-midnight">{qrClaim.item?.title}</span>.
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
      <div className="flex flex-col items-center rounded-3xl bg-white py-14 text-center shadow-card">
        <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-50 text-2xl">📭</span>
        <p className="font-bold text-midnight">{title}</p>
        <p className="mt-1 max-w-xs text-sm text-slate-400">{subtitle}</p>
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
        <div key={entry._id || idx} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
          {entry?.item?.image || entry.image ? (
            <img
              src={entry.item?.image || entry.image}
              alt={entry.item?.title || entry.title}
              className="h-20 w-24 shrink-0 cursor-pointer rounded-xl object-cover"
              onClick={() => navigate(`/items/${(entry.item || entry)._id}`)}
            />
          ) : (
            <span className="flex h-20 w-24 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl">🖼️</span>
          )}
          <div className="min-w-0 flex-1">{render(entry)}</div>
        </div>
      ))}
    </div>
  );
}