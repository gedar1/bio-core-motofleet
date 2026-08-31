import React from "react";
import { x_light } from "@/assets/icons";
import { NotificationList } from "./NotificationList";
import type { InAppNotification } from "../../types/api";

interface NotificationModalProps {
  readonly ref: React.RefObject<HTMLDialogElement>;
  readonly unreadCount: number;
  readonly notifications: readonly InAppNotification[];
  readonly isLoading: boolean;
  readonly hasError: boolean;
  readonly onClose: () => void;
  readonly onMarkAllAsRead: () => Promise<void>;
  readonly onMarkAsRead: (notification: InAppNotification) => Promise<void>;
  readonly onDelete: (notification: InAppNotification) => Promise<void>;
}

export const NotificationModal = React.forwardRef<
  HTMLDialogElement,
  Readonly<Omit<NotificationModalProps, "ref">>
>(
  (
    {
      unreadCount,
      notifications,
      isLoading,
      hasError,
      onClose,
      onMarkAllAsRead,
      onMarkAsRead,
      onDelete,
    },
    ref,
  ) => {
    return (
      <dialog
        ref={ref}
        className="lg:hidden w-full max-h-[80vh] rounded-lg backdrop:bg-black/50 p-0"
      >
        <section
          className="w-full bg-canvas rounded-t-lg max-h-[80vh] overflow-y-auto flex flex-col"
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
            <button
              type="button"
              onClick={onClose}
              className="text-ink flex-shrink-0 p-1"
              aria-label="Cerrar notificaciones"
            >
              <img
                src={x_light}
                alt=""
                aria-hidden="true"
                className="w-5 h-5"
              />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-md">
            <button
              type="button"
              onClick={() => void onMarkAllAsRead()}
              disabled={unreadCount === 0}
              className="mb-md w-full text-body-sm text-ink underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              Marcar todas leídas
            </button>

            <NotificationList
              notifications={notifications}
              isLoading={isLoading}
              hasError={hasError}
              onMarkAsRead={onMarkAsRead}
              onDelete={onDelete}
            />
          </div>
        </section>
      </dialog>
    );
  },
);

NotificationModal.displayName = "NotificationModal";
