// eslint-disable-next-line @typescript-eslint/no-require-imports
import pino from "pino";

type PinoLogger = pino.Logger;
type PinoStream = {
  write?: (data: string) => boolean | void;
  flush?: (callback?: (error?: Error) => void) => void;
  flushSync?: () => void;
  end?: () => void;
  once?: (event: string, listener: (...args: unknown[]) => void) => void;
  closed?: boolean;
  destroyed?: boolean;
};
type PinoFactory = {
  (options: object, stream?: PinoStream): PinoLogger;
  transport(options: object): PinoStream;
  destination(options: object): PinoStream;
};

/**
 * Logger interface decoupled from implementation.
 * Allows injecting mocks in tests without side-effects.
 */
export interface ILogger {
  info(msg: string, context?: Record<string, unknown>): void;
  warn(msg: string, context?: Record<string, unknown>): void;
  error(msg: string, context?: Record<string, unknown>): void;
  debug(msg: string, context?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): ILogger;
}

interface LoggerCore {
  readonly logger: PinoLogger;
  readonly ownedTransport?: PinoStream;
  closed: boolean;
}

const pinoFn =
  (pino as unknown as { default?: PinoFactory }).default ??
  (pino as unknown as PinoFactory);

function loggerLevel(): string {
  const isDev = process.env.NODE_ENV !== "production";
  return process.env.LOG_LEVEL || (isDev ? "debug" : "info");
}

function createLoggerCore(): LoggerCore {
  const isTest = process.env.NODE_ENV === "test";
  const isDev = process.env.NODE_ENV !== "production" && !isTest;

  if (isDev) {
    // Development keeps the readable pino-pretty transport. Test runs use a
    // plain Pino logger below instead: even sync mode still creates
    // thread-stream bookkeeping that can leave a setImmediate pending while
    // Vitest fake timers are being torn down.
    const transport = pinoFn.transport({
      target: "pino-pretty",
      options: { colorize: true },
    });
    return {
      logger: pinoFn({ level: loggerLevel() }, transport),
      ownedTransport: transport,
      closed: false,
    };
  }

  // Production and test logging go directly to stdout. The process stdout
  // stream is not owned by the application and must never be ended during
  // application shutdown; avoiding a transport in test also avoids the
  // pino/thread-stream setImmediate that conflicts with fake timers.
  return { logger: pinoFn({ level: loggerLevel() }), closed: false };
}

function createPostShutdownLogger(): PinoLogger {
  // This destination is deliberately synchronous and not owned by the
  // application. It keeps late process-level diagnostics visible after the
  // application transport has been closed without creating another worker.
  return pinoFn(
    { level: loggerLevel() },
    pinoFn.destination({ dest: process.stdout.fd, sync: true }),
  );
}

/**
 * Owns the process-level Pino transport. All module loggers share one root,
 * so shutdown cannot close one dependency's transport while another
 * dependency is still writing. The root is replaced on the next application
 * startup, which also supports repeated application creation in tests.
 */
class LoggerRegistry {
  private activeCore: LoggerCore | undefined;
  private postShutdownLogger: PinoLogger | undefined;
  private acceptingLogs = true;

  start(): void {
    this.acceptingLogs = true;
    if (!this.activeCore) {
      this.activeCore = createLoggerCore();
    }
  }

  currentLogger(): PinoLogger {
    if (this.acceptingLogs) {
      if (!this.activeCore) {
        this.activeCore = createLoggerCore();
      }
      return this.activeCore.logger;
    }

    this.postShutdownLogger ??= createPostShutdownLogger();
    return this.postShutdownLogger;
  }

  dispose(): Promise<void> {
    this.acceptingLogs = false;
    const core = this.activeCore;
    this.activeCore = undefined;

    if (!core || core.closed || !core.ownedTransport) {
      return Promise.resolve();
    }

    core.closed = true;
    return flushAndCloseTransport(core.ownedTransport);
  }
}

const loggerRegistry = new LoggerRegistry();

/** Reopens the shared logging lifecycle for a newly constructed application. */
export function startLoggerLifecycle(): void {
  loggerRegistry.start();
}

/** Flushes and closes all transports owned by the application. */
export function shutdownLoggerLifecycle(): Promise<void> {
  return loggerRegistry.dispose();
}

function flushAndCloseTransport(transport: PinoStream): Promise<void> {
  if (transport.closed || transport.destroyed) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: unknown): void => {
      if (settled) return;
      settled = true;
      if (error instanceof Error) reject(error);
      else if (error) reject(new Error("Pino transport failed to close"));
      else resolve();
    };

    transport.once?.("close", () => finish());
    transport.once?.("error", (error) => finish(error));

    const end = (): void => {
      try {
        transport.end?.();
        if (transport.closed || !transport.once) finish();
      } catch (error) {
        finish(error);
      }
    };

    try {
      if (transport.flushSync) {
        try {
          transport.flushSync();
          end();
        } catch {
          // An asynchronous thread-stream flush may already be scheduled.
          // Wait for it instead of dropping the buffered log records.
          if (transport.flush) {
            transport.flush((error) => {
              if (error) finish(error);
              else end();
            });
          } else {
            end();
          }
        }
      } else if (transport.flush) {
        transport.flush((error) => {
          if (error) finish(error);
          else end();
        });
      } else {
        end();
      }
    } catch (error) {
      finish(error);
    }
  });
}

/**
 * Adapter wrapping Pino to satisfy ILogger. A provider is used for loggers
 * created by the application so module-level loggers automatically bind to a
 * fresh root after a previous application has shut down.
 */
export class PinoLoggerAdapter implements ILogger {
  private readonly rootProvider: () => PinoLogger;
  private readonly bindings: Record<string, unknown> | undefined;
  private cachedRoot: PinoLogger | undefined;
  private cachedLogger: PinoLogger | undefined;

  constructor(
    pinoInstanceOrProvider: PinoLogger | (() => PinoLogger),
    bindings?: Record<string, unknown>,
  ) {
    this.rootProvider =
      typeof pinoInstanceOrProvider === "function"
        ? pinoInstanceOrProvider
        : () => pinoInstanceOrProvider;
    this.bindings = bindings;
  }

  info(msg: string, context?: Record<string, unknown>): void {
    const logger = this.resolve();
    if (context) logger.info(context, msg);
    else logger.info(msg);
  }

  warn(msg: string, context?: Record<string, unknown>): void {
    const logger = this.resolve();
    if (context) logger.warn(context, msg);
    else logger.warn(msg);
  }

  error(msg: string, context?: Record<string, unknown>): void {
    const logger = this.resolve();
    if (context) logger.error(context, msg);
    else logger.error(msg);
  }

  debug(msg: string, context?: Record<string, unknown>): void {
    const logger = this.resolve();
    if (context) logger.debug(context, msg);
    else logger.debug(msg);
  }

  child(bindings: Record<string, unknown>): ILogger {
    return new PinoLoggerAdapter(this.rootProvider, {
      ...(this.bindings ?? {}),
      ...bindings,
    });
  }

  private resolve(): PinoLogger {
    const root = this.rootProvider();
    if (this.cachedRoot !== root || !this.cachedLogger) {
      this.cachedRoot = root;
      this.cachedLogger = this.bindings ? root.child(this.bindings) : root;
    }
    return this.cachedLogger;
  }
}

/**
 * Factory to create loggers with a module name binding.
 */
export function createLogger(module: string): ILogger {
  return new PinoLoggerAdapter(() => loggerRegistry.currentLogger(), {
    module,
  });
}
