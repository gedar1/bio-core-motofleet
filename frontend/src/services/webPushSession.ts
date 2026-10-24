export type WebPushSessionEventType =
  | "SESSION_STARTED"
  | "LOGOUT_CLEANUP_STARTED"
  | "LOGOUT_CLEANUP_FINISHED"
  | "SESSION_INVALIDATED";

export interface WebPushSessionEvent {
  type: WebPushSessionEventType;
  generation: number;
  timestamp: number;
  endpointHash?: string;
}

type Cleanup = (token: string) => Promise<void>;

const CHANNEL_NAME = "motofleet-web-push";
const STORAGE_KEY = "motofleet:webpush:event";
const CLEANUP_WAIT_MS = 5_000;

const endpointHash = async (endpoint: string): Promise<string> => {
  const bytes = new TextEncoder().encode(endpoint);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
};

class WebPushSessionCoordinator {
  private generation = 0;
  private token: string | null = null;
  private readonly cleanups = new Map<string, Cleanup>();
  private readonly cleanupPromises = new Map<string, Promise<void>>();
  private readonly remoteCleanupPromises = new Map<string, Promise<void>>();
  private readonly remoteCleanupResolvers = new Map<string, () => void>();
  private readonly listeners = new Set<(event: WebPushSessionEvent) => void>();
  private readonly channel: BroadcastChannel | null;

  constructor() {
    this.channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel(CHANNEL_NAME)
        : null;
    if (typeof window !== "undefined") {
      window.addEventListener("storage", this.handleStorage);
      if (this.channel)
        this.channel.addEventListener("message", this.handleChannel);
    }
  }

  start(token: string): number {
    if (this.token === token) return this.generation;
    this.generation += 1;
    this.token = token;
    this.publish({
      type: "SESSION_STARTED",
      generation: this.generation,
      timestamp: Date.now(),
    });
    return this.generation;
  }

  beginLogout(previousToken = this.token): void {
    this.invalidate(previousToken ?? null);
  }

  invalidateCurrentSession(): void {
    this.invalidate(this.token);
  }

  private invalidate(previousToken: string | null): void {
    this.generation += 1;
    this.token = null;
    this.publish({
      type: "SESSION_INVALIDATED",
      generation: this.generation,
      timestamp: Date.now(),
    });
    if (!previousToken) return;

    for (const endpoint of this.cleanups.keys()) {
      void this.runCleanup(endpoint, previousToken);
    }
  }

  getGeneration(): number {
    return this.generation;
  }

  isCurrent(generation: number, token: string): boolean {
    return this.generation === generation && this.token === token;
  }

  subscribe(listener: (event: WebPushSessionEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  registerCleanup(endpoint: string, cleanup: Cleanup): () => void {
    this.cleanups.set(endpoint, cleanup);
    return () => {
      if (this.cleanups.get(endpoint) === cleanup)
        this.cleanups.delete(endpoint);
    };
  }

  hasCleanup(endpoint: string): boolean {
    return this.cleanups.has(endpoint);
  }

  cleanup(endpoint: string, token: string): Promise<void> {
    return this.runCleanup(endpoint, token);
  }

  private runCleanup(endpoint: string, token: string): Promise<void> {
    const current = this.cleanupPromises.get(endpoint);
    if (current) return current;
    const cleanup = this.cleanups.get(endpoint);
    if (!cleanup) return Promise.resolve();

    const cleanupPromise = endpointHash(endpoint)
      .then((hash) => {
        this.publish({
          type: "LOGOUT_CLEANUP_STARTED",
          generation: this.generation,
          timestamp: Date.now(),
          endpointHash: hash,
        });
        return cleanup(token).finally(() => {
          if (this.cleanups.get(endpoint) === cleanup) {
            this.cleanups.delete(endpoint);
          }
          this.publish({
            type: "LOGOUT_CLEANUP_FINISHED",
            generation: this.generation,
            timestamp: Date.now(),
            endpointHash: hash,
          });
        });
      })
      .catch(() => undefined);
    this.cleanupPromises.set(endpoint, cleanupPromise);
    void cleanupPromise.finally(() => {
      if (this.cleanupPromises.get(endpoint) === cleanupPromise) {
        this.cleanupPromises.delete(endpoint);
      }
    });
    return cleanupPromise;
  }

  async waitForCleanup(endpoint: string): Promise<boolean> {
    const localPending = this.cleanupPromises.get(endpoint);
    const hash = await endpointHash(endpoint).catch(() => null);
    const remotePending = hash
      ? this.remoteCleanupPromises.get(hash)
      : undefined;
    const pending = [localPending, remotePending].filter(
      (value): value is Promise<void> => value !== undefined,
    );
    if (pending.length === 0) return true;
    await Promise.race([
      Promise.all(pending).then(() => undefined),
      new Promise<void>((resolve) => setTimeout(resolve, CLEANUP_WAIT_MS)),
    ]);
    return (
      !this.cleanupPromises.has(endpoint) &&
      (!hash || !this.remoteCleanupPromises.has(hash))
    );
  }

  private readonly handleChannel = (event: MessageEvent<unknown>): void => {
    this.receive(event.data);
  };

  private readonly handleStorage = (event: StorageEvent): void => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      this.receive(JSON.parse(event.newValue) as unknown);
    } catch {
      // Ignore malformed coordination events from another tab.
    }
  };

  private receive(value: unknown): void {
    if (!value || typeof value !== "object") return;
    const event = value as Partial<WebPushSessionEvent>;
    if (
      typeof event.type !== "string" ||
      typeof event.generation !== "number" ||
      typeof event.timestamp !== "number"
    ) {
      return;
    }
    if (event.type === "LOGOUT_CLEANUP_STARTED" && event.endpointHash) {
      if (!this.remoteCleanupPromises.has(event.endpointHash)) {
        let resolveCleanup!: () => void;
        const promise = new Promise<void>((resolve) => {
          resolveCleanup = resolve;
        });
        this.remoteCleanupResolvers.set(event.endpointHash, resolveCleanup);
        this.remoteCleanupPromises.set(event.endpointHash, promise);
      }
    }
    if (event.type === "LOGOUT_CLEANUP_FINISHED" && event.endpointHash) {
      this.remoteCleanupResolvers.get(event.endpointHash)?.();
      this.remoteCleanupResolvers.delete(event.endpointHash);
      this.remoteCleanupPromises.delete(event.endpointHash);
    }
    if (
      event.type === "SESSION_INVALIDATED" &&
      event.generation >= this.generation
    ) {
      const previousToken = this.token;
      this.generation = event.generation;
      this.token = null;
      if (previousToken) {
        for (const endpoint of this.cleanups.keys()) {
          void this.runCleanup(endpoint, previousToken);
        }
      }
    }
    const normalized = event as WebPushSessionEvent;
    for (const listener of this.listeners) listener(normalized);
  }

  private publish(event: WebPushSessionEvent): void {
    this.channel?.postMessage(event);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(event));
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage is only a fallback for browsers without BroadcastChannel.
    }
    for (const listener of this.listeners) listener(event);
  }
}

export const webPushSession = new WebPushSessionCoordinator();
