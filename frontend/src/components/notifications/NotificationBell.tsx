import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { bell, check_check } from "@/assets/icons";
import { useNotifications } from "../../hooks/useNotifications";
import { NotificationList } from "./NotificationList";
import { NotificationToast } from "./NotificationToast";

const TOAST_DURATION_MS = 9_000;

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

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
  } = useNotifications();

  const dismissToast = useCallback(
    (notificationId: string) => {
      toast.dismiss(notificationId);
      clearToast();
    },
    [clearToast],
  );

  // Show each persisted notification once in the global react-hot-toast host.
  useEffect(() => {
    if (!toastNotification) return;

    const notification = toastNotification;
    const isError =
      notification.type === "errand.cancelled" ||
      notification.priority === "high" ||
      notification.priority === "critical";
    const ariaProps = isError
      ? { role: "alert" as const, "aria-live": "assertive" as const }
      : { role: "status" as const, "aria-live": "polite" as const };
    const toastOptions = {
      id: notification.id,
      duration: TOAST_DURATION_MS,
      ariaProps,
      style: {
        width: "min(350px, calc(100vw - 2rem))",
      },
    };
    const content = (
      <NotificationToast
        notification={notification}
        onClose={() => dismissToast(notification.id)}
      />
    );

    if (notification.type === "errand.delivered") {
      toast.success(content, toastOptions);
    } else if (isError) {
      toast.error(content, toastOptions);
    } else {
      toast(content, toastOptions);
    }

    const timeoutId = window.setTimeout(clearToast, TOAST_DURATION_MS);
    return () => {
      window.clearTimeout(timeoutId);
      toast.dismiss(notification.id);
    };
  }, [clearToast, dismissToast, toastNotification]);

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

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative w-[36px] h-[36px] flex items-center justify-center text-ink transition-colors"
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

      {/* Modal for both desktop and mobile */}
      <dialog
        ref={dialogRef}
        className="w-11/12 md:max-w-[600px] max-h-[80vh] rounded-lg backdrop:bg-black/50 p-0"
      >
        <section
          className="w-full bg-canvas rounded-lg max-h-[80vh] overflow-y-auto flex flex-col"
          aria-label="Bandeja de notificaciones"
        >
          <header className="sticky top-0 flex items-start justify-between gap-3 border-b border-hairline-soft bg-canvas p-md shrink-0">
            <div>
              <h2 className="text-body-md-medium font-semibold text-ink">
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
                <img
                  src={check_check}
                  alt=""
                  aria-hidden="true"
                  className=" h-5 w-5"
                />
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
