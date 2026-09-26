import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebouncedCallback } from 'use-debounce';
import { ShieldCheck, HandCoins, Archive, ScanLine, Check, X, QrCode, KeyRound, Loader2, Menu, PackageCheck, PackageX, Users, UserPlus, Pencil, Trash2, Search, Package, Phone, MessageSquareQuote, LayoutDashboard } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import { Field } from '../components/ui/Field';
import QrScanner from '../components/ui/QrScanner';
import OverviewPanel from '../components/admin/OverviewPanel';
import { adminService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { CATEGORIES, BUILDINGS, FEEDBACK_CATEGORIES } from '../config/constants';

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

const SECTIONS = ['overview', 'security', 'items', 'users', 'feedback'];
const ADMIN_ONLY_SECTIONS = ['items', 'users', 'feedback'];

// One source of truth for the sidebar, the mobile drawer and the mobile title bar.
const SECTION_NAV = [
  { key: 'overview', icon: LayoutDashboard, label: 'Overview', hint: 'How the lost & found desk is performing' },
  { key: 'security', icon: ShieldCheck, label: 'Security Panel', hint: 'Claim review · vault · QR handover', count: 'pending' },
  { key: 'items', icon: Package, label: 'Item Management', hint: 'Edit details · secret marks · delete items', adminOnly: true },
  { key: 'users', icon: Users, label: 'User Management', hint: 'Manage accounts · create, update & delete', adminOnly: true },
  { key: 'feedback', icon: MessageSquareQuote, label: 'Student Feedback', hint: 'Read and triage student messages', count: 'feedback', adminOnly: true },
];

export default function AdminPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchParams] = useSearchParams();
  // Deep link from a feedback notification/email: /admin?section=feedback
  const [section, setSection] = useState(() => {
    // Admins land on the insights dashboard; guards keep the security desk.
    const fallback = isAdmin ? 'overview' : 'security';
    const requested = searchParams.get('section');
    if (!requested || !SECTIONS.includes(requested)) return fallback;
    if (ADMIN_ONLY_SECTIONS.includes(requested) && !isAdmin) return 'security';
    return requested;
  });
  const [tab, setTab] = useState('claims');
  const [claims, setClaims] = useState([]);
  const [vault, setVault] = useState([]);
  const [approvedClaims, setApprovedClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [filter, setFilter] = useState('pending');
  const [claimSearch, setClaimSearch] = useState('');
  const [vaultSearch, setVaultSearch] = useState('');
  const [vaultView, setVaultView] = useState('all');
  const [qrItem, setQrItem] = useState(null);
  const [scanCode, setScanCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', mobileNumber: '', address: '', password: '' });
  const [savingUser, setSavingUser] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', role: 'student', mobileNumber: '', address: '', password: '' });
  const [savingCreate, setSavingCreate] = useState(false);
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({});
  const [itemImageFile, setItemImageFile] = useState(null);
  const [savingItem, setSavingItem] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const [claimsPage, setClaimsPage] = useState(1);
  const [claimsPageSize, setClaimsPageSize] = useState(10);
  const [claimsTotal, setClaimsTotal] = useState(0);
  const [claimsTotalPages, setClaimsTotalPages] = useState(1);

  const [vaultPage, setVaultPage] = useState(1);
  const [vaultPageSize, setVaultPageSize] = useState(12);
  const [vaultTotal, setVaultTotal] = useState(0);
  const [vaultTotalPages, setVaultTotalPages] = useState(1);

  const [itemsPage, setItemsPage] = useState(1);
  const [itemsPageSize, setItemsPageSize] = useState(12);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [itemsTotalPages, setItemsTotalPages] = useState(1);

  const [usersPage, setUsersPage] = useState(1);
  const [usersPageSize, setUsersPageSize] = useState(10);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersTotalPages, setUsersTotalPages] = useState(1);

  const [feedback, setFeedback] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('');
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [feedbackSummary, setFeedbackSummary] = useState({ count: 0 });
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [feedbackPageSize, setFeedbackPageSize] = useState(10);
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const [feedbackTotalPages, setFeedbackTotalPages] = useState(1);
  const [newFeedbackCount, setNewFeedbackCount] = useState(0);

  const navSections = SECTION_NAV.filter((s) => !s.adminOnly || isAdmin);
  const activeSection = SECTION_NAV.find((s) => s.key === section) || SECTION_NAV[0];
  const countFor = (key) => (key === 'pending' ? pendingCount : key === 'feedback' ? newFeedbackCount : 0);
  const activeCount = countFor(activeSection.count);

  const goSection = (key) => {
    setSection(key);
    setNavOpen(false);
  };

  useEffect(() => {
    if (!navOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setNavOpen(false);
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [navOpen]);

  const pendingDropOffs = vault.filter((i) => i.type === 'found' && i.handoverStatus !== 'in_vault');
  const vaultItems = vault.filter((i) => !pendingDropOffs.includes(i));

  const refreshPendingCount = async () => {
    try {
      const data = await adminService.getClaims('pending', '', 1, 1);
      setPendingCount(data.total);
    } catch {
      // silent
    }
  };

  const loadClaims = async (status = filter, search = claimSearch, p = claimsPage, s = claimsPageSize) => {
    setLoading(true);
    try {
      const data = await adminService.getClaims(status, search, p, s);
      setClaims(data.claims);
      setClaimsTotal(data.total || 0);
      setClaimsTotalPages(data.totalPages || 1);
    } catch {
      toast.error('Could not load claims');
    } finally {
      setLoading(false);
    }
    setTab('claims');
  };

  const loadVault = async (search = vaultSearch, view = vaultView, p = vaultPage, s = vaultPageSize) => {
    setLoading(true);
    try {
      const [vaultData, approvedData] = await Promise.all([
        adminService.getVault(search, view, p, s),
        adminService.getClaims('approved', 1, 100),
      ]);
      setVault(vaultData.items);
      setVaultTotal(vaultData.total || 0);
      setVaultTotalPages(vaultData.totalPages || 1);
      setApprovedClaims(approvedData.claims);
    } catch {
      toast.error('Could not load vault');
    } finally {
      setLoading(false);
    }
    setTab('vault');
  };

  const searchClaims = useDebouncedCallback(() => {
    setClaimsPage(1);
    loadClaims(filter, claimSearch, 1, claimsPageSize);
  }, 350);

  const searchVault = useDebouncedCallback(() => {
    setVaultPage(1);
    loadVault(vaultSearch, vaultView, 1, vaultPageSize);
  }, 350);

  useEffect(() => {
    loadClaims('pending');
    refreshPendingCount();
  }, []);

  const loadUsers = async (p = usersPage, s = usersPageSize) => {
    setUsersLoading(true);
    try {
      const data = await adminService.getUsers(userSearch, p, s);
      setAllUsers(data.users);
      setUsersTotal(data.total || 0);
      setUsersTotalPages(data.totalPages || 1);
    } catch {
      toast.error('Could not load users');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (section === 'users' && isAdmin) loadUsers(usersPage, usersPageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, isAdmin, usersPage, usersPageSize]);

  const searchUsers = useDebouncedCallback(() => {
    setUsersPage(1);
    loadUsers(1, usersPageSize);
  }, 350);

  const loadFeedback = async (status = feedbackStatus, category = feedbackCategory, search = feedbackSearch, p = feedbackPage, s = feedbackPageSize) => {
    setFeedbackLoading(true);
    try {
      const data = await adminService.getFeedback(status, category, search, p, s);
      setFeedback(data.feedback || []);
      setFeedbackTotal(data.total || 0);
      setFeedbackTotalPages(data.totalPages || 1);
      if (data.summary) setFeedbackSummary(data.summary);
    } catch {
      toast.error('Could not load feedback');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const refreshNewFeedbackCount = async () => {
    try {
      const data = await adminService.getFeedback('new', '', '', 1, 1);
      setNewFeedbackCount(data.total || 0);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    refreshNewFeedbackCount();
  }, []);

  useEffect(() => {
    if (section === 'feedback' && isAdmin) loadFeedback(feedbackStatus, feedbackCategory, feedbackSearch, 1, feedbackPageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, isAdmin]);

  const searchFeedback = useDebouncedCallback(() => {
    setFeedbackPage(1);
    loadFeedback(feedbackStatus, feedbackCategory, feedbackSearch, 1, feedbackPageSize);
  }, 350);

  const setFeedbackStatusFilter = (status) => {
    setFeedbackStatus(status);
    setFeedbackPage(1);
    loadFeedback(status, feedbackCategory, feedbackSearch, 1, feedbackPageSize);
  };

  const setFeedbackCategoryFilter = (category) => {
    setFeedbackCategory(category);
    setFeedbackPage(1);
    loadFeedback(feedbackStatus, category, feedbackSearch, 1, feedbackPageSize);
  };

  const reviewFeedback = async (item, status) => {
    try {
      const data = await adminService.updateFeedback(item._id, status);
      setFeedback((list) => list.map((f) => (f._id === item._id ? data.feedback : f)));
      toast.success(data.message);
      if (feedbackStatus === 'new' || feedbackStatus === 'reviewed') {
        loadFeedback(feedbackStatus, feedbackCategory, feedbackSearch, feedbackPage, feedbackPageSize);
      }
      refreshNewFeedbackCount();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update feedback');
    }
  };

  const removeFeedback = async (item) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete this feedback?',
      text: 'This removes it permanently and clears the related admin alerts. This cannot be undone.',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#e11d48',
      cancelButtonText: 'Keep it',
    });
    if (!result.isConfirmed) return;
    try {
      await adminService.deleteFeedback(item._id);
      setFeedback((list) => list.filter((f) => f._id !== item._id));
      setFeedbackTotal((t) => Math.max(0, t - 1));
      toast.success('Feedback deleted');
      refreshNewFeedbackCount();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete feedback');
    }
  };

  const loadItems = async (p = itemsPage, s = itemsPageSize) => {
    setItemsLoading(true);
    try {
      const data = await adminService.getItems(itemSearch, p, s);
      setItems(data.items);
      setItemsTotal(data.total || 0);
      setItemsTotalPages(data.totalPages || 1);
    } catch {
      toast.error('Could not load items');
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    if (section === 'items' && isAdmin) loadItems(itemsPage, itemsPageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, isAdmin, itemsPage, itemsPageSize]);

  const searchItems = useDebouncedCallback(() => {
    setItemsPage(1);
    loadItems(1, itemsPageSize);
  }, 350);

  function openEditItem(item) {
    setItemImageFile(null);
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
      const fields = {
        title: itemForm.title.trim(),
        description: itemForm.description.trim(),
        category: itemForm.category,
        location: itemForm.location,
        date: itemForm.date,
        type: itemForm.type,
        status: itemForm.status,
        handoverStatus: itemForm.type === 'found' ? itemForm.handoverStatus : undefined,
        secretFeature: itemForm.type === 'found' ? itemForm.secretFeature.trim() : undefined,
      };
      let payload = fields;
      if (itemImageFile) {
        const fd = new FormData();
        Object.entries(fields).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') fd.append(k, v);
        });
        fd.append('image', itemImageFile);
        payload = fd;
      }
      const { message } = await adminService.updateItem(editingItem._id, payload);
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

  function openCreate() {
    setCreateForm({ name: '', email: '', role: 'student', mobileNumber: '', address: '', password: '' });
    setCreateOpen(true);
  }

  async function createUserSubmit(e) {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password) {
      return toast.error('Name, email and password are required');
    }
    setSavingCreate(true);
    try {
      const { message } = await adminService.createUser({
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        role: createForm.role,
        mobileNumber: createForm.mobileNumber.trim(),
        address: createForm.address.trim(),
        password: createForm.password,
      });
      toast.success(message || 'User created');
      setCreateOpen(false);
      await loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create user');
    } finally {
      setSavingCreate(false);
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
      loadClaims(filter, claimSearch, claimsPage, claimsPageSize);
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
    <div className="px-4 pb-28 md:pb-10 md:pl-72 md:pr-6 md:pt-4 lg:pr-8">
      <aside className="fixed left-0 top-16 z-30 hidden h-[calc(100vh-4rem)] w-60 flex-col gap-1.5 overflow-y-auto border-r border-brand-800/70 bg-brand-950 p-3 md:flex">
        {navSections.map((s) => (
          <SideBtn
            key={s.key}
            active={section === s.key}
            onClick={() => setSection(s.key)}
            icon={s.icon}
            label={s.label}
            badge={countFor(s.count)}
          />
        ))}
        <p className="mt-auto px-2 pt-3 text-[11px] font-medium text-brand-300/70">Claims · vault · QR handover · accounts</p>
      </aside>

      <div className="sticky top-16 z-30 -mx-4 mb-4 flex items-center gap-3 border-b border-slate-200/70 bg-white/90 px-4 py-2.5 backdrop-blur-lg md:hidden dark:border-slate-800 dark:bg-slate-950/90">
        <button
          onClick={() => setNavOpen(true)}
          aria-label="Open admin menu"
          aria-expanded={navOpen}
          aria-controls="admin-drawer"
          className="-ml-1.5 shrink-0 rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-midnight dark:text-white">{activeSection.label}</p>
          <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">{activeSection.hint}</p>
        </div>
        {activeCount > 0 && (
          <span className="flex shrink-0 items-center rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-extrabold text-white">
            {activeCount} {activeSection.count === 'feedback' ? 'new' : 'pending'}
          </span>
        )}
      </div>

      <AnimatePresence>
        {navOpen && (
          <>
            <motion.div
              key="admin-nav-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setNavOpen(false)}
              className="fixed inset-0 z-40 bg-midnight/60 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              key="admin-drawer"
              id="admin-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Admin sections"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', ease: 'easeOut', duration: 0.24 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-brand-800/70 bg-brand-950 shadow-2xl md:hidden"
            >
              <div className="flex items-center justify-between gap-3 border-b border-brand-800/70 px-4 py-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gold-500">Admin desk</p>
                  <p className="truncate text-sm font-extrabold text-white">{activeSection.label}</p>
                </div>
                <button
                  onClick={() => setNavOpen(false)}
                  aria-label="Close admin menu"
                  className="shrink-0 rounded-xl p-2 text-brand-200 transition hover:bg-brand-800"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-3">
                {navSections.map((s) => (
                  <SideBtn
                    key={s.key}
                    active={section === s.key}
                    onClick={() => goSection(s.key)}
                    icon={s.icon}
                    label={s.label}
                    badge={countFor(s.count)}
                  />
                ))}
                <p className="mt-auto px-2 pt-3 text-[11px] font-medium text-brand-300/70">
                  Claims · vault · QR handover · accounts
                </p>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="min-w-0">
        {section === 'overview' ? (
          <OverviewPanel />
        ) : section === 'security' ? (
          <>
            <div className="mb-5 hidden items-center justify-between md:flex">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 to-gold-600 text-white shadow-glow">
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
                      ? () => loadVault()
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
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="input-field pl-10"
              placeholder="Search by item, claimant, phone or proof…"
              value={claimSearch}
              onChange={(e) => { setClaimSearch(e.target.value); searchClaims(); }}
              onKeyDown={(e) => e.key === 'Enter' && loadClaims(filter, claimSearch, 1, claimsPageSize)}
            />
          </div>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {[['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['resolved', 'Resolved']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setFilter(key); setClaimsPage(1); loadClaims(key, claimSearch, 1, claimsPageSize); }}
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
            <Empty text={claimSearch ? 'No claims match your search' : 'No claims in this state yet'} />
          ) : (
            <div className="space-y-4">
              {claims.map((claim) => (
                <ClaimReviewCard key={claim._id} claim={claim} onApprove={() => review(claim, 'approved')} onReject={() => review(claim, 'rejected')} />
              ))}
            </div>
          )}
          <Pagination
            page={claimsPage}
            pageSize={claimsPageSize}
            total={claimsTotal}
            totalPages={claimsTotalPages}
            onChangePage={(p) => { setClaimsPage(p); loadClaims(filter, claimSearch, p, claimsPageSize); }}
            onPageSizeChange={(s) => { setClaimsPageSize(s); setClaimsPage(1); loadClaims(filter, claimSearch, 1, s); }}
          />
        </div>
      )}

      {tab === 'vault' && (
        <div>
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="input-field pl-10"
              placeholder="Search by title, category, location…"
              value={vaultSearch}
              onChange={(e) => { setVaultSearch(e.target.value); searchVault(); }}
              onKeyDown={(e) => e.key === 'Enter' && loadVault(vaultSearch, vaultView, 1, vaultPageSize)}
            />
          </div>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {[
              ['all', 'All'],
              ['pending', 'Awaiting drop-off'],
              ['in_vault', 'In guard room'],
              ['claimed', 'Claimed'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setVaultView(key); setVaultPage(1); loadVault(vaultSearch, key, 1, vaultPageSize); }}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  vaultView === key ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mb-3 text-sm text-slate-400 dark:text-slate-500">{vaultTotal} reported items · in-vault items are live in the public feed · QR unlocks on approved claim</p>
          {loading ? (
            <Spinner />
          ) : vault.length === 0 ? (
            <Empty text={vaultSearch || vaultView !== 'all' ? 'No items match your filters' : 'Vault is empty'} />
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
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
          <Pagination
            page={vaultPage}
            pageSize={vaultPageSize}
            total={vaultTotal}
            totalPages={vaultTotalPages}
            onChangePage={(p) => { setVaultPage(p); loadVault(vaultSearch, vaultView, p, vaultPageSize); }}
            onPageSizeChange={(s) => { setVaultPageSize(s); setVaultPage(1); loadVault(vaultSearch, vaultView, 1, s); }}
          />
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
            <div className="mb-5 hidden items-center gap-3 md:flex">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-600 to-brand-700 text-white shadow-glow">
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
                onChange={(e) => { setItemSearch(e.target.value); searchItems(); }}
                onKeyDown={(e) => e.key === 'Enter' && loadItems(1, itemsPageSize)}
              />
            </div>

            {itemsLoading ? (
              <Spinner />
            ) : items.length === 0 ? (
              <Empty text="No items match" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {items.map((item) => (
                  <div key={item._id} className="overflow-hidden rounded-2xl bg-white shadow-card dark:bg-slate-900">
                    <div className="relative aspect-[16/9]">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-100 to-gold-100 dark:from-brand-500/20 dark:to-gold-500/20">
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
            <Pagination
              page={itemsPage}
              pageSize={itemsPageSize}
              total={itemsTotal}
              totalPages={itemsTotalPages}
              onChangePage={(p) => { setItemsPage(p); loadItems(p, itemsPageSize); }}
              onPageSizeChange={(s) => { setItemsPageSize(s); setItemsPage(1); loadItems(1, s); }}
            />
          </>
        ) : section === 'feedback' ? (
          <>
            <div className="mb-4 hidden items-center justify-between gap-3 md:mb-5 md:flex">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-brand-600 text-white shadow-glow">
                  <MessageSquareQuote size={20} />
                </span>
                <div>
                  <h1 className="text-xl font-extrabold text-midnight dark:text-white">Student Feedback</h1>
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    {feedbackSummary.count} submitted
                  </p>
                </div>
              </div>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="input-field pl-10"
                placeholder="Search by message, student name or email…"
                value={feedbackSearch}
                onChange={(e) => { setFeedbackSearch(e.target.value); searchFeedback(); }}
                onKeyDown={(e) => e.key === 'Enter' && loadFeedback(feedbackStatus, feedbackCategory, feedbackSearch, 1, feedbackPageSize)}
              />
            </div>

            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {[['', 'All'], ['new', 'New'], ['reviewed', 'Reviewed']].map(([key, label]) => (
                <button
                  key={key || 'all'}
                  onClick={() => setFeedbackStatusFilter(key)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    feedbackStatus === key ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {[['', 'Every category'], ...FEEDBACK_CATEGORIES.map((c) => [c.key, c.label])].map(([key, label]) => (
                <button
                  key={key || 'all-cats'}
                  onClick={() => setFeedbackCategoryFilter(key)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    feedbackCategory === key
                      ? 'border-violet-500 bg-violet-500 text-white'
                      : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {feedbackLoading ? (
              <Spinner />
            ) : feedback.length === 0 ? (
              <Empty text={feedbackSearch ? 'No feedback matches your search' : 'No feedback in this view yet'} />
            ) : (
              <div className="space-y-3">
                {feedback.map((f) => (
                  <FeedbackReviewCard
                    key={f._id}
                    feedback={f}
                    onReview={(status) => reviewFeedback(f, status)}
                    onDelete={() => removeFeedback(f)}
                  />
                ))}
              </div>
            )}

            <Pagination
              page={feedbackPage}
              pageSize={feedbackPageSize}
              total={feedbackTotal}
              totalPages={feedbackTotalPages}
              onChangePage={(p) => { setFeedbackPage(p); loadFeedback(feedbackStatus, feedbackCategory, feedbackSearch, p, feedbackPageSize); }}
              onPageSizeChange={(s) => { setFeedbackPageSize(s); setFeedbackPage(1); loadFeedback(feedbackStatus, feedbackCategory, feedbackSearch, 1, s); }}
            />
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-end gap-3 md:mb-5 md:justify-between">
              <div className="hidden items-center gap-3 md:flex">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-glow">
                  <Users size={20} />
                </span>
                <div>
                  <h1 className="text-xl font-extrabold text-midnight dark:text-white">User Management</h1>
                  <p className="text-sm text-slate-400 dark:text-slate-500">Manage accounts · create, update &amp; delete users</p>
                </div>
              </div>
              <button onClick={openCreate} className="btn-primary !px-3 !py-2 text-sm">
                <UserPlus size={16} /> Create user
              </button>
            </div>
            <p className="mb-3 text-sm text-slate-400 dark:text-slate-500">
              {usersTotal} accounts · only admins can view or manage users
            </p>

          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="input-field pl-10"
              placeholder="Search by name, email or role…"
              value={userSearch}
              onChange={(e) => { setUserSearch(e.target.value); searchUsers(); }}
              onKeyDown={(e) => e.key === 'Enter' && loadUsers(1, usersPageSize)}
            />
          </div>

          {usersLoading ? (
            <Spinner />
          ) : allUsers.length === 0 ? (
            <Empty text="No users match" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {allUsers.map((u) => (
                <div key={u._id} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-100 to-gold-100 text-sm font-extrabold text-brand-600 dark:from-brand-500/20 dark:to-gold-500/20 dark:text-brand-300">
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
          <Pagination
            page={usersPage}
              pageSize={usersPageSize}
              total={usersTotal}
              totalPages={usersTotalPages}
              onChangePage={(p) => { setUsersPage(p); loadUsers(p, usersPageSize); }}
              onPageSizeChange={(s) => { setUsersPageSize(s); setUsersPage(1); loadUsers(1, s); }}
            />
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

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create user">
        <form onSubmit={createUserSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <input className="input-field" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required />
            </Field>
            <Field label="Email">
              <input type="email" className="input-field" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required />
            </Field>
          </div>
          <Field label="Role">
            <select className="input-field" value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}>
              {['student', 'guard', 'admin', 'user'].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label="Mobile Number">
            <input className="input-field" value={createForm.mobileNumber} onChange={(e) => setCreateForm({ ...createForm, mobileNumber: e.target.value })} placeholder="e.g. 0777 123 456" />
          </Field>
          <Field label="Address">
            <input className="input-field" value={createForm.address} onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })} placeholder="Campus hall, room, block…" />
          </Field>
          <Field label="Password" hint="Required — min 6 characters">
            <input type="password" className="input-field" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Min 6 characters" required />
          </Field>
          <div className="flex gap-3">
            <button type="button" className="btn-ghost flex-1" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="submit" disabled={savingCreate} className="btn-primary flex-1">
              {savingCreate ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} Create
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
          <Field label="Photo" hint="Leave empty to keep the current photo">
            <input type="file" accept="image/*" className="input-field cursor-pointer" onChange={(e) => setItemImageFile(e.target.files[0] || null)} />
            {(itemImageFile || editingItem?.image) && (
              <img
                src={itemImageFile ? URL.createObjectURL(itemImageFile) : editingItem.image}
                alt="Current item"
                className="mt-2 h-24 w-full rounded-xl object-cover"
              />
            )}
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
          ? 'bg-gold-500 text-brand-950 shadow-glow'
          : 'bg-brand-800/40 text-brand-200/80 hover:bg-brand-700/60 hover:text-white'
      }`}
    >
      <Icon size={18} />
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-extrabold ${active ? 'bg-brand-950 text-gold-500' : 'bg-rose-400 text-white'}`}>
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

function FeedbackReviewCard({ feedback, onReview, onDelete }) {
  const category = FEEDBACK_CATEGORIES.find((c) => c.key === feedback.category);
  const author = feedback.user;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900 ${
        feedback.status === 'new' ? 'ring-1 ring-gold-300 dark:ring-gold-500/30' : ''
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-2">
          <Badge color={feedback.status}>{feedback.status}</Badge>
          <Badge color="feedback">{category?.label || feedback.category}</Badge>
        </span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-brand-100 to-gold-100 text-xs font-extrabold text-brand-600 dark:from-brand-500/20 dark:to-gold-500/20 dark:text-brand-300">
          {author?.avatar ? (
            <img src={author.avatar} alt={author.name} className="h-full w-full object-cover" />
          ) : (
            author?.name?.charAt(0).toUpperCase() || '?'
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-midnight dark:text-white">{author?.name || 'Unknown'}</p>
          <a href={`mailto:${author?.email || ''}`} className="truncate text-xs text-brand-600 hover:underline dark:text-brand-400">
            {author?.email}
          </a>
        </div>
        {author?.role && <Badge color={ROLE_BADGE[author.role] || 'system'}>{author.role}</Badge>}
      </div>

      <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {feedback.message}
      </p>

      {feedback.status === 'reviewed' && feedback.reviewedBy && (
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          Reviewed by {feedback.reviewedBy.name}
          {feedback.reviewedAt ? ` · ${formatDistanceToNow(new Date(feedback.reviewedAt), { addSuffix: true })}` : ''}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {feedback.status === 'new' ? (
          <button onClick={() => onReview('reviewed')} className="btn-primary !px-3 !py-2 text-xs">
            <Check size={14} /> Mark reviewed
          </button>
        ) : (
          <button onClick={() => onReview('new')} className="btn-ghost !px-3 !py-2 text-xs">
            <X size={14} /> Reopen
          </button>
        )}
        <button
          onClick={onDelete}
          className="btn-ghost !px-3 !py-2 text-xs !text-rose-600 hover:!bg-rose-50 dark:!text-rose-400 dark:hover:!bg-rose-500/10"
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </motion.div>
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
          {item?.description && (
            <p className="mt-1.5 line-clamp-2 rounded-lg bg-white p-2 text-[11px] leading-relaxed text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              {item.description}
            </p>
          )}
          {item?.date && (
            <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              {item.type === 'found' ? 'Found' : 'Lost'} · {format(new Date(item.date), 'PP')}
            </p>
          )}
          {item?.type === 'found' && (
            <p className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${item.handoverStatus === 'in_vault' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'}`}>
              {item.handoverStatus === 'in_vault' ? 'in guard room' : 'awaiting drop-off'}
            </p>
          )}
          {item?.createdBy?.name && (
            <p className="mt-1.5 truncate text-[11px] text-slate-400 dark:text-slate-500">
              Held by <span className="font-semibold text-slate-600 dark:text-slate-300">{item.createdBy.name}</span>
              {item.createdBy.mobileNumber ? ` · ${item.createdBy.mobileNumber}` : ''}
            </p>
          )}
        </div>

        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Claimant</p>
          <p className="text-sm font-bold text-midnight dark:text-white">{claim.claimant?.name}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{claim.claimant?.email}</p>
          {claim.contactNumber && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400">
              <Phone size={12} /> {claim.contactNumber}
            </p>
          )}
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