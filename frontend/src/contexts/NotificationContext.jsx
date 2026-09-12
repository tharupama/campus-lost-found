import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { notificationService } from '../services';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const data = await notificationService.getMine();
      setNotifications(data.notifications);
      setUnread(data.unread);
    } catch {
      // silent
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markAllRead = async () => {
    if (!unread) return;
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {
      // silent
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unread, refresh, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);