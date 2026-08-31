import React from "react";
import { NotificationListItem } from "./NotificationListItem";
import type { InAppNotification } from "../../types/api";

interface NotificationListProps {
  readonly notifications: readonly InAppNotification[];
  readonly isLoading: boolean;
  readonly hasError: boolean;
  readonly onMarkAsRead: (notification: InAppNotification) => Promise<void>;
  readonly onDelete: (notification: InAppNotification) => Promise<void>;
}

export const NotificationList: React.FC<Readonly<NotificationListProps>> = ({
  notifications,
  isLoading,
  hasError,
  onMarkAsRead,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <p className="p-md text-body-sm text-ink-muted">
        Cargando notificaciones...
      </p>
    );
  }

  if (hasError) {
    return (
      <p className="p-md text-body-sm text-red-700">
        No fue posible cargar las notificaciones.
      </p>
    );
  }

  if (notifications.length === 0) {
    return (
      <p className="p-md text-body-sm text-ink-muted">
        No tienes notificaciones.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-hairline-soft">
      {notifications.map((notification) => (
        <NotificationListItem
          key={notification.id}
          notification={notification}
          onMarkAsRead={onMarkAsRead}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
};
