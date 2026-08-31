import React from "react";
import { x_light } from "@/assets/icons";
import { NotificationList } from "./NotificationList";
import type { InAppNotification } from "../../types/api";

interface NotificationDropdownProps {
  readonly unreadCount: number;
  readonly notifications: readonly InAppNotification[];
  readonly isLoading: boolean;
  readonly hasError: boolean;
  readonly onClose: () => void;
  readonly onMarkAllAsRead: () => Promise<void>;
  readonly onMarkAsRead: (notification: InAppNotification) => Promise<void>;
  readonly onDelete: (notification: InAppNotification) => Promise<void>;
}

export const NotificationDropdown: React.FC<
  Readonly<NotificationDropdownProps>
> = ({
  unreadCount,
  notifications,
  isLoading,
  hasError,
  onClose,
  onMarkAllAsRead,
  onMarkAsRead,
  onDelete,
}) => {
  return (
    <div className="absolute right-0 mt-2 w-[24rem] max-h-[70vh] rounded-md border border-primary-deep bg-canvas shadow-lg z-50">
      <section
        className="w-full overflow-y-auto h-full flex flex-col"
        aria-label="Bandeja de notificaciones"
      >
        <header className="sticky top-0 flex items-center justify-between gap-3 border-b border-hairline-soft bg-canvas p-md shrink-0">
          <div>
            <h2 className="text-body font-semibold text-ink">
              Notificaciones
            </h2>
            <p className="text-body-sm text-ink-muted">{unreadCount} sin leer</p>
          </div>
          <div className="flex gap-2 items-center shrink-0">
            <button
              type="button"
              onClick={() => void onMarkAllAsRead()}
              disabled={unreadCount === 0}
              className="text-body-sm text-ink underline disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
            >
              Marcar todas leídas
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-ink p-1"
              aria-label="Cerrar notificaciones"
            >
              <img
                src={x_light}
                alt=""
                aria-hidden="true"
                className="w-4 h-4"
              />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <NotificationList
            notifications={notifications}
            isLoading={isLoading}
            hasError={hasError}
            onMarkAsRead={onMarkAsRead}
            onDelete={onDelete}
          />
        </div>
      </section>
    </div>
  );
};
