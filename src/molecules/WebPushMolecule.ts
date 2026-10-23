import crypto from "node:crypto";
import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import webPush from "web-push";
import { z } from "zod";
import type { ILogger } from "../infrastructure/logger.js";
import {
  PushNotConfiguredError,
  PushSubscriptionOwnedError,
  ValidationError,
} from "../domains/errors.js";
import type {
  InAppNotification,
  NotificationPriority,
  NotificationRecipientRole,
} from "./InAppNotificationMolecule.js";
import type { IMolecule } from "./IMolecule.js";

const TEN_YEARS_MS = 10 * 365 * 24 * 60 * 60 * 1000;
const SEND_TIMEOUT_MS = 10_000;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

export interface WebPushConfig {
  enabled: boolean;
  subject: string;
  publicKey: string;
  privateKey: string;
}

export interface WebPushMoleculeOptions {
  readonly config?: WebPushConfig;
  readonly now?: () => number;
  readonly sendNotification?: typeof webPush.sendNotification;
}

export interface WebPushSubscriptionRequest {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
}

export const pushSubscriptionSchema = z
  .object({
    endpoint: z.string(),
    expirationTime: z.number().nullable().optional(),
    keys: z
      .object({
        p256dh: z.string(),
        auth: z.string(),
      })
      .strict(),
  })
  .strict();

export const pushEndpointSchema = z.object({ endpoint: z.string() }).strict();

type StoredSubscription = {
  id: string;
  owner_id: string;
  owner_role: NotificationRecipientRole;
  endpoint: string;
  p256dh: string;
  auth: string;
  expiration_time_ms: number | null;
  created_at: string;
  updated_at: string;
};

interface PushPayload {
  notificationId: string;
  type: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  role: NotificationRecipientRole;
  resourceType: string | null;
  resourceId: string | null;
  url: string;
}

const environmentConfig = (): WebPushConfig => ({
  enabled: process.env.WEB_PUSH_ENABLED === "true",
  subject: process.env.WEB_PUSH_VAPID_SUBJECT ?? "",
  publicKey: process.env.WEB_PUSH_VAPID_PUBLIC_KEY ?? "",
  privateKey: process.env.WEB_PUSH_VAPID_PRIVATE_KEY ?? "",
});

const decodeBase64Url = (value: string): Buffer | null => {
  if (!value || !BASE64URL.test(value)) return null;
  try {
    return Buffer.from(value, "base64url");
  } catch {
    return null;
  }
};

const isValidSubject = (subject: string): boolean => {
  if (subject.startsWith("mailto:")) {
    return /^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/.test(subject);
  }
  try {
    return new URL(subject).protocol === "https:";
  } catch {
    return false;
  }
};

const validateVapidConfig = (config: WebPushConfig): boolean => {
  if (!config.enabled || !isValidSubject(config.subject)) return false;
  const publicKey = decodeBase64Url(config.publicKey);
  const privateKey = decodeBase64Url(config.privateKey);
  if (publicKey?.length !== 65 || privateKey?.length !== 32) {
    return false;
  }

  try {
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.setPrivateKey(privateKey);
    return ecdh.getPublicKey(undefined, "uncompressed").equals(publicKey);
  } catch {
    return false;
  }
};

const validateEndpoint = (endpoint: string): boolean => {
  if (endpoint.length < 1 || endpoint.length > 2048 || /\s/.test(endpoint)) {
    return false;
  }
  try {
    const parsed = new URL(endpoint);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.length > 0 &&
      parsed.username.length === 0 &&
      parsed.password.length === 0
    );
  } catch {
    return false;
  }
};

const validateKey = (value: string, expectedBytes: number): boolean => {
  const decoded = decodeBase64Url(value);
  return decoded !== null && decoded.length === expectedBytes;
};

export function parsePushSubscriptionInput(
  input: unknown,
  now = Date.now(),
): WebPushSubscriptionRequest {
  const parsed = pushSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(
      "Invalid push subscription",
      parsed.error.flatten().fieldErrors,
    );
  }

  const expirationTime = parsed.data.expirationTime ?? null;
  if (
    !validateEndpoint(parsed.data.endpoint) ||
    !validateKey(parsed.data.keys.p256dh, 65) ||
    !validateKey(parsed.data.keys.auth, 16) ||
    (expirationTime !== null &&
      (!Number.isFinite(expirationTime) ||
        !Number.isInteger(expirationTime) ||
        Object.is(expirationTime, -0) ||
        expirationTime < 0 ||
        expirationTime > now + TEN_YEARS_MS ||
        expirationTime <= now))
  ) {
    throw new ValidationError("Invalid push subscription");
  }

  return { ...parsed.data, expirationTime };
}

export function parsePushEndpoint(input: unknown): string {
  const parsed = pushEndpointSchema.safeParse(input);
  if (!parsed.success || !validateEndpoint(parsed.data.endpoint)) {
    throw new ValidationError("Invalid push endpoint");
  }
  return parsed.data.endpoint;
}

/** Owns Web Push configuration, subscriptions and best-effort delivery. */
export class WebPushMolecule implements IMolecule {
  readonly name = "web-push";
  readonly version = "1.0.0";
  readonly description = "Web Push subscriptions and non-blocking delivery.";

  private readonly now: () => number;
  private readonly sendNotification: typeof webPush.sendNotification;
  private readonly pendingJobs = new Set<Promise<void>>();
  private active: boolean;
  private readonly publicKey: string;
  private closed = false;

  constructor(
    private readonly db: Database.Database,
    private readonly logger: ILogger,
    options: WebPushMoleculeOptions = {},
  ) {
    this.now = options.now ?? Date.now;
    this.sendNotification =
      options.sendNotification ?? webPush.sendNotification;
    const config = options.config ?? environmentConfig();
    this.publicKey = config.publicKey;
    this.active = validateVapidConfig(config);
    if (this.active) {
      try {
        webPush.setVapidDetails(
          config.subject,
          config.publicKey,
          config.privateKey,
        );
      } catch {
        this.logger.error(
          "Web Push VAPID configuration could not be initialized",
        );
        this.active = false;
      }
    } else if (config.enabled) {
      this.logger.error(
        "Web Push configuration is invalid; capability disabled",
      );
    }
  }

  isEnabled(): boolean {
    return this.active && !this.closed;
  }

  assertEnabled(): void {
    if (!this.isEnabled()) throw new PushNotConfiguredError();
  }

  getPublicKey(): string {
    if (!this.isEnabled()) throw new PushNotConfiguredError();
    return this.publicKey;
  }

  upsertSubscription(
    ownerId: string,
    ownerRole: NotificationRecipientRole,
    input: WebPushSubscriptionRequest,
  ): void {
    if (!this.isEnabled()) throw new PushNotConfiguredError();
    const timestamp = new Date(this.now()).toISOString();
    const transaction = this.db.transaction(() => {
      const existing = this.db
        .prepare("SELECT * FROM web_push_subscriptions WHERE endpoint = ?")
        .get(input.endpoint) as StoredSubscription | undefined;
      if (existing) {
        if (
          existing.owner_id !== ownerId ||
          existing.owner_role !== ownerRole
        ) {
          throw new PushSubscriptionOwnedError();
        }
        this.db
          .prepare(
            `UPDATE web_push_subscriptions
             SET p256dh = ?, auth = ?, expiration_time_ms = ?, updated_at = ?
             WHERE endpoint = ? AND owner_id = ? AND owner_role = ?`,
          )
          .run(
            input.keys.p256dh,
            input.keys.auth,
            input.expirationTime,
            timestamp,
            input.endpoint,
            ownerId,
            ownerRole,
          );
        return;
      }

      try {
        this.db
          .prepare(
            `INSERT INTO web_push_subscriptions
             (id, owner_id, owner_role, endpoint, p256dh, auth, expiration_time_ms, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            uuidv4(),
            ownerId,
            ownerRole,
            input.endpoint,
            input.keys.p256dh,
            input.keys.auth,
            input.expirationTime,
            timestamp,
            timestamp,
          );
      } catch (error) {
        if (error instanceof Error && error.message.includes("UNIQUE")) {
          throw new PushSubscriptionOwnedError();
        }
        throw error;
      }
    });
    transaction();
  }

  deleteSubscription(
    ownerId: string,
    ownerRole: NotificationRecipientRole,
    endpoint: string,
  ): void {
    if (!this.isEnabled()) throw new PushNotConfiguredError();
    this.db
      .prepare(
        `DELETE FROM web_push_subscriptions
         WHERE endpoint = ? AND owner_id = ? AND owner_role = ?`,
      )
      .run(endpoint, ownerId, ownerRole);
  }

  dispatch(notification: InAppNotification): void {
    if (!this.isEnabled() || this.closed) return;
    try {
      const job = Promise.resolve()
        .then(() => this.dispatchAsync(notification))
        .catch((error: unknown) => {
          this.logger.error("Web Push dispatch failed", {
            notificationId: notification.id,
            error: error instanceof Error ? error.message : "unknown",
          });
        });
      this.pendingJobs.add(job);
      void job.finally(() => this.pendingJobs.delete(job));
    } catch (error) {
      this.logger.error("Web Push dispatch could not be scheduled", {
        notificationId: notification.id,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  async waitForPendingJobs(deadline: number): Promise<void> {
    await this.drainPendingJobs(deadline);
    if (this.pendingJobs.size > 0) {
      this.logger.warn("Web Push jobs abandoned during shutdown", {
        jobs: this.pendingJobs.size,
      });
    }
  }

  // Recursion instead of a loop: each round waits on the current snapshot of
  // pending jobs, then re-checks in case new jobs were scheduled meanwhile.
  private async drainPendingJobs(deadline: number): Promise<void> {
    if (this.pendingJobs.size === 0 || this.closed) return;
    const remaining = Math.max(0, deadline - this.now());
    if (remaining === 0) {
      this.closed = true;
      return;
    }
    const pending = [...this.pendingJobs];
    await Promise.race([
      Promise.allSettled(pending).then(() => undefined),
      new Promise<void>((resolve) =>
        setTimeout(() => {
          this.closed = true;
          resolve();
        }, remaining),
      ),
    ]);
    return this.drainPendingJobs(deadline);
  }

  close(): void {
    this.closed = true;
  }

  private async dispatchAsync(notification: InAppNotification): Promise<void> {
    if (this.closed) return;
    const payload = this.toPayload(notification);
    if (!payload) return;

    const subscriptions = this.db
      .prepare(
        `SELECT * FROM web_push_subscriptions
         WHERE owner_id = ? AND owner_role = ?`,
      )
      .all(
        notification.recipient_id,
        notification.recipient_role,
      ) as StoredSubscription[];
    if (this.closed) return;

    const expired = subscriptions.filter(
      (subscription) =>
        subscription.expiration_time_ms !== null &&
        subscription.expiration_time_ms <= this.now(),
    );
    if (expired.length > 0 && !this.closed) {
      const deleteExpired = this.db.prepare(
        "DELETE FROM web_push_subscriptions WHERE id = ? AND owner_id = ? AND owner_role = ?",
      );
      const transaction = this.db.transaction(() => {
        for (const subscription of expired) {
          if (this.closed) return;
          deleteExpired.run(
            subscription.id,
            notification.recipient_id,
            notification.recipient_role,
          );
        }
      });
      transaction();
    }

    const validSubscriptions = subscriptions.filter(
      (subscription) => !expired.some((item) => item.id === subscription.id),
    );
    await Promise.allSettled(
      validSubscriptions.map((subscription) =>
        this.sendToSubscription(subscription, payload),
      ),
    );
  }

  private async sendToSubscription(
    subscription: StoredSubscription,
    payload: PushPayload,
  ): Promise<void> {
    let urgency: "high" | "low" | "normal";
    if (payload.priority === "critical" || payload.priority === "high") {
      urgency = "high";
    } else if (payload.priority === "low") {
      urgency = "low";
    } else {
      urgency = "normal";
    }

    try {
      const result = await Promise.race([
        this.sendNotification(
          {
            endpoint: subscription.endpoint,
            expirationTime: subscription.expiration_time_ms,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload),
          {
            timeout: SEND_TIMEOUT_MS,
            urgency,
          },
        ),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Web Push provider timeout")),
            SEND_TIMEOUT_MS,
          ),
        ),
      ]);
      if (result.statusCode >= 200 && result.statusCode < 300) return;
      this.logger.warn("Web Push provider returned an unexpected status", {
        notificationId: payload.notificationId,
        status: result.statusCode,
      });
    } catch (error: unknown) {
      const status =
        typeof error === "object" && error !== null && "statusCode" in error
          ? Number((error as { statusCode?: unknown }).statusCode)
          : undefined;
      if ((status === 404 || status === 410) && !this.closed) {
        this.db
          .prepare(
            "DELETE FROM web_push_subscriptions WHERE id = ? AND endpoint = ?",
          )
          .run(subscription.id, subscription.endpoint);
        return;
      }
      this.logger.warn("Web Push provider delivery failed", {
        notificationId: payload.notificationId,
        status: status ?? "network",
      });
    }
  }

  private toPayload(notification: InAppNotification): PushPayload | null {
    if (
      notification.id.length < 1 ||
      notification.id.length > 100 ||
      notification.type.length < 1 ||
      notification.type.length > 80 ||
      notification.title.length < 1 ||
      notification.title.length > 120 ||
      notification.message.length < 1 ||
      notification.message.length > 240
    ) {
      this.logger.warn("Web Push notification payload was rejected", {
        notificationId: notification.id,
        type: notification.type,
        role: notification.recipient_role,
      });
      return null;
    }

    let url: string;
    if (notification.recipient_role === "admin") {
      url = "/admin?tab=errands";
    } else if (notification.recipient_role === "user") {
      url = "/user/errands";
    } else if (notification.type === "errand.created") {
      url = "/rider/available";
    } else {
      url = "/rider/errands";
    }

    return {
      notificationId: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.message,
      priority: notification.priority,
      role: notification.recipient_role,
      resourceType: notification.resource_type,
      resourceId: notification.resource_id,
      url,
    };
  }
}
