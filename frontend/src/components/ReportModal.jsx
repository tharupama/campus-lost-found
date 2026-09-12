import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';
import { Field } from '../components/ui/Field';
import { CATEGORIES, BUILDINGS } from '../config/constants';
import { itemService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import Swal from 'sweetalert2';

export default function ReportModal({ open, onClose, type, prefill = {} }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: '',
    category: '',
    location: '',
    date: '',
    description: '',
    secretFeature: '',
    ...prefill,
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showSecret, setShowSecret] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image must be under 8MB');
      return;
    }
    setImage(file);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 900 / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        setPreview(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function reset() {
    setForm({ title: '', category: '', location: '', date: '', description: '', secretFeature: '', ...prefill });
    setImage(null);
    setPreview(null);
    setShowSecret(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title || !form.category || !form.location) {
      toast.error('Title, category and location are required');
      return;
    }
    if (type === 'found' && !form.secretFeature.trim()) {
      toast.error('Add a Secret Mark so the right owner can prove it\'s theirs');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('type', type);
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (image) fd.append('image', image);
      const { matchCount } = await itemService.createItem(fd);
      toast.success(
        type === 'lost'
          ? 'Report posted — keep an eye on alerts'
          : 'Found item registered — drop it off at the guard room to make it live'
      );
      if (matchCount > 0) {
        await Swal.fire({
          icon: 'success',
          title: `${matchCount} match${matchCount > 1 ? 'es' : ''} found!`,
          text: 'The auto-match engine notified people whose lost item could be a match.',
          confirmButtonColor: '#4f46e5',
        });
      }
      reset();
      onClose(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title={type === 'lost' ? 'Report a Lost Item' : 'Report a Found Item'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Item photo" hint="Compressed automatically. Cloudinary when configured, else stored locally.">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative flex h-24 w-28 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-brand-400"
            >
              {preview ? (
                <img src={preview} alt="preview" className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-brand-500">
                  <ImagePlus size={22} />
                  <span className="text-[10px] font-semibold">Upload</span>
                </span>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            <p className="text-xs leading-relaxed text-slate-400">
              Tip: good lighting and a clean background help people recognize your item faster.
            </p>
          </div>
        </Field>

        <Field label="Item name">
          <input className="input-field" value={form.title} onChange={set('title')} placeholder={type === 'lost' ? 'e.g. Sony headphones' : 'e.g. Black backpack'} required />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select className="input-field" value={form.category} onChange={set('category')} required>
              <option value="">Select…</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Building">
            <select className="input-field" value={form.location} onChange={set('location')} required>
              <option value="">Select…</option>
              {BUILDINGS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={type === 'lost' ? 'Date lost' : 'Date found'}>
            <input type="date" className="input-field" value={form.date} onChange={set('date')} required />
          </Field>
          <Field label="Status">
            <input className="input-field bg-slate-50 text-slate-500" value="Active" disabled />
          </Field>
        </div>

        <Field label="Description">
          <textarea className="input-field min-h-24 resize-none" value={form.description} onChange={set('description')} placeholder="Color, brand, anything unusual…" />
        </Field>

        {type === 'found' && (
          <Field
            label="Secret Mark"
            hint="Hidden from the public feed. The right owner must describe it to unlock a claim."
          >
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                className="input-field pr-11"
                value={form.secretFeature}
                onChange={set('secretFeature')}
                placeholder="e.g. star scratch on left ear cup"
                required
              />
              <button
                type="button"
                onClick={() => setShowSecret((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Toggle secret visibility"
              >
                {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
        )}

        <p className="text-xs text-slate-400">
          Reporting as <span className="font-semibold text-slate-600">{user?.name}</span> ·{' '}
          {user?.email}
        </p>

        {type === 'found' && (
          <div className="rounded-xl border border-brand-100 bg-brand-50 p-3 text-xs leading-relaxed text-brand-700">
            Your find stays <span className="font-semibold">hidden from the public feed</span> until you hand
            it over to the guard room. You'll get reminder notifications until the item is dropped off.
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? <Loader2 className="animate-spin" size={18} /> : <span>Submit Report</span>}
        </button>
      </form>
    </Modal>
  );
}