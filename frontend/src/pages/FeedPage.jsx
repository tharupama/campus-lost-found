import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useDebouncedCallback } from 'use-debounce';
import toast from 'react-hot-toast';
import FilterBar from '../components/feed/FilterBar';
import ItemCard from '../components/ui/ItemCard';
import Spinner from '../components/ui/Spinner';
import { itemService } from '../services';

export default function FeedPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', category: '', location: '', search: '' });

  const search = useDebouncedCallback((f) => {
    const q = f.search.trim();
    const params = {
      ...(f.type && { type: f.type }),
      ...(f.category && { category: f.category }),
      ...(f.location && { location: f.location }),
      ...(q && { search: q }),
    };
    setLoading(true);
    itemService
      .getItems(params)
      .then((data) => setItems(data.items))
      .catch(() => toast.error('Could not load items'))
      .finally(() => setLoading(false));
  }, 350);

  useEffect(() => {
    search(filters);
  }, [filters]);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-4 md:pb-10">
      <FilterBar filters={filters} onChange={setFilters} />

      {loading ? (
        <Spinner full />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <span className="mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-3xl shadow-card">
            🔎
          </span>
          <p className="text-lg font-bold text-midnight">Nothing here yet</p>
          <p className="mt-1 max-w-xs text-sm text-slate-400">
            Try different filters or search — or be the first to report an item.
          </p>
        </div>
      ) : (
        <motion.div layout className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item._id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <ItemCard item={item} onClick={() => navigate(`/items/${item._id}`)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}