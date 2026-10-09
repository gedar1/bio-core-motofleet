import React from "react";
import type { InAppNotification } from "../../types/api";

interface NotificationToastProps {
  readonly notification: InAppNotification;
  readonly onClose: () => void;
}

export const NotificationToast: React.FC<Readonly<NotificationToastProps>> = ({
  notification,
  onClose,
}) => {
  return (
    <section
      className="w-full max-h-[calc(100vh-96px)] overflow-y-auto"
      aria-atomic="true"
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
          className="text-body-sm text-ink-muted underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label="Cerrar notificación"
        >
          ✕
        </button>
      </div>
    </section>
  );
};
