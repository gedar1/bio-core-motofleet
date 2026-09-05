import React, { useEffect, useRef, useState } from "react";
import { bell } from "@/assets/icons";
import { useNotifications } from "../../hooks/useNotifications";
import { NotificationList } from "./NotificationList";
import { NotificationToast } from "./NotificationToast";

const TOAST_DURATION_MS = 7_000;

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const {
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
  } = useNotifications();

  // Handle toast timeout
  useEffect(() => {
    if (!toastNotification) return;

    toastTimeoutRef.current = setTimeout(clearToast, TOAST_DURATION_MS);
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [toastNotification, clearToast]);

  // Handle dialog open/close
  useEffect(() => {
    if (!dialogRef.current) return;

    if (isOpen) {
      dialogRef.current.showModal();
    } else {
      dialogRef.current.close();
    }
  }, [isOpen]);

  // Handle dialog close events (including Escape key)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      setIsOpen(false);
    };

    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("close", handleClose);
    };
  }, []);

  const handleOpenInboxFromToast = () => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setIsOpen(true);
    openInboxFromToast();
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative w-[36px] h-[36px] flex items-center justify-center rounded-md border border-hairline text-ink transition-colors"
        aria-label="Abrir notificaciones"
        aria-expanded={isOpen}
      >
        <img src={bell} alt="" aria-hidden="true" className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[11px] leading-5 font-bold"
            aria-label={`${unreadCount} notificaciones sin leer`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Toast */}
      {toastNotification && (
        <NotificationToast
          notification={toastNotification}
          onClose={clearToast}
          onOpenInbox={handleOpenInboxFromToast}
        />
      )}

      {/* Modal for both desktop and mobile */}
      <dialog
        ref={dialogRef}
        className="w-11/12 md:max-w-[600px] max-h-[80vh] rounded-lg backdrop:bg-black/50 p-0"
      >
        <section
          className="w-full bg-canvas rounded-lg max-h-[80vh] overflow-y-auto flex flex-col"
          aria-label="Bandeja de notificaciones"
        >
          <header className="sticky top-0 flex items-center justify-between gap-3 border-b border-hairline-soft bg-canvas p-md shrink-0">
            <div>
              <h2 className="text-heading-4 font-semibold text-ink">
                Notificaciones
              </h2>
              <p className="text-body-sm text-ink-muted">
                {unreadCount} sin leer
              </p>
            </div>
            <div className="flex gap-md items-center shrink-0">
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                disabled={unreadCount === 0}
                className="text-body-sm text-ink underline disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
              >
                Marcar todas leídas
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="text-ink p-1"
                aria-label="Cerrar notificaciones"
              >
                ✕
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-md">
            <NotificationList
              notifications={notifications}
              isLoading={isLoading}
              hasError={hasError}
              onMarkAsRead={markAsRead}
              onDelete={deleteNotification}
            />
          </div>
        </section>
      </dialog>
    </div>
  );
};
