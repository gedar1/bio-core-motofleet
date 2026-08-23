import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { ILogger } from "../infrastructure/logger.js";
import type { IMolecule } from "./IMolecule.js";
import type { ErrandState } from "../atoms/stateMachines.js";
import nodemailer from "nodemailer";

export interface Notification {
  id: string;
  errand_id: string;
  recipient_email: string;
  subject: string;
  body: string;
  status: "pending" | "sent" | "failed";
  attempts: number;
  next_retry_at: string | null;
  created_at: string;
  sent_at: string | null;
}

/**
 * Molecule responsible for email notification management.
 * Queues notifications on errand state changes and processes the queue
 * with retry logic (max 3 attempts, 30s intervals).
 */
export class NotificationMolecule implements IMolecule {
  readonly name = "notifications";
  readonly version = "1.0.0";
  readonly description = "Email notification queue with retry logic.";

  private readonly transporter: nodemailer.Transporter;
  private readonly emailNotificationsEnabled =
    process.env.EMAIL_NOTIFICATIONS_ENABLED === "true";

  constructor(
    private readonly db: Database.Database,
    private readonly logger: ILogger,
    transporter?: nodemailer.Transporter,
  ) {
    if (transporter) {
      this.transporter = transporter;
    } else {
      // Default transporter using env vars
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "localhost",
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER || "",
          pass: process.env.SMTP_PASS || "",
        },
      });
    }
  }

  /**
   * Queues an email notification for an errand status change.
   * Generates appropriate subject and body based on the new status.
   */
  async sendErrandStatusChange(
    errandId: string,
    newStatus: ErrandState,
    reason?: string,
  ): Promise<void> {
    if (!this.emailNotificationsEnabled) {
      return;
    }

    // Get errand details
    const errand = this.db
      .prepare("SELECT * FROM errands WHERE id = ?")
      .get(errandId) as
      | {
          id: string;
          user_id: string;
          type: string;
          description: string;
        }
      | undefined;

    if (!errand) {
      this.logger.warn("Cannot send notification: errand not found", {
        errandId,
      });
      return;
    }

    // Get user email
    const user = this.db
      .prepare("SELECT email FROM users WHERE id = ?")
      .get(errand.user_id) as { email: string } | undefined;

    if (!user) {
      this.logger.warn("Cannot send notification: user not found", {
        userId: errand.user_id,
      });
      return;
    }

    const { subject, body } = this.buildEmailContent(
      newStatus,
      errand.type,
      errand.description,
      reason,
    );

    const id = uuidv4();
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    this.db
      .prepare(
        `
      INSERT INTO notification_queue (id, errand_id, recipient_email, subject, body, status, attempts, next_retry_at, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?)
    `,
      )
      .run(id, errandId, user.email, subject, body, now, now);

    this.logger.info("Notification queued", {
      notificationId: id,
      errandId,
      newStatus,
    });
  }

  /**
   * Processes the notification queue.
   * Sends pending notifications, retries up to 3 times with 30s intervals.
   * Returns the number of successfully sent notifications.
   */
  async processQueue(): Promise<number> {
    if (!this.emailNotificationsEnabled) {
      return 0;
    }

    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    // Get pending notifications that are ready for send/retry
    const pending = this.db
      .prepare(
        "SELECT * FROM notification_queue WHERE status = 'pending' AND (next_retry_at IS NULL OR next_retry_at <= ?) ORDER BY created_at ASC",
      )
      .all(now) as Notification[];

    let sentCount = 0;

    for (const notification of pending) {
      try {
        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || "noreply@motofleet.com",
          to: notification.recipient_email,
          subject: notification.subject,
          html: notification.body,
        });

        // Mark as sent
        this.db
          .prepare(
            "UPDATE notification_queue SET status = 'sent', sent_at = ?, attempts = attempts + 1 WHERE id = ?",
          )
          .run(now, notification.id);

        sentCount++;
        this.logger.info("Notification sent", {
          notificationId: notification.id,
        });
      } catch (error) {
        const newAttempts = notification.attempts + 1;

        if (newAttempts >= 3) {
          // Max retries reached, mark as failed
          this.db
            .prepare(
              "UPDATE notification_queue SET status = 'failed', attempts = ? WHERE id = ?",
            )
            .run(newAttempts, notification.id);

          this.logger.error("Notification failed after max retries", {
            notificationId: notification.id,
            attempts: newAttempts,
          });
        } else {
          // Schedule retry in 30 seconds
          const retryAt = new Date(Date.now() + 30000)
            .toISOString()
            .replace("T", " ")
            .substring(0, 19);

          this.db
            .prepare(
              "UPDATE notification_queue SET attempts = ?, next_retry_at = ? WHERE id = ?",
            )
            .run(newAttempts, retryAt, notification.id);

          this.logger.warn("Notification send failed, scheduling retry", {
            notificationId: notification.id,
            attempts: newAttempts,
            nextRetry: retryAt,
          });
        }
      }
    }

    return sentCount;
  }

  /**
   * Builds email subject and body based on the errand state change.
   */
  private buildEmailContent(
    status: ErrandState,
    type: string,
    description: string,
    reason?: string,
  ): { subject: string; body: string } {
    const typeDisplay = type.replace(/_/g, " ");

    switch (status) {
      case "accepted":
        return {
          subject: "Your errand has been accepted",
          body: `<p>A rider has accepted your <strong>${typeDisplay}</strong> errand.</p><p>Description: ${description}</p><p>It will be picked up soon.</p>`,
        };

      case "picked_up":
        return {
          subject: "Your item has been picked up",
          body: `<p>The rider has picked up your <strong>${typeDisplay}</strong> errand.</p><p>It is on its way to the destination.</p>`,
        };

      case "delivered":
        return {
          subject: "Your errand has been completed",
          body: `<p>Your <strong>${typeDisplay}</strong> errand has been delivered successfully.</p><p>Thank you for using MotoFleet.</p>`,
        };

      case "cancelled":
        if (reason) {
          return {
            subject: "Your errand has been cancelled",
            body: `<p>Your <strong>${typeDisplay}</strong> errand has been cancelled.</p><p>Reason: ${reason}</p>`,
          };
        }
        return {
          subject: "Your errand has been cancelled",
          body: `<p>Your <strong>${typeDisplay}</strong> errand has been cancelled.</p>`,
        };

      default:
        return {
          subject: "Your errand status has been updated",
          body: `<p>Your <strong>${typeDisplay}</strong> errand status has changed to: ${status}.</p>`,
        };
    }
  }
}
