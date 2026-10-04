import React from "react";
import type { InAppNotification } from "../../types/api";

interface NotificationToastProps {
  readonly notification: InAppNotification;
  readonly onClose: () => void;
  readonly onOpenInbox: () => void;
  readonly onOpenAvailable: () => void;
}

export const NotificationToast: React.FC<Readonly<NotificationToastProps>> = ({
  notification,
  onClose,
  onOpenInbox,
  onOpenAvailable,
}) => {
  return (
    <section
      className="fixed inset-x-4 bottom-[calc(64px+env(safe-area-inset-bottom)+1rem)] z-[60] m-sm max-h-[calc(100vh-96px)] overflow-y-auto rounded-md border border-primary bg-cream p-md shadow-lg sm:bottom-4 sm:left-auto sm:right-4 sm:w-[24rem]"
      role="status"
      aria-live="polite"
      aria-label="Nueva notificación"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-body font-semibold text-ink">
            {notification.title}
          </p>
          <p className="mt-1 text-body-sm text-ink-muted">
            {notification.message}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-body-sm text-ink-muted underline"
          aria-label="Cerrar notificación"
        >
          Cerrar
        </button>
      </div>
      {notification.type === "errand.created" && (
        <button
          type="button"
          onClick={onOpenAvailable}
          className="mt-3 block text-body-sm font-semibold text-primary underline"
        >
          Ver favores disponibles
        </button>
      )}
      <button
        type="button"
        onClick={onOpenInbox}
        className="mt-3 text-body-sm font-semibold text-ink underline"
      >
        Ver notificaciones
      </button>
    </section>
  );
};
