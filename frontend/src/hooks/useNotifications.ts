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
  const deletedNotificationIdsRef = useRef(new Set<string>());
  const requestVersionRef = useRef(0);

  const loadNotifications = useCallback(async () => {
    if (!token) return;

    const requestVersion = requestVersionRef.current;

    try {
      const [items, unread] = await Promise.all([
        api.getNotifications(token),
        api.getUnreadNotificationCount(token),
      ]);

      // Do not let a response that started before a mutation overwrite it.
      if (requestVersion !== requestVersionRef.current) return;

      const visibleItems = items.filter(
        (notification) =>
          !deletedNotificationIdsRef.current.has(notification.id),
      );

      if (hasLoadedInitialNotificationsRef.current) {
        const newNotifications = visibleItems.filter(
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
        visibleItems.forEach((notification) => {
          seenNotificationIdsRef.current.add(notification.id);
        });
        hasLoadedInitialNotificationsRef.current = true;
      }

      setNotifications(visibleItems);
      setUnreadCount(unread.count);
      setHasError(false);
    } catch {
      if (requestVersion === requestVersionRef.current) {
        setHasError(true);
      }
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setIsLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    deletedNotificationIdsRef.current.clear();
    seenNotificationIdsRef.current.clear();
    hasLoadedInitialNotificationsRef.current = false;
    requestVersionRef.current += 1;
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
      if (!token || deletedNotificationIdsRef.current.has(notification.id)) {
        return;
      }

      // Hide it from any in-flight polling response immediately.
      deletedNotificationIdsRef.current.add(notification.id);
      requestVersionRef.current += 1;

      try {
        await api.deleteNotification(token, notification.id);
        // Invalidate reads that started while DELETE was in flight.
        requestVersionRef.current += 1;
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
        deletedNotificationIdsRef.current.delete(notification.id);
        requestVersionRef.current += 1;
        setHasError(true);
        void loadNotifications();
      }
    },
    [token, toastNotification, loadNotifications],
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
