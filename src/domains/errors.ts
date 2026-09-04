/**
 * Domain error hierarchy.
 *
 * Business logic (molecules) throws these errors to signal domain-level failures.
 * The HTTP middleware catches them and maps each subclass to the appropriate
 * status code and response shape. This keeps the dependency arrow pointing
 * downward: domain → nothing; transport → domain.
 */

export abstract class DomainError extends Error {
  /** Machine-readable error code for clients (e.g. "NOT_FOUND"). */
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// ─── Concrete domain errors ────────────────────────────────────────────────

export class NotFoundError extends DomainError {
  readonly code = "NOT_FOUND";

  constructor(entity: string, id?: string) {
    super(id ? `${entity} not found: ${id}` : `${entity} not found`);
  }
}

export class ValidationError extends DomainError {
  /** Subclasses may expose a more specific validation code while retaining HTTP 400. */
  readonly code: string = "VALIDATION_ERROR";
  readonly details?: Record<string, string[]>;

  constructor(message: string, details?: Record<string, string[]>) {
    super(message);
    this.details = details;
  }
}

export class BusinessRuleViolation extends DomainError {
  readonly code = "BUSINESS_RULE_VIOLATION";
}

export class InvalidStateTransition extends DomainError {
  readonly code = "INVALID_STATE_TRANSITION";

  constructor(
    entity: string,
    currentState: string,
    targetState: string,
    allowedTransitions?: string,
  ) {
    const base = `Cannot transition ${entity} from "${currentState}" to "${targetState}"`;
    super(allowedTransitions ? `${base}. ${allowedTransitions}` : base);
  }
}

export class ForbiddenError extends DomainError {
  readonly code = "FORBIDDEN";
}

export class UnauthorizedError extends DomainError {
  readonly code = "UNAUTHORIZED";
}

export class ConflictError extends DomainError {
  /** Subclasses may expose a more specific conflict code while retaining HTTP 409. */
  readonly code: string = "CONFLICT";
}
