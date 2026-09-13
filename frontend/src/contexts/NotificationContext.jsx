import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { notificationService } from '../services';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const data = await notificationService.getMine(page, pageSize);
      setNotifications(data.notifications);
      setUnread(data.unread);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      // silent
    }
  }, [user, page, pageSize]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markAllRead = async () => {
    if (!unread) return;
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
      await refresh();
    } catch {
      // silent
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unread,
        total,
        totalPages,
        page,
        pageSize,
        setPage,
        setPageSize,
        refresh,
        markAllRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);