import { createLogger } from "./logger.js";
import type { ILogger } from "./logger.js";

export type SchedulerClock = () => number | Date;
export type SchedulerTimerHandle = ReturnType<typeof setInterval>;

export interface SchedulerTimers {
  setInterval(handler: () => void, intervalMs: number): SchedulerTimerHandle;
  clearInterval(handle: SchedulerTimerHandle): void;
}

export interface SchedulerOptions {
  readonly logger?: ILogger;
  readonly now?: SchedulerClock;
  readonly timers?: SchedulerTimers;
}

export interface ScheduledTask {
  id: string;
  name: string;
  intervalMs: number;
  action: () => Promise<string | void>;
  enabled: boolean;
  lastRun: number | null;
  nextRun: number;
  runCount: number;
  errors: number;
}

const DEFAULT_TIMERS: SchedulerTimers = {
  setInterval: (handler, intervalMs) => setInterval(handler, intervalMs),
  clearInterval: (handle) => clearInterval(handle),
};

/**
 * Scheduler para tareas recurrentes. Los callbacks se ejecutan con captura de
 * errores, no se solapan entre sí y sus timers pueden sustituirse en pruebas.
 */
export class Scheduler {
  private readonly tasks: Map<string, ScheduledTask> = new Map();
  private readonly timers: Map<string, SchedulerTimerHandle> = new Map();
  private readonly inFlight: Set<string> = new Set();
  private readonly log: ILogger;
  private readonly now: SchedulerClock;
  private readonly timerApi: SchedulerTimers;
  private stopped = false;

  constructor(loggerOrOptions: ILogger | SchedulerOptions = {}) {
    if (isLogger(loggerOrOptions)) {
      this.log = loggerOrOptions;
      this.now = () => Date.now();
      this.timerApi = DEFAULT_TIMERS;
    } else {
      this.log = loggerOrOptions.logger ?? createLogger("Scheduler");
      this.now = loggerOrOptions.now ?? (() => Date.now());
      this.timerApi = loggerOrOptions.timers ?? DEFAULT_TIMERS;
    }
  }

  /**
   * Registra una tarea recurrente.
   * @param id Identificador único
   * @param name Nombre descriptivo
   * @param intervalMs Intervalo en milisegundos
   * @param action Función async a ejecutar
   * @param startImmediately Si true, ejecuta la primera vez inmediatamente
   */
  register(
    id: string,
    name: string,
    intervalMs: number,
    action: () => Promise<string | void>,
    startImmediately: boolean = false,
  ): void {
    assertInterval(intervalMs);
    if (typeof action !== "function") {
      throw new TypeError("Scheduler task action must be a function");
    }

    if (this.tasks.has(id)) {
      this.unregister(id);
    }
    this.stopped = false;

    const now = readClock(this.now);
    const task: ScheduledTask = {
      id,
      name,
      intervalMs,
      action,
      enabled: true,
      lastRun: null,
      nextRun: now + (startImmediately ? 0 : intervalMs),
      runCount: 0,
      errors: 0,
    };

    this.tasks.set(id, task);
    this.log.info("Tarea registrada", { taskId: id, name, intervalMs });

    if (startImmediately) {
      void this.executeTask(task);
    }

    this.startTimer(task);
  }

  /** Elimina una tarea y su timer. */
  unregister(id: string): boolean {
    const timer = this.timers.get(id);
    if (timer !== undefined) {
      this.timerApi.clearInterval(timer);
      this.timers.delete(id);
    }
    this.inFlight.delete(id);
    const deleted = this.tasks.delete(id);
    if (deleted) {
      this.log.info("Tarea eliminada", { taskId: id });
    }
    return deleted;
  }

  /** Pausa una tarea sin eliminarla. */
  pause(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    task.enabled = false;
    this.log.info("Tarea pausada", { taskId: id });
    return true;
  }

  /** Reanuda una tarea pausada. */
  resume(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    task.enabled = true;
    task.nextRun = readClock(this.now) + task.intervalMs;
    this.log.info("Tarea reanudada", { taskId: id });
    return true;
  }

  /** Ejecuta una tarea manualmente (fuera de su intervalo). */
  async trigger(id: string): Promise<boolean> {
    const task = this.tasks.get(id);
    if (!task) return false;
    await this.executeTask(task);
    return true;
  }

  /** Info de todas las tareas (sin la función action). */
  list(): Array<Omit<ScheduledTask, "action">> {
    return Array.from(this.tasks.values()).map(
      ({ action: _action, ...rest }) => rest,
    );
  }

  /** Detiene todas las tareas y limpia timers. */
  shutdown(): void {
    this.stopped = true;
    for (const timer of this.timers.values()) {
      this.timerApi.clearInterval(timer);
    }
    this.timers.clear();
    this.tasks.clear();
    this.inFlight.clear();
    this.log.info("Scheduler detenido");
  }

  private startTimer(task: ScheduledTask): void {
    const timer = this.timerApi.setInterval(() => {
      if (!this.stopped && task.enabled) {
        void this.executeTask(task);
      }
    }, task.intervalMs);

    this.timers.set(task.id, timer);
  }

  private async executeTask(task: ScheduledTask): Promise<void> {
    if (this.stopped || !task.enabled || this.inFlight.has(task.id)) {
      return;
    }

    this.inFlight.add(task.id);
    try {
      this.log.debug("Ejecutando tarea", { taskId: task.id, name: task.name });
      await task.action();
      task.lastRun = readClock(this.now);
      task.nextRun = task.lastRun + task.intervalMs;
      task.runCount++;

      this.log.debug("Tarea completada", {
        taskId: task.id,
        runCount: task.runCount,
      });
    } catch (error: unknown) {
      task.errors++;
      task.lastRun = readClock(this.now);
      task.nextRun = task.lastRun + task.intervalMs;

      // Do not persist or log arbitrary exception text: a job may accidentally
      // include a token, URL or provider response in its thrown value.
      this.log.error("Error en tarea", {
        taskId: task.id,
        errorType: error instanceof Error ? error.name : "UnknownError",
        errorCount: task.errors,
      });
    } finally {
      this.inFlight.delete(task.id);
    }
  }
}

function isLogger(value: ILogger | SchedulerOptions): value is ILogger {
  return (
    typeof (value as ILogger).info === "function" &&
    typeof (value as ILogger).error === "function" &&
    typeof (value as ILogger).child === "function"
  );
}

function readClock(clock: SchedulerClock): number {
  const value = clock();
  const timestamp = value instanceof Date ? value.getTime() : value;
  if (!Number.isFinite(timestamp)) {
    throw new Error("Scheduler clock returned an invalid timestamp");
  }
  return timestamp;
}

function assertInterval(intervalMs: number): void {
  if (!Number.isSafeInteger(intervalMs) || intervalMs <= 0) {
    throw new Error("Scheduler interval must be a positive integer");
  }
}

export * from "./ContractSignatureScheduler.js";
