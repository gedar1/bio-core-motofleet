import { afterEach, describe, expect, it, vi } from "vitest";
import { Scheduler } from "../src/infrastructure/scheduler.js";

const logger = { info() {}, error() {}, warn() {}, debug() {}, child() { return this; } };

describe("timer probe", () => {
  afterEach(() => vi.useRealTimers());
  it("tracks scheduler timers", () => {
    vi.useFakeTimers();
    const scheduler = new Scheduler(logger);
    for (let index = 0; index < 5; index += 1) {
      scheduler.register(`task-${index}`, `Task ${index}`, 1000, async () => {});
    }
    console.log("probe after register", vi.getTimerCount());
    scheduler.shutdown();
    console.log("probe after shutdown", vi.getTimerCount());
    expect(vi.getTimerCount()).toBe(0);
  });
});
