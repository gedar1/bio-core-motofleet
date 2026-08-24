import React, { useCallback, useEffect, useRef, useState } from "react";
import bell from "../../assets/icons/bell.svg";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import type { InAppNotification } from "../../types/api";

const POLL_INTERVAL_MS = 30_000;
const TOAST_DURATION_MS = 7_000;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export const NotificationBell: React.FC = () => {
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [toastNotification, setToastNotification] =
    useState<InAppNotification | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!toastNotification) return;

    const timeout = window.setTimeout(
      () => setToastNotification(null),
      TOAST_DURATION_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [toastNotification]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setToastNotification(null);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const markAsRead = async (notification: InAppNotification) => {
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
  };

  const markAllAsRead = async () => {
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
  };

  const deleteNotification = async (notification: InAppNotification) => {
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
  };

  const openInboxFromToast = () => {
    setIsOpen(true);
    setToastNotification(null);
  };

  let notificationContent: React.ReactNode;
  if (isLoading) {
    notificationContent = (
      <p className="p-md text-body-sm text-ink-muted">
        Cargando notificaciones...
      </p>
    );
  } else if (hasError) {
    notificationContent = (
      <p className="p-md text-body-sm text-red-700">
        No fue posible cargar las notificaciones.
      </p>
    );
  } else if (notifications.length === 0) {
    notificationContent = (
      <p className="p-md text-body-sm text-ink-muted">
        No tienes notificaciones.
      </p>
    );
  } else {
    notificationContent = (
      <ul className="divide-y divide-hairline-soft">
        {notifications.map((notification) => (
          <li
            key={notification.id}
            className={`p-md ${notification.read_at ? "bg-canvas" : "bg-cream/40"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-body font-semibold text-ink">
                  {notification.title}
                </p>
                <p className="mt-1 text-body-sm text-ink-muted">
                  {notification.message}
                </p>
                <p className="mt-2 text-caption text-ink-muted">
                  {formatDate(notification.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void deleteNotification(notification)}
                className="text-body-sm text-ink-muted underline"
                aria-label={`Eliminar ${notification.title}`}
              >
                Eliminar
              </button>
            </div>
            {!notification.read_at && (
              <button
                type="button"
                onClick={() => void markAsRead(notification)}
                className="mt-2 text-body-sm text-ink underline"
              >
                Marcar como leída
              </button>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="relative w-[36px] h-[36px] flex items-center justify-center rounded-md border border-hairline text-ink transition-colors"
        aria-label="Abrir notificaciones"
        aria-expanded={isOpen}
      >
        <img src={bell} alt="" aria-hidden="true" className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[11px] leading-5 font-bold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {toastNotification && (
        <section
          className="fixed inset-x-4 bottom-4 z-[60] rounded-md border border-hairline bg-canvas p-md shadow-lg sm:left-auto sm:right-4 sm:w-[24rem]"
          role="status"
          aria-live="polite"
          aria-label="Nueva notificación"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-body font-semibold text-ink">
                {toastNotification.title}
              </p>
              <p className="mt-1 text-body-sm text-ink-muted">
                {toastNotification.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setToastNotification(null)}
              className="text-body-sm text-ink-muted underline"
              aria-label="Cerrar notificación"
            >
              Cerrar
            </button>
          </div>
          <button
            type="button"
            onClick={openInboxFromToast}
            className="mt-3 text-body-sm font-semibold text-ink underline"
          >
            Ver notificaciones
          </button>
        </section>
      )}

      {isOpen && (
        <section
          className="absolute lg:right-0 right-[-65px] mt-2 w-[min(24rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto rounded-md border border-primary-deep bg-canvas shadow-lg"
          aria-label="Bandeja de notificaciones"
        >
          <header className="sticky top-0 flex items-center justify-between gap-3 border-b border-hairline-soft bg-canvas p-md">
            <div>
              <h2 className="text-body font-semibold text-ink">
                Notificaciones
              </h2>
              <p className="text-body-sm text-ink-muted">
                {unreadCount} sin leer
              </p>
            </div>
            <button
              type="button"
              onClick={() => void markAllAsRead()}
              disabled={unreadCount === 0}
              className="text-body-sm text-ink underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              Marcar todas leídas
            </button>
          </header>

          {notificationContent}
        </section>
      )}
    </div>
  );
};
