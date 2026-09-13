import { useEffect, useState } from 'react';
import { ShieldCheck, HandCoins, Archive, ScanLine, Check, X, QrCode, KeyRound, Loader2, PackageCheck, PackageX, Users, Pencil, Trash2, Search, Package } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { Field } from '../components/ui/Field';
import QrScanner from '../components/ui/QrScanner';
import { adminService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { CATEGORIES, BUILDINGS } from '../config/constants';

const TABS = [
  { key: 'claims', icon: HandCoins, label: 'Claims' },
  { key: 'vault', icon: Archive, label: 'Vault' },
  { key: 'scan', icon: ScanLine, label: 'Scan' },
];

const ROLE_BADGE = {
  admin: 'match',
  guard: 'claim',
  student: 'system',
  user: 'system',
};

export default function AdminPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [section, setSection] = useState('security');
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
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', mobileNumber: '', address: '', password: '' });
  const [savingUser, setSavingUser] = useState(false);
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({});
  const [savingItem, setSavingItem] = useState(false);

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

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await adminService.getUsers();
      setAllUsers(data.users);
    } catch {
      toast.error('Could not load users');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (section === 'users' && isAdmin) loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, isAdmin]);

  const loadItems = async (search = itemSearch) => {
    setItemsLoading(true);
    try {
      const data = await adminService.getItems(search);
      setItems(data.items);
    } catch {
      toast.error('Could not load items');
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    if (section === 'items' && isAdmin) loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, isAdmin]);

  function openEditItem(item) {
    setEditingItem(item);
    setItemForm({
      title: item.title || '',
      description: item.description || '',
      category: item.category || '',
      location: item.location || '',
      date: item.date ? item.date.slice(0, 10) : '',
      type: item.type || 'lost',
      status: item.status || 'active',
      handoverStatus: item.handoverStatus || 'pending',
      secretFeature: item.secretFeature || '',
    });
  }

  async function saveItem(e) {
    e.preventDefault();
    if (!itemForm.title.trim() || !itemForm.category || !itemForm.location) {
      return toast.error('Title, category and location are required');
    }
    setSavingItem(true);
    try {
      const { message } = await adminService.updateItem(editingItem._id, {
        title: itemForm.title.trim(),
        description: itemForm.description.trim(),
        category: itemForm.category,
        location: itemForm.location,
        date: itemForm.date,
        type: itemForm.type,
        status: itemForm.status,
        handoverStatus: itemForm.type === 'found' ? itemForm.handoverStatus : undefined,
        secretFeature: itemForm.type === 'found' ? itemForm.secretFeature.trim() : undefined,
      });
      toast.success(message || 'Item updated');
      setEditingItem(null);
      await loadItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update item');
    } finally {
      setSavingItem(false);
    }
  }

  async function removeItem(item) {
    const confirmed = await Swal.fire({
      icon: 'warning',
      title: 'Delete item?',
      text: `This permanently deletes "${item.title}" along with its claims and notifications.`,
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
    });
    if (!confirmed.isConfirmed) return;
    try {
      const { message } = await adminService.deleteItem(item._id);
      toast.success(message || 'Item deleted');
      await loadItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete item');
    }
  }

  const filteredUsers = allUsers.filter(
    (u) =>
      !userSearch.trim() ||
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.role?.toLowerCase().includes(userSearch.toLowerCase())
  );

  function openEdit(u) {
    setEditId(u._id);
    setEditForm({
      name: u.name || '',
      email: u.email || '',
      role: u.role || 'student',
      mobileNumber: u.mobileNumber || '',
      address: u.address || '',
      password: '',
    });
  }

  async function saveUser(e) {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.email.trim()) {
      return toast.error('Name and email are required');
    }
    setSavingUser(true);
    try {
      const { message } = await adminService.updateUser(editId, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        mobileNumber: editForm.mobileNumber.trim(),
        address: editForm.address.trim(),
        ...(editForm.password ? { password: editForm.password } : {}),
      });
      toast.success(message || 'User updated');
      setEditId(null);
      await loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update user');
    } finally {
      setSavingUser(false);
    }
  }

  async function removeUser(u) {
    const confirmed = await Swal.fire({
      icon: 'warning',
      title: 'Delete user?',
      text: `This permanently deletes ${u.name} (${u.email}) and their account.`,
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
    });
    if (!confirmed.isConfirmed) return;
    try {
      const { message } = await adminService.deleteUser(u._id);
      toast.success(message || 'User deleted');
      await loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete user');
    }
  }

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
    <div className="mx-auto flex max-w-6xl items-start gap-5 px-4 pb-28 pt-4 md:pb-10">
      <aside className="sticky top-20 hidden w-56 shrink-0 flex-col gap-1.5 md:flex">
        <SideBtn
          active={section === 'security'}
          onClick={() => setSection('security')}
          icon={ShieldCheck}
          label="Security Panel"
          badge={pendingCount}
        />
        {isAdmin && (
          <SideBtn
            active={section === 'items'}
            onClick={() => setSection('items')}
            icon={Package}
            label="Item Management"
          />
        )}
        {isAdmin && (
          <SideBtn
            active={section === 'users'}
            onClick={() => setSection('users')}
            icon={Users}
            label="User Management"
          />
        )}
        <p className="mt-3 px-2 text-[11px] text-slate-400 dark:text-slate-500">Claims · vault · QR handover · accounts</p>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-5 flex gap-2 rounded-2xl bg-white p-1.5 shadow-card dark:bg-slate-900 md:hidden">
          {[
            { key: 'security', icon: ShieldCheck, label: 'Security' },
            ...(isAdmin ? [{ key: 'items', icon: Package, label: 'Items' }] : []),
            ...(isAdmin ? [{ key: 'users', icon: Users, label: 'Users' }] : []),
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setSection(t.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition ${
                section === t.key ? 'bg-brand-600 text-white shadow-card' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <t.icon size={16} />
              {t.label}
              {t.key === 'security' && pendingCount > 0 && (
                <span className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] ${section === t.key ? 'bg-white text-brand-600' : 'bg-rose-500 text-white'}`}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {section === 'security' ? (
          <>
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 text-white shadow-glow">
                  <ShieldCheck size={20} />
                </span>
                <div>
                  <h1 className="text-xl font-extrabold text-midnight dark:text-white">Security Panel</h1>
                  <p className="text-sm text-slate-400 dark:text-slate-500">Claim review · vault · QR handover</p>
                </div>
              </div>
            </div>

            <div className="mb-5 flex gap-2 rounded-2xl bg-white p-1.5 shadow-card dark:bg-slate-900">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={
                    t.key === 'vault'
                      ? loadVault
                      : t.key === 'scan'
                        ? () => setTab('scan')
                        : () => loadClaims()
                  }
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition ${
                    tab === t.key ? 'bg-brand-600 text-white shadow-card' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
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
                  filter === key ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400'
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
          <p className="mb-3 text-sm text-slate-400 dark:text-slate-500">{vault.length} reported items · in-vault items are live in the public feed · QR unlocks on approved claim</p>
          {loading ? (
            <Spinner />
          ) : vault.length === 0 ? (
            <Empty text="Vault is empty" />
          ) : (
            <>
              {pendingDropOffs.length > 0 && (
                <div className="mb-6">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                      <PackageX size={15} />
                    </span>
                    <h2 className="text-sm font-extrabold text-midnight dark:text-white">
                      Awaiting drop-off · {pendingDropOffs.length}
                    </h2>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">hidden from public feed until verified</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {pendingDropOffs.map((item) => (
                      <div key={item._id} className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-card dark:border-amber-500/30 dark:bg-slate-900">
                        <div className="relative aspect-[4/3]">
                          <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                          <div className="absolute left-2 top-2 flex gap-1">
                            <Badge color="found">found</Badge>
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                              pending
                            </span>
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="truncate text-sm font-bold text-midnight dark:text-white">{item.title}</p>
                          <p className="mb-2 line-clamp-1 text-xs text-slate-400 dark:text-slate-500">
                            {item.category} · {item.location}
                            {item.createdBy && <span className="block truncate text-slate-400 dark:text-slate-500">held by {item.createdBy.name}</span>}
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
                  <div key={item._id} className="overflow-hidden rounded-2xl bg-white shadow-card dark:bg-slate-900">
                    <div className="relative aspect-[4/3]">
                      <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                      <div className="absolute left-2 top-2 flex gap-1">
                        <Badge color={item.type}>{item.type}</Badge>
                        <Badge color={item.status}>{item.status}</Badge>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-bold text-midnight dark:text-white">{item.title}</p>
                      <p className="mb-2 line-clamp-1 text-xs text-slate-400 dark:text-slate-500">
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
                        <p className="rounded-xl bg-slate-50 py-2 text-center text-[11px] font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500">
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
          <div className="rounded-3xl bg-white p-6 text-center shadow-card dark:bg-slate-900">
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
              <ScanLine size={28} />
            </span>
            <h2 className="text-lg font-extrabold text-midnight dark:text-white">Scan QR at handover desk</h2>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
              Point the camera at the approved claimant's QR (from their My Claims page). Verified instantly — no copy-paste needed.
            </p>
            <div className="mt-4">
              <QrScanner
                onResult={(code) => verifyCode(code)}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-card dark:bg-slate-900">
            <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              No camera? Paste the code manually
            </p>
            <form onSubmit={handleScan} className="space-y-3">
              <input
                className="input-field text-center"
                placeholder="Paste claimant QR code (claimId::claimantId)"
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
              />
              <button type="submit" disabled={verifying} className="btn-primary w-full">
                {verifying ? <Loader2 className="animate-spin" size={18} /> : <ScanLine size={18} />} Verify &amp; Resolve
              </button>
            </form>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-card dark:bg-slate-900">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Approved claims ready for handover</p>
            {approvedClaims.filter((c) => c.item?.status !== 'resolved').length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400 dark:text-slate-500">Nothing waiting. Approve a claim to queue it here.</p>
            ) : (
              <div className="space-y-2">
                {approvedClaims.filter((c) => c.item?.status !== 'resolved').map((claim) => (
                  <button
                    key={claim._id}
                    onClick={() => doHandover({ claimId: claim._id, claimantId: claim.claimant?._id })}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-2 text-left transition hover:border-brand-300 hover:bg-brand-50 dark:border-slate-800 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/10"
                  >
                    <img src={claim.item?.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    <span className="min-w-0 flex-1">
<span className="block truncate text-xs font-bold text-midnight dark:text-white">{claim.item?.title}</span>
                        <span className="block truncate text-[11px] text-slate-400 dark:text-slate-500">
                        {claim.item?.location} · to {claim.claimant?.name} ({claim.claimant?.email})
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

      </>
        ) : section === 'items' ? (
          <>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-brand-600 text-white shadow-glow">
                <Package size={20} />
              </span>
              <div>
                <h1 className="text-xl font-extrabold text-midnight dark:text-white">Item Management</h1>
                <p className="text-sm text-slate-400 dark:text-slate-500">Edit details · secret marks · delete items</p>
              </div>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="input-field pl-10"
                placeholder="Search by title, category, location…"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadItems()}
              />
            </div>

            {itemsLoading ? (
              <Spinner />
            ) : items.length === 0 ? (
              <Empty text="No items match" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((item) => (
                  <div key={item._id} className="overflow-hidden rounded-2xl bg-white shadow-card dark:bg-slate-900">
                    <div className="relative aspect-[16/9]">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-100 to-violet-100 dark:from-brand-500/20 dark:to-violet-500/20">
                          <Package className="text-brand-300" size={32} />
                        </div>
                      )}
                      <div className="absolute left-2 top-2 flex gap-1">
                        <Badge color={item.type}>{item.type}</Badge>
                        <Badge color={item.status}>{item.status}</Badge>
                      </div>
                      {item.type === 'found' && (
                        <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-900/90 dark:text-slate-300">
                          {item.handoverStatus === 'in_vault' ? 'in guard room' : 'awaiting drop-off'}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="truncate text-sm font-bold text-midnight dark:text-white">{item.title}</p>
                      <p className="truncate text-xs text-slate-400 dark:text-slate-500">{item.category} · {item.location} · {format(new Date(item.date), 'PP')}</p>
                      <p className="mt-1 truncate text-[11px] text-slate-400 dark:text-slate-500">
                        by {item.createdBy?.name || 'unknown'} · {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </p>
                      {item.type === 'found' && (
                        <p className="mt-2 rounded-lg bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          <span className="font-semibold">Secret mark:</span> {item.secretFeature || '—'}
                        </p>
                      )}
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => openEditItem(item)} className="btn-ghost flex-1 !px-2 !py-2 text-xs">
                          <Pencil size={14} /> Edit
                        </button>
                        <button
                          onClick={() => removeItem(item)}
                          className="btn-ghost flex-1 border-rose-200 !text-rose-500 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-glow">
                <Users size={20} />
              </span>
              <div>
                <h1 className="text-xl font-extrabold text-midnight dark:text-white">User Management</h1>
                <p className="text-sm text-slate-400 dark:text-slate-500">Manage accounts · update &amp; delete users</p>
              </div>
            </div>
            <p className="mb-3 text-sm text-slate-400 dark:text-slate-500">
              {allUsers.length} accounts · only admins can view or manage users
            </p>

          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="input-field pl-10"
              placeholder="Search by name, email or role…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>

          {usersLoading ? (
            <Spinner />
          ) : filteredUsers.length === 0 ? (
            <Empty text="No users match" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredUsers.map((u) => (
                <div key={u._id} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-100 to-violet-100 text-sm font-extrabold text-brand-600 dark:from-brand-500/20 dark:to-violet-500/20 dark:text-brand-300">
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.name} className="h-full w-full object-cover" />
                    ) : (
                      u.name?.charAt(0).toUpperCase() || '?'
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-bold text-midnight dark:text-white">{u.name}</p>
                      <Badge color={ROLE_BADGE[u.role] || 'system'}>{u.role}</Badge>
                    </div>
                    <p className="truncate text-xs text-slate-400 dark:text-slate-500">{u.email}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {u.mobileNumber || 'no mobile'} · joined {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      onClick={() => openEdit(u)}
                      className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
                      aria-label={`Edit ${u.name}`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => removeUser(u)}
                      className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                      aria-label={`Delete ${u.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </>
        )}

      <AnimatePresence>
        {qrItem && (
          <Modal title="Claimant Handover QR" onClose={() => setQrItem(null)} open>
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-2xl border-4 border-midnight bg-white p-4 dark:border-white dark:bg-slate-900">
                <QRCodeSVG value={`${qrItem.claim._id}::${qrItem.claim.claimant?._id}`} size={200} />
              </div>
              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                Approved claimant for <span className="font-bold text-midnight dark:text-white">{qrItem.item.title}</span> is{' '}
                <span className="font-bold text-brand-600">{qrItem.claim.claimant?.name}</span>. Show this at the desk — security scans it to verify and resolve.
              </p>
              <Badge color="approved">approved</Badge>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <Modal open={Boolean(editId)} onClose={() => setEditId(null)} title="Edit user">
        <form onSubmit={saveUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <input className="input-field" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            </Field>
            <Field label="Email">
              <input type="email" className="input-field" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
            </Field>
          </div>
          <Field label="Role">
            <select className="input-field" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
              {['student', 'guard', 'admin', 'user'].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label="Mobile Number">
            <input className="input-field" value={editForm.mobileNumber} onChange={(e) => setEditForm({ ...editForm, mobileNumber: e.target.value })} placeholder="e.g. 0777 123 456" />
          </Field>
          <Field label="Address">
            <input className="input-field" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} placeholder="Campus hall, room, block…" />
          </Field>
          <Field label="New Password" hint="Leave blank to keep the current password">
            <input type="password" className="input-field" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="Optional — min 6 characters" />
          </Field>
          <div className="flex gap-3">
            <button type="button" className="btn-ghost flex-1" onClick={() => setEditId(null)}>Cancel</button>
            <button type="submit" disabled={savingUser} className="btn-primary flex-1">
              {savingUser ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} Save
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(editingItem)} onClose={() => setEditingItem(null)} title="Edit item">
        <form onSubmit={saveItem} className="space-y-4">
          <Field label="Item name">
            <input className="input-field" value={itemForm.title} onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select className="input-field" value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })} required>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Building">
              <select className="input-field" value={itemForm.location} onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })} required>
                {BUILDINGS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input type="date" className="input-field" value={itemForm.date} onChange={(e) => setItemForm({ ...itemForm, date: e.target.value })} />
            </Field>
            <Field label="Type">
              <select className="input-field" value={itemForm.type} onChange={(e) => setItemForm({ ...itemForm, type: e.target.value })}>
                <option value="lost">Lost</option>
                <option value="found">Found</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select className="input-field" value={itemForm.status} onChange={(e) => setItemForm({ ...itemForm, status: e.target.value })}>
                {['active', 'claimed', 'resolved'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            {itemForm.type === 'found' && (
              <Field label="Guard room">
                <select className="input-field" value={itemForm.handoverStatus} onChange={(e) => setItemForm({ ...itemForm, handoverStatus: e.target.value })}>
                  <option value="pending">Awaiting drop-off</option>
                  <option value="in_vault">In guard room</option>
                </select>
              </Field>
            )}
          </div>
          <Field label="Description">
            <textarea className="input-field min-h-24 resize-none" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} />
          </Field>
          {itemForm.type === 'found' && (
            <Field label="Secret Mark" hint="Visible to admins & security only — used to verify claims">
              <textarea className="input-field min-h-20 resize-none" value={itemForm.secretFeature} onChange={(e) => setItemForm({ ...itemForm, secretFeature: e.target.value })} />
            </Field>
          )}
          <div className="flex gap-3">
            <button type="button" className="btn-ghost flex-1" onClick={() => setEditingItem(null)}>Cancel</button>
            <button type="submit" disabled={savingItem} className="btn-primary flex-1">
              {savingItem ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} Save
            </button>
          </div>
        </form>
      </Modal>
      </div>
    </div>
  );
}

function SideBtn({ active, onClick, icon: Icon, label, badge }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
        active
          ? 'bg-brand-600 text-white shadow-card'
          : 'bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
      }`}
    >
      <Icon size={18} />
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-extrabold ${active ? 'bg-white text-brand-600' : 'bg-rose-500 text-white'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function Empty({ text }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-2xl shadow-card dark:bg-slate-900">📭</span>
      <p className="font-bold text-midnight dark:text-white">{text}</p>
    </div>
  );
}

function ClaimReviewCard({ claim, onApprove, onReject }) {
  const item = claim.item;
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <Badge color={claim.status}>{claim.status}</Badge>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">claimed {formatDistanceToNow(new Date(claim.createdAt), { addSuffix: true })}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr]">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Item</p>
          {item?.image && <img src={item.image} alt={item.title} className="mb-2 h-20 w-full rounded-lg object-cover" />}
          <p className="text-sm font-bold text-midnight dark:text-white">{item?.title}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{item?.category} · {item?.location}</p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Claimant</p>
          <p className="text-sm font-bold text-midnight dark:text-white">{claim.claimant?.name}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{claim.claimant?.email}</p>
          <p className="mt-2 rounded-lg bg-white p-2.5 text-xs leading-relaxed text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            <span className="font-semibold">Proof:</span> “{claim.proofAnswer}”
          </p>
          {claim.note && <p className="mt-1.5 text-[11px] italic text-slate-400 dark:text-slate-500">note: {claim.note}</p>}
        </div>

        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {item?.type === 'found' ? 'Secret mark (hidden from public)' : 'Match check'}
          </p>
          {item?.type === 'found' ? (
            <p className="rounded-lg bg-white p-2.5 text-xs leading-relaxed text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              <span className="font-semibold">Finder stored:</span> “{item.secretFeature || '—'}”
            </p>
          ) : (
            <p className="rounded-lg bg-white p-2.5 text-xs leading-relaxed text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              Verify the claimant's details match this lost report.
            </p>
          )}
        </div>
      </div>

      {claim.status === 'pending' ? (
        <div className="mt-4 flex gap-3">
          <button onClick={onReject} className="btn-ghost flex-1 border-rose-200 !text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:!text-rose-400 dark:hover:bg-rose-500/10">
            <X size={16} /> Reject
          </button>
          <button onClick={onApprove} className="btn-primary flex-1">
            <Check size={16} /> Approve
          </button>
        </div>
      ) : (
        <div className={`mt-4 rounded-xl py-3 text-center text-sm font-semibold ${claim.status === 'rejected' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'}`}>
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