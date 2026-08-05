import { createLogger } from "./logger.js";
import type { ILogger } from "./logger.js";

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

/**
 * Scheduler para tareas recurrentes (expiración de contratos, retry de emails).
 * Usa setInterval con gestión de estado. Sin dependencias externas.
 */
export class Scheduler {
  private readonly tasks: Map<string, ScheduledTask> = new Map();
  private readonly timers: Map<string, ReturnType<typeof setInterval>> =
    new Map();
  private readonly log: ILogger;

  constructor(logger?: ILogger) {
    this.log = logger ?? createLogger("Scheduler");
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
    if (this.tasks.has(id)) {
      this.unregister(id);
    }

    const task: ScheduledTask = {
      id,
      name,
      intervalMs,
      action,
      enabled: true,
      lastRun: null,
      nextRun: Date.now() + (startImmediately ? 0 : intervalMs),
      runCount: 0,
      errors: 0,
    };

    this.tasks.set(id, task);
    this.log.info("Tarea registrada", { taskId: id, name, intervalMs });

    if (startImmediately) {
      this.executeTask(task);
    }

    this.startTimer(task);
  }

  /** Elimina una tarea y su timer. */
  unregister(id: string): boolean {
    const timer = this.timers.get(id);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(id);
    }
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
    task.nextRun = Date.now() + task.intervalMs;
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
    for (const [_id, timer] of this.timers) {
      clearInterval(timer);
    }
    this.timers.clear();
    this.tasks.clear();
    this.log.info("Scheduler detenido");
  }

  private startTimer(task: ScheduledTask): void {
    const timer = setInterval(async () => {
      if (task.enabled) {
        await this.executeTask(task);
      }
    }, task.intervalMs);

    this.timers.set(task.id, timer);
  }

  private async executeTask(task: ScheduledTask): Promise<void> {
    try {
      this.log.debug("Ejecutando tarea", { taskId: task.id, name: task.name });
      await task.action();
      task.lastRun = Date.now();
      task.nextRun = Date.now() + task.intervalMs;
      task.runCount++;

      this.log.debug("Tarea completada", {
        taskId: task.id,
        runCount: task.runCount,
      });
    } catch (error: unknown) {
      task.errors++;
      task.lastRun = Date.now();
      task.nextRun = Date.now() + task.intervalMs;

      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log.error("Error en tarea", {
        taskId: task.id,
        errorMessage: errorMsg,
        errorCount: task.errors,
      });
    }
  }
}
