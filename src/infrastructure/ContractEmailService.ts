import type Database from "better-sqlite3";
import nodemailer from "nodemailer";

import type {
  ContractEmailQueueInput,
  ContractEmailService as ContractEmailServiceContract,
} from "../molecules/ContractSignatureMolecule.js";
import {
  CONTRACT_EMAIL_EVENT_TYPES,
  type ContractEmailEventType,
} from "../domains/contractSignature.js";
import type { TokenService } from "./TokenService.js";
import type { ILogger } from "./logger.js";

/**
 * A deliberately generic error for every failure that can occur while
 * validating, decrypting, rendering, or delivering a contract email. It does
 * not retain a cause because causes can contain a token, payload, or SMTP
 * credential when an external library fails.
 */
export class ContractEmailProcessingError extends Error {
  readonly code = "CONTRACT_EMAIL_UNAVAILABLE" as const;

  constructor() {
    super("Contract email could not be processed safely.");
    this.name = "ContractEmailProcessingError";
  }
}

export interface ContractEmailServiceOptions {
  /** Environment source is injectable to keep SMTP tests deterministic. */
  readonly env?: NodeJS.ProcessEnv;
  readonly transporter?: nodemailer.Transporter;
  readonly emailNotificationsEnabled?: boolean;
  /** Relative or http(s) base used when an admin link is not in the payload. */
  readonly adminReviewBaseUrl?: string;
}

export interface ContractEmailQueueRow extends ContractEmailQueueInput {
  status: "pending" | "processing" | "sent" | "failed";
  attempts: number;
  nextRetryAt?: string | null;
}

export interface RenderedContractEmail {
  readonly to: string;
  readonly from: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

export interface ContractEmailSendResult {
  readonly sent: boolean;
  readonly skipped: boolean;
}

type ContractEmailPayload = Readonly<Record<string, unknown>>;

const SUBJECTS: Readonly<Record<ContractEmailEventType, string>> = {
  contract_sent: "Your MotoFleet contract is ready to sign",
  contract_resent: "Your MotoFleet contract link was resent",
  signed_document_available: "A signed MotoFleet contract is ready for review",
  contract_approved: "Your MotoFleet contract was approved",
  contract_rejected: "Correction required for your MotoFleet contract",
  link_expired: "A MotoFleet contract link has expired",
};

const DEFAULT_FROM = "noreply@motofleet.com";
const SAFE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_IDENTIFIER_PATTERN = /^[^\u0000-\u001f\u007f]+$/;
const NOOP_LOGGER: ILogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
  child: () => NOOP_LOGGER,
};

/**
 * Durable contract-email outbox adapter and in-memory renderer.
 *
 * `queueContractEmail` is intentionally synchronous and performs no SMTP
 * operation. When called from ContractSignatureMolecule it therefore inserts
 * into the caller's better-sqlite3 transaction. The future worker can read a
 * row and call `renderQueuedEmail`/`sendQueuedEmail` after the transaction has
 * completed.
 */
export class ContractEmailService implements ContractEmailServiceContract {
  private readonly transporter: nodemailer.Transporter;
  private readonly env: NodeJS.ProcessEnv;
  private readonly emailNotificationsEnabled: boolean;
  private readonly adminReviewBaseUrl: string;
  private readonly smtpFrom: string;

  constructor(
    private readonly db: Database.Database,
    private readonly tokenService: Pick<TokenService, "decryptOutboxPayload">,
    private readonly logger: ILogger = NOOP_LOGGER,
    options: ContractEmailServiceOptions = {},
  ) {
    this.env = options.env ?? process.env;
    this.emailNotificationsEnabled =
      options.emailNotificationsEnabled ??
      this.env.EMAIL_NOTIFICATIONS_ENABLED === "true";
    this.adminReviewBaseUrl = normalizeBaseUrl(
      options.adminReviewBaseUrl ??
        this.env.CONTRACT_ADMIN_REVIEW_BASE_URL ??
        "/api/contract-signatures",
    );
    this.smtpFrom = normalizeHeader(this.env.SMTP_FROM?.trim() || DEFAULT_FROM);

    this.transporter =
      options.transporter ??
      nodemailer.createTransport({
        host: this.env.SMTP_HOST?.trim() || "localhost",
        port: parsePort(this.env.SMTP_PORT),
        secure: this.env.SMTP_SECURE === "true",
        auth: {
          user: this.env.SMTP_USER || "",
          pass: this.env.SMTP_PASS || "",
        },
      });
  }

  /**
   * Inserts an encrypted contract-email row. No transporter method is called
   * here, so domain state and the outbox remain atomic in one transaction.
   */
  queueContractEmail(input: ContractEmailQueueInput): void {
    const normalized = this.normalizeQueueInput(input);

    this.db
      .prepare(
        `INSERT INTO contract_email_queue
           (id, case_id, delivery_attempt_id, event_type, recipient_email,
            subject, template_key, payload_ciphertext, status, attempts, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)`,
      )
      .run(
        normalized.id,
        normalized.caseId,
        normalized.deliveryAttemptId,
        normalized.eventType,
        normalized.recipientEmail,
        normalized.subject,
        normalized.templateKey,
        normalized.payloadCiphertext,
        normalized.createdAt,
        normalized.createdAt,
      );
  }

  /** Returns the canonical subject for an event, never a caller-controlled header. */
  subjectFor(eventType: ContractEmailEventType): string {
    if (!isContractEmailEventType(eventType)) {
      throw new ContractEmailProcessingError();
    }
    return SUBJECTS[eventType];
  }

  /**
   * Decrypts and renders a queued row in memory. The returned HTML is never
   * persisted by this service; all dynamic values pass through escaping and
   * URL/header validation before being returned.
   */
  renderQueuedEmail(
    input: ContractEmailQueueInput | ContractEmailQueueRow,
  ): RenderedContractEmail {
    const normalized = this.normalizeQueueInput(input);
    const payload = this.decryptPayload(
      normalized.payloadCiphertext,
      normalized.eventType,
    );
    const rendered = this.renderTemplate(normalized.eventType, payload);

    return {
      to: normalized.recipientEmail,
      from: this.smtpFrom,
      subject: normalized.subject,
      html: rendered.html,
      text: rendered.text,
    };
  }

  /**
   * Public renderer useful to the future worker and unit tests. Payloads must
   * already have been authenticated by `decryptOutboxPayload` when called by
   * `renderQueuedEmail`.
   */
  renderTemplate(
    eventType: ContractEmailEventType,
    payload: unknown,
  ): {
    readonly subject: string;
    readonly html: string;
    readonly text: string;
  } {
    if (!isContractEmailEventType(eventType)) {
      throw new ContractEmailProcessingError();
    }
    const safePayload = asPayload(payload);
    const content = this.buildTemplate(eventType, safePayload);
    const subject = SUBJECTS[eventType];
    const html = `<!doctype html><html lang="en"><body>${content.html}</body></html>`;
    return { subject, html, text: content.text };
  }

  /**
   * Sends one already-queued message outside the domain transaction. The flag
   * only controls real SMTP delivery; queue insertion and encryption remain
   * mandatory even when notifications are disabled.
   */
  async sendQueuedEmail(
    input: ContractEmailQueueInput | ContractEmailQueueRow,
  ): Promise<ContractEmailSendResult> {
    if (!this.emailNotificationsEnabled) {
      return { sent: false, skipped: true };
    }

    const normalized = this.normalizeQueueInput(input);
    const rendered = this.renderQueuedEmail(normalized);
    if (!this.env.SMTP_HOST?.trim() || !this.env.SMTP_FROM?.trim()) {
      throw new ContractEmailProcessingError();
    }

    try {
      await this.transporter.sendMail({
        from: rendered.from,
        to: rendered.to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
    } catch {
      // IDs and event type are safe operational context; do not log the
      // recipient, error object, payload, URL, token, or SMTP configuration.
      this.logger.warn("Contract email delivery failed", {
        queueId: normalized.id,
        eventType: normalized.eventType,
      });
      throw new ContractEmailProcessingError();
    }

    return { sent: true, skipped: false };
  }

  isEmailNotificationsEnabled(): boolean {
    return this.emailNotificationsEnabled;
  }

  private normalizeQueueInput(
    input: ContractEmailQueueInput | ContractEmailQueueRow,
  ): ContractEmailQueueInput {
    if (!input || typeof input !== "object") {
      throw new ContractEmailProcessingError();
    }

    const eventType = input.eventType;
    if (!isContractEmailEventType(eventType)) {
      throw new ContractEmailProcessingError();
    }

    const id = normalizeIdentifier(input.id);
    const caseId = normalizeIdentifier(input.caseId);
    const deliveryAttemptId =
      input.deliveryAttemptId == null
        ? null
        : normalizeIdentifier(input.deliveryAttemptId);
    const recipientEmail = normalizeRecipient(input.recipientEmail);
    const payloadCiphertext = normalizeCiphertext(input.payloadCiphertext);
    const createdAt = normalizeHeader(input.createdAt);

    // The service is the last boundary before durable persistence. Validate
    // the authenticated envelope now so missing encryption never degrades to
    // JSON/plaintext persistence, even when SMTP delivery is disabled.
    this.decryptPayload(payloadCiphertext, eventType);

    return {
      id,
      caseId,
      deliveryAttemptId,
      eventType,
      recipientEmail,
      subject: SUBJECTS[eventType],
      templateKey: eventType,
      payloadCiphertext,
      createdAt,
    };
  }

  private decryptPayload(
    payloadCiphertext: string,
    eventType: ContractEmailEventType,
  ): ContractEmailPayload {
    try {
      const payload =
        this.tokenService.decryptOutboxPayload<unknown>(payloadCiphertext);
      const safePayload = asPayload(payload);
      const payloadEventType = safePayload.eventType;
      if (payloadEventType !== undefined && payloadEventType !== eventType) {
        throw new Error("Event mismatch");
      }
      return safePayload;
    } catch {
      throw new ContractEmailProcessingError();
    }
  }

  private buildTemplate(
    eventType: ContractEmailEventType,
    payload: ContractEmailPayload,
  ): { readonly html: string; readonly text: string } {
    switch (eventType) {
      case "contract_sent":
      case "contract_resent":
        return this.buildDeliveryTemplate(eventType, payload);
      case "signed_document_available":
        return this.buildSignedAvailableTemplate(payload);
      case "contract_approved":
        return this.buildApprovedTemplate(payload);
      case "contract_rejected":
        return this.buildRejectedTemplate(payload);
      case "link_expired":
        return this.buildExpiredTemplate(payload);
    }
  }

  private buildDeliveryTemplate(
    eventType: "contract_sent" | "contract_resent",
    payload: ContractEmailPayload,
  ): { readonly html: string; readonly text: string } {
    const contractId = requiredText(payload, ["contractId", "contract_id"]);
    const link = safeLink(requiredText(payload, ["link", "accessLink"]));
    const expiresAt = requiredText(payload, ["expiresAt", "expires_at"]);
    const resendNotice =
      eventType === "contract_resent"
        ? "The previous access link is no longer available."
        : "";
    const htmlNotice = resendNotice ? `<p>${escapeHtml(resendNotice)}</p>` : "";
    const textNotice = resendNotice ? `${resendNotice}\n` : "";

    return {
      html: `${htmlNotice}<p>Your MotoFleet rental contract <strong>${escapeHtml(contractId)}</strong> is ready for you.</p><p><a href="${escapeHtml(link)}">Open the contract access link</a></p><p>This link expires on <strong>${escapeHtml(expiresAt)}</strong>.</p><p>Instructions:</p><ol><li>Download the original PDF.</li><li>Sign the PDF externally.</li><li>Upload the signed PDF using the same access link.</li></ol>`,
      text: `${textNotice}Your MotoFleet rental contract ${plainText(contractId)} is ready for you.\nAccess link: ${plainText(link)}\nThis link expires on ${plainText(expiresAt)}.\nInstructions:\n1. Download the original PDF.\n2. Sign the PDF externally.\n3. Upload the signed PDF using the same access link.`,
    };
  }

  private buildSignedAvailableTemplate(payload: ContractEmailPayload): {
    readonly html: string;
    readonly text: string;
  } {
    const rider = requiredText(payload, ["riderName", "riderId", "rider_id"]);
    const contractId = requiredText(payload, ["contractId", "contract_id"]);
    const caseId = requiredText(payload, ["caseId", "case_id"]);
    const adminLink = safeLink(
      optionalText(payload, ["adminLink", "reviewLink"]) ??
        `${this.adminReviewBaseUrl}/${encodeURIComponent(caseId)}/review`,
    );

    return {
      html: `<p>A signed document from Rider <strong>${escapeHtml(rider)}</strong> is available for review.</p><p>Contract: <strong>${escapeHtml(contractId)}</strong></p><p><a href="${escapeHtml(adminLink)}">Open the administrative review</a></p>`,
      text: `A signed document from Rider ${plainText(rider)} is available for review.\nContract: ${plainText(contractId)}\nAdministrative review: ${plainText(adminLink)}`,
    };
  }

  private buildApprovedTemplate(payload: ContractEmailPayload): {
    readonly html: string;
    readonly text: string;
  } {
    const contractId = requiredText(payload, ["contractId", "contract_id"]);
    const documentStatus = requiredText(payload, [
      "documentStatus",
      "document_status",
    ]);
    const formalizationStatus = requiredText(payload, [
      "formalizationStatus",
      "formalization_status",
    ]);
    const formalizedAt = requiredText(payload, [
      "formalizedAt",
      "formalized_at",
    ]);

    return {
      html: `<p>Your contract <strong>${escapeHtml(contractId)}</strong> has been approved.</p><p>Document status: <strong>${escapeHtml(documentStatus)}</strong></p><p>Formalization status: <strong>${escapeHtml(formalizationStatus)}</strong></p><p>Formalized at: ${escapeHtml(formalizedAt)}</p>`,
      text: `Your contract ${plainText(contractId)} has been approved.\nDocument status: ${plainText(documentStatus)}\nFormalization status: ${plainText(formalizationStatus)}\nFormalized at: ${plainText(formalizedAt)}`,
    };
  }

  private buildRejectedTemplate(payload: ContractEmailPayload): {
    readonly html: string;
    readonly text: string;
  } {
    const contractId = requiredText(payload, ["contractId", "contract_id"]);
    const documentStatus = requiredText(payload, [
      "documentStatus",
      "document_status",
    ]);
    const formalizationStatus = requiredText(payload, [
      "formalizationStatus",
      "formalization_status",
    ]);
    const reason = requiredText(payload, ["reason", "rejectionReason"]);
    const correctiveAction =
      optionalText(payload, ["correctiveAction", "corrective_action"]) ??
      "Upload a corrected signed PDF using a new delivery link.";

    return {
      html: `<p>Your contract <strong>${escapeHtml(contractId)}</strong> requires correction.</p><p>Document status: <strong>${escapeHtml(documentStatus)}</strong></p><p>Formalization status: <strong>${escapeHtml(formalizationStatus)}</strong></p><p>Reason: ${escapeHtml(reason)}</p><p>Action required: ${escapeHtml(correctiveAction)}</p>`,
      text: `Your contract ${plainText(contractId)} requires correction.\nDocument status: ${plainText(documentStatus)}\nFormalization status: ${plainText(formalizationStatus)}\nReason: ${plainText(reason)}\nAction required: ${plainText(correctiveAction)}`,
    };
  }

  private buildExpiredTemplate(payload: ContractEmailPayload): {
    readonly html: string;
    readonly text: string;
  } {
    const caseId = requiredText(payload, ["caseId", "case_id"]);
    const contractId =
      optionalText(payload, ["contractId", "contract_id"]) ?? caseId;
    const expiresAt = requiredText(payload, ["expiresAt", "expires_at"]);
    const expiredLink = optionalText(payload, ["link", "expiredLink"]);
    const safeExpiredLink = expiredLink ? safeLink(expiredLink) : null;
    const linkHtml = safeExpiredLink
      ? `<p>Expired link: <code>${escapeHtml(safeExpiredLink)}</code></p>`
      : `<p>The access link associated with this case is no longer available.</p>`;
    const linkText = safeExpiredLink
      ? `Expired link: ${plainText(safeExpiredLink)}\n`
      : "The access link associated with this case is no longer available.\n";

    return {
      html: `<p>Contract case <strong>${escapeHtml(caseId)}</strong> for contract <strong>${escapeHtml(contractId)}</strong> has an expired access link.</p>${linkHtml}<p>Expiration date: ${escapeHtml(expiresAt)}</p><p>Action required: start a new delivery or resend the contract from the administrative panel.</p>`,
      text: `Contract case ${plainText(caseId)} for contract ${plainText(contractId)} has an expired access link.\n${linkText}Expiration date: ${plainText(expiresAt)}\nAction required: start a new delivery or resend the contract from the administrative panel.`,
    };
  }
}

function isContractEmailEventType(
  value: unknown,
): value is ContractEmailEventType {
  return (
    typeof value === "string" &&
    (CONTRACT_EMAIL_EVENT_TYPES as readonly string[]).includes(value)
  );
}

function asPayload(value: unknown): ContractEmailPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractEmailProcessingError();
  }
  return value as ContractEmailPayload;
}

function requiredText(
  payload: ContractEmailPayload,
  keys: readonly string[],
): string {
  const value = optionalText(payload, keys);
  if (value === undefined) {
    throw new ContractEmailProcessingError();
  }
  return value;
}

function optionalText(
  payload: ContractEmailPayload,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      return normalizeDynamicText(value);
    }
  }
  return undefined;
}

function normalizeDynamicText(value: string): string {
  const normalized = value.trim();
  if (
    !normalized ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(normalized)
  ) {
    throw new ContractEmailProcessingError();
  }
  return normalized;
}

function normalizeIdentifier(value: unknown): string {
  if (typeof value !== "string") {
    throw new ContractEmailProcessingError();
  }
  const normalized = value.trim();
  if (!normalized || !SAFE_IDENTIFIER_PATTERN.test(normalized)) {
    throw new ContractEmailProcessingError();
  }
  return normalized;
}

function normalizeCiphertext(value: unknown): string {
  if (typeof value !== "string") {
    throw new ContractEmailProcessingError();
  }
  const normalized = value.trim();
  const parts = normalized.split(".");
  if (
    !normalized ||
    normalized.length > 256 * 1024 ||
    parts.length !== 4 ||
    parts.some((part) => !part || !/^[A-Za-z0-9_-]+$/u.test(part))
  ) {
    throw new ContractEmailProcessingError();
  }
  return normalized;
}

function normalizeRecipient(value: unknown): string {
  if (typeof value !== "string") {
    throw new ContractEmailProcessingError();
  }
  const normalized = value.trim();
  if (
    !normalized ||
    normalized.length > 320 ||
    normalized.includes("\r") ||
    normalized.includes("\n") ||
    !SAFE_EMAIL_PATTERN.test(normalized)
  ) {
    throw new ContractEmailProcessingError();
  }
  return normalized;
}

function normalizeHeader(value: string): string {
  const normalized = value.trim();
  if (
    !normalized ||
    normalized.length > 998 ||
    normalized.includes("\r") ||
    normalized.includes("\n")
  ) {
    throw new ContractEmailProcessingError();
  }
  return normalized;
}

function normalizeBaseUrl(value: string): string {
  const normalized = normalizeHeader(value).replace(/\/+$/u, "");
  if (normalized.startsWith("/")) {
    if (normalized.startsWith("//")) {
      throw new ContractEmailProcessingError();
    }
    return normalized;
  }
  return safeLink(normalized);
}

function safeLink(value: string): string {
  const normalized = normalizeDynamicText(value);
  if (normalized.startsWith("/")) {
    if (normalized.startsWith("//")) {
      throw new ContractEmailProcessingError();
    }
    return normalized;
  }
  try {
    const url = new URL(normalized);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Unsupported URL scheme");
    }
    return normalized;
  } catch {
    throw new ContractEmailProcessingError();
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

function plainText(value: string): string {
  return value.replace(/[\r\n\t]+/gu, " ");
}

function parsePort(value: string | undefined): number {
  if (!value?.trim()) return 587;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new ContractEmailProcessingError();
  }
  return parsed;
}
