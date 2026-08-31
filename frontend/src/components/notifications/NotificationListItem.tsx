import React from "react";
import { trash_2, check } from "@/assets/icons";
import { formatDateColombia } from "../../utils/dateFormatter";
import type { InAppNotification } from "../../types/api";

interface NotificationListItemProps {
  readonly notification: InAppNotification;
  readonly onMarkAsRead: (notification: InAppNotification) => Promise<void>;
  readonly onDelete: (notification: InAppNotification) => Promise<void>;
}

export const NotificationListItem: React.FC<
  Readonly<NotificationListItemProps>
> = ({ notification, onMarkAsRead, onDelete }) => {
  return (
    <li
      className={`p-md ${notification.read_at ? "bg-canvas" : "bg-cream/40"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="w-4/5">
          <p className="text-body font-semibold text-ink">
            {notification.title}
          </p>
          <p className="mt-1 text-body-sm text-ink-muted">
            {notification.message}
          </p>
          <p className="mt-2 text-caption text-ink-muted">
            {formatDateColombia(notification.created_at)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onDelete(notification)}
          className="text-body-sm text-ink-muted underline"
          aria-label={`Eliminar ${notification.title}`}
        >
          <img src={trash_2} alt="" aria-hidden="true" className="h-3 w-3" />
        </button>
      </div>
      {!notification.read_at && (
        <button
          type="button"
          onClick={() => void onMarkAsRead(notification)}
          className="mt-2 text-body-sm text-ink underline"
        >
          <img src={check} alt="" aria-hidden="true" className="h-3 w-3" />
        </button>
      )}
    </li>
  );
};
