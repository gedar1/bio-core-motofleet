// eslint-disable-next-line @typescript-eslint/no-require-imports
import pino from "pino";

type PinoLogger = pino.Logger;

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

/**
 * Adapter wrapping Pino to satisfy ILogger interface.
 * Uses pino-pretty in development, JSON in production.
 */
export class PinoLoggerAdapter implements ILogger {
  private readonly pinoInstance: PinoLogger;

  constructor(pinoInstance: PinoLogger) {
    this.pinoInstance = pinoInstance;
  }

  info(msg: string, context?: Record<string, unknown>): void {
    if (context) {
      this.pinoInstance.info(context, msg);
    } else {
      this.pinoInstance.info(msg);
    }
  }

  warn(msg: string, context?: Record<string, unknown>): void {
    if (context) {
      this.pinoInstance.warn(context, msg);
    } else {
      this.pinoInstance.warn(msg);
    }
  }

  error(msg: string, context?: Record<string, unknown>): void {
    if (context) {
      this.pinoInstance.error(context, msg);
    } else {
      this.pinoInstance.error(msg);
    }
  }

  debug(msg: string, context?: Record<string, unknown>): void {
    if (context) {
      this.pinoInstance.debug(context, msg);
    } else {
      this.pinoInstance.debug(msg);
    }
  }

  child(bindings: Record<string, unknown>): ILogger {
    return new PinoLoggerAdapter(this.pinoInstance.child(bindings));
  }
}

/**
 * Factory to create loggers with a module name binding.
 */
export function createLogger(module: string): ILogger {
  const isDev = process.env.NODE_ENV !== "production";
  const pinoFn = (pino as unknown as { default?: typeof pino }).default ?? pino;
  const instance = (pinoFn as unknown as (opts: object) => PinoLogger)({
    level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
    ...(isDev && {
      transport: {
        target: "pino-pretty",
        options: { colorize: true },
      },
    }),
  });

  return new PinoLoggerAdapter(instance.child({ module }));
}
