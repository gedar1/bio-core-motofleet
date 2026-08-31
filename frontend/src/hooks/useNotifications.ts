import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import type { InAppNotification } from "../types/api";

const POLL_INTERVAL_MS = 30_000;

interface UseNotificationsReturn {
  notifications: InAppNotification[];
  unreadCount: number;
  isLoading: boolean;
  hasError: boolean;
  toastNotification: InAppNotification | null;
  markAsRead: (notification: InAppNotification) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notification: InAppNotification) => Promise<void>;
  clearToast: () => void;
  openInboxFromToast: () => void;
  refresh: () => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [toastNotification, setToastNotification] =
    useState<InAppNotification | null>(null);

  const hasLoadedInitialNotificationsRef = useRef(false);
  const seenNotificationIdsRef = useRef(new Set<string>());

  const loadNotifications = useCallback(async () => {
    if (!token) return;

    try {
      const [items, unread] = await Promise.all([
        api.getNotifications(token),
        api.getUnreadNotificationCount(token),
      ]);

      if (hasLoadedInitialNotificationsRef.current) {
        const newNotifications = items.filter(
          (notification) =>
            !seenNotificationIdsRef.current.has(notification.id),
        );
        const newestUnreadNotification = newNotifications.find(
          (notification) => notification.read_at === null,
        );

        if (newestUnreadNotification) {
          setToastNotification(newestUnreadNotification);
        }

        newNotifications.forEach((notification) => {
          seenNotificationIdsRef.current.add(notification.id);
        });
      } else {
        items.forEach((notification) => {
          seenNotificationIdsRef.current.add(notification.id);
        });
        hasLoadedInitialNotificationsRef.current = true;
      }

      setNotifications(items);
      setUnreadCount(unread.count);
      setHasError(false);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadNotifications();
    const interval = window.setInterval(
      () => void loadNotifications(),
      POLL_INTERVAL_MS,
    );
    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  const markAsRead = useCallback(
    async (notification: InAppNotification) => {
      if (!token || notification.read_at) return;
      try {
        const updated = await api.markNotificationRead(token, notification.id);
        setNotifications((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setUnreadCount((current) => Math.max(0, current - 1));
      } catch {
        setHasError(true);
      }
    },
    [token],
  );

  const markAllAsRead = useCallback(async () => {
    if (!token || unreadCount === 0) return;
    try {
      await api.markAllNotificationsRead(token);
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          read_at: item.read_at ?? new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    } catch {
      setHasError(true);
    }
  }, [token, unreadCount]);

  const deleteNotification = useCallback(
    async (notification: InAppNotification) => {
      if (!token) return;
      try {
        await api.deleteNotification(token, notification.id);
        setNotifications((current) =>
          current.filter((item) => item.id !== notification.id),
        );
        if (!notification.read_at) {
          setUnreadCount((current) => Math.max(0, current - 1));
        }
        if (toastNotification?.id === notification.id) {
          setToastNotification(null);
        }
      } catch {
        setHasError(true);
      }
    },
    [token, toastNotification],
  );

  const clearToast = useCallback(() => {
    setToastNotification(null);
  }, []);

  const openInboxFromToast = useCallback(() => {
    clearToast();
  }, [clearToast]);

  return {
    notifications,
    unreadCount,
    isLoading,
    hasError,
    toastNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearToast,
    openInboxFromToast,
    refresh: loadNotifications,
  };
};
