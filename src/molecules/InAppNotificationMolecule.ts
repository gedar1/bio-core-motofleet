import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { ILogger } from "../infrastructure/logger.js";
import type { Errand } from "./ErrandMolecule.js";
import type { IMolecule } from "./IMolecule.js";

export type NotificationRecipientRole = "user" | "rider" | "admin";
export type NotificationPriority = "low" | "normal" | "high" | "critical";

export interface InAppNotification {
  id: string;
  recipient_id: string;
  recipient_role: NotificationRecipientRole;
  type: string;
  title: string;
  message: string;
  resource_type: string | null;
  resource_id: string | null;
  data: Record<string, unknown>;
  priority: NotificationPriority;
  read_at: string | null;
  created_at: string;
}

interface CreateNotificationInput {
  recipientId: string;
  recipientRole: NotificationRecipientRole;
  type: string;
  title: string;
  message: string;
  priority?: NotificationPriority;
  resourceType?: string;
  resourceId?: string;
  data?: Record<string, unknown>;
  deduplicationKey: string;
}

type NotificationRow = Omit<InAppNotification, "data"> & {
  data_json: string;
};

/** Persists and serves in-app notifications independently from SMTP delivery. */
export class InAppNotificationMolecule implements IMolecule {
  readonly name = "in-app-notifications";
  readonly version = "1.0.0";

  constructor(
    private readonly db: Database.Database,
    private readonly logger: ILogger,
  ) {}

  create(input: CreateNotificationInput): InAppNotification | null {
    const id = uuidv4();
    const now = new Date().toISOString();

    const result = this.db
      .prepare(
        `INSERT INTO notifications (
          id, recipient_id, recipient_role, type, title, message, resource_type,
          resource_id, data_json, priority, deduplication_key, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(deduplication_key) DO NOTHING`,
      )
      .run(
        id,
        input.recipientId,
        input.recipientRole,
        input.type,
        input.title,
        input.message,
        input.resourceType ?? null,
        input.resourceId ?? null,
        JSON.stringify(input.data ?? {}),
        input.priority ?? "normal",
        input.deduplicationKey,
        now,
      );

    if (result.changes === 0) return null;

    const notification = this.getById(id);
    if (notification) {
      this.logger.info("In-app notification created", {
        notificationId: id,
        type: input.type,
        recipientRole: input.recipientRole,
      });
    }
    return notification;
  }

  listForRecipient(
    recipientId: string,
    recipientRole: NotificationRecipientRole,
    limit = 20,
  ): InAppNotification[] {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const rows = this.db
      .prepare(
        `SELECT * FROM notifications
         WHERE recipient_id = ? AND recipient_role = ?
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .all(recipientId, recipientRole, safeLimit) as NotificationRow[];

    return rows.map((row) => this.toNotification(row));
  }

  countUnread(
    recipientId: string,
    recipientRole: NotificationRecipientRole,
  ): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS count FROM notifications
         WHERE recipient_id = ? AND recipient_role = ? AND read_at IS NULL`,
      )
      .get(recipientId, recipientRole) as { count: number };
    return row.count;
  }

  markRead(
    notificationId: string,
    recipientId: string,
    recipientRole: NotificationRecipientRole,
  ): InAppNotification | null {
    const now = new Date().toISOString();
    const result = this.db
      .prepare(
        `UPDATE notifications SET read_at = COALESCE(read_at, ?)
         WHERE id = ? AND recipient_id = ? AND recipient_role = ?`,
      )
      .run(now, notificationId, recipientId, recipientRole);

    if (result.changes === 0) return null;
    return this.getForRecipient(notificationId, recipientId, recipientRole);
  }

  markAllRead(
    recipientId: string,
    recipientRole: NotificationRecipientRole,
  ): number {
    const now = new Date().toISOString();
    return this.db
      .prepare(
        `UPDATE notifications SET read_at = ?
         WHERE recipient_id = ? AND recipient_role = ? AND read_at IS NULL`,
      )
      .run(now, recipientId, recipientRole).changes;
  }

  deleteForRecipient(
    notificationId: string,
    recipientId: string,
    recipientRole: NotificationRecipientRole,
  ): boolean {
    return (
      this.db
        .prepare(
          "DELETE FROM notifications WHERE id = ? AND recipient_id = ? AND recipient_role = ?",
        )
        .run(notificationId, recipientId, recipientRole).changes === 1
    );
  }

  notifyErrandCreated(errand: Errand): void {
    const data = { errandId: errand.id, status: errand.status };
    this.createErrandNotification(
      errand,
      "created",
      "user",
      errand.user_id,
      "Solicitud creada",
      "Tu solicitud fue registrada y está pendiente de asignación.",
      "normal",
      data,
    );
    this.createForActiveAdmins(
      errand,
      "created",
      "Nueva solicitud",
      "Se creó una nueva solicitud pendiente de asignación.",
      "normal",
      data,
    );
    this.createForAvailableRiders(
      errand,
      "created",
      "Nuevo servicio disponible",
      "Hay una nueva solicitud disponible para aceptar.",
      "normal",
      data,
    );
  }

  notifyErrandStatusChange(errand: Errand): void {
    const details = this.statusDetails(errand);
    this.createErrandNotification(
      errand,
      errand.status,
      "user",
      errand.user_id,
      details.userTitle,
      details.userMessage,
      details.priority,
      details.data,
    );

    if (errand.rider_id) {
      this.createErrandNotification(
        errand,
        errand.status,
        "rider",
        errand.rider_id,
        details.riderTitle,
        details.riderMessage,
        details.priority,
        details.data,
      );
    }

    this.createForActiveAdmins(
      errand,
      errand.status,
      details.adminTitle,
      details.adminMessage,
      details.priority,
      details.data,
    );
  }

  private createForActiveAdmins(
    errand: Errand,
    event: string,
    title: string,
    message: string,
    priority: NotificationPriority,
    data: Record<string, unknown>,
  ): void {
    const admins = this.db
      .prepare("SELECT id FROM admins WHERE status = 'active'")
      .all() as Array<{ id: string }>;
    for (const admin of admins) {
      this.createErrandNotification(
        errand,
        event,
        "admin",
        admin.id,
        title,
        message,
        priority,
        data,
      );
    }
  }

  private createForAvailableRiders(
    errand: Errand,
    event: string,
    title: string,
    message: string,
    priority: NotificationPriority,
    data: Record<string, unknown>,
  ): void {
    const riders = this.db
      .prepare(
        "SELECT id FROM riders WHERE status = 'active' AND available = 1",
      )
      .all() as Array<{ id: string }>;
    for (const rider of riders) {
      this.createErrandNotification(
        errand,
        event,
        "rider",
        rider.id,
        title,
        message,
        priority,
        data,
      );
    }
  }

  private createErrandNotification(
    errand: Errand,
    event: string,
    recipientRole: NotificationRecipientRole,
    recipientId: string,
    title: string,
    message: string,
    priority: NotificationPriority,
    data: Record<string, unknown>,
  ): void {
    this.create({
      recipientId,
      recipientRole,
      type: `errand.${event}`,
      title,
      message,
      priority,
      resourceType: "errand",
      resourceId: errand.id,
      data,
      deduplicationKey: `errand:${errand.id}:${event}:${recipientRole}:${recipientId}`,
    });
  }

  private statusDetails(errand: Errand): {
    userTitle: string;
    userMessage: string;
    riderTitle: string;
    riderMessage: string;
    adminTitle: string;
    adminMessage: string;
    priority: NotificationPriority;
    data: Record<string, unknown>;
  } {
    const data = {
      errandId: errand.id,
      status: errand.status,
      cancellationReason: errand.cancellation_reason,
    };

    switch (errand.status) {
      case "accepted":
        return {
          userTitle: "Solicitud aceptada",
          userMessage:
            "Un rider aceptó tu solicitud y se dirigirá al punto de origen.",
          riderTitle: "Servicio aceptado",
          riderMessage:
            "Has aceptado este servicio. Revisa la ruta y dirígete al punto de origen.",
          adminTitle: "Solicitud asignada",
          adminMessage: "Un rider aceptó una solicitud pendiente.",
          priority: "normal",
          data,
        };
      case "picked_up":
        return {
          userTitle: "Pedido recogido",
          userMessage:
            "El rider recogió tu pedido y está en camino al destino.",
          riderTitle: "Pedido recogido",
          riderMessage: "El pedido fue marcado como recogido.",
          adminTitle: "Pedido recogido",
          adminMessage: "Un pedido fue recogido y está en tránsito.",
          priority: "normal",
          data,
        };
      case "delivered":
        return {
          userTitle: "Pedido entregado",
          userMessage: "Tu pedido fue entregado correctamente.",
          riderTitle: "Servicio completado",
          riderMessage: "El pedido fue marcado como entregado.",
          adminTitle: "Pedido entregado",
          adminMessage: "Un pedido fue entregado correctamente.",
          priority: "normal",
          data,
        };
      case "cancelled":
        return {
          userTitle: "Solicitud cancelada",
          userMessage: errand.cancellation_reason
            ? `La solicitud fue cancelada. Motivo: ${errand.cancellation_reason}`
            : "La solicitud fue cancelada.",
          riderTitle: "Servicio cancelado",
          riderMessage: errand.cancellation_reason
            ? `El servicio fue cancelado. Motivo: ${errand.cancellation_reason}`
            : "El servicio fue cancelado.",
          adminTitle: "Solicitud cancelada",
          adminMessage:
            "Una solicitud fue cancelada y requiere seguimiento si corresponde.",
          priority: "high",
          data,
        };
      default:
        return {
          userTitle: "Solicitud actualizada",
          userMessage: "El estado de tu solicitud fue actualizado.",
          riderTitle: "Servicio actualizado",
          riderMessage: "El estado del servicio fue actualizado.",
          adminTitle: "Solicitud actualizada",
          adminMessage: "El estado de una solicitud fue actualizado.",
          priority: "normal",
          data,
        };
    }
  }

  private getById(notificationId: string): InAppNotification | null {
    const row = this.db
      .prepare("SELECT * FROM notifications WHERE id = ?")
      .get(notificationId) as NotificationRow | undefined;
    return row ? this.toNotification(row) : null;
  }

  private getForRecipient(
    notificationId: string,
    recipientId: string,
    recipientRole: NotificationRecipientRole,
  ): InAppNotification | null {
    const row = this.db
      .prepare(
        "SELECT * FROM notifications WHERE id = ? AND recipient_id = ? AND recipient_role = ?",
      )
      .get(notificationId, recipientId, recipientRole) as
      | NotificationRow
      | undefined;
    return row ? this.toNotification(row) : null;
  }

  private toNotification(row: NotificationRow): InAppNotification {
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(row.data_json) as Record<string, unknown>;
    } catch {
      this.logger.warn("Notification data could not be parsed", {
        notificationId: row.id,
      });
    }
    const { data_json: _dataJson, ...notification } = row;
    return { ...notification, data };
  }
}
