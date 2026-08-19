import { describe, expect, it } from "vitest";
import { Semaphore } from "@/lib/server/agent/semaphore";

describe("Semaphore", () => {
  it.each([0, -1, 1.5, Number.NaN])("rejects invalid limit %s", (limit) => {
    expect(() => new Semaphore(limit)).toThrow("Semaphore limit must be a positive integer");
  });

  it("never grants more than the configured number of permits", async () => {
    const semaphore = new Semaphore(2);
    const releaseFirst = await semaphore.acquire();
    const releaseSecond = await semaphore.acquire();
    let thirdAcquired = false;

    const thirdPermit = semaphore.acquire().then((release) => {
      thirdAcquired = true;
      return release;
    });

    await Promise.resolve();
    expect(semaphore.activeCount).toBe(2);
    expect(thirdAcquired).toBe(false);

    releaseFirst();
    const releaseThird = await thirdPermit;
    expect(thirdAcquired).toBe(true);
    expect(semaphore.activeCount).toBe(2);

    releaseSecond();
    releaseThird();
    releaseThird();
    expect(semaphore.activeCount).toBe(0);
  });

  it("removes a cancelled waiter without consuming a permit", async () => {
    const semaphore = new Semaphore(1);
    const releaseActive = await semaphore.acquire();
    const cancelledController = new AbortController();

    const cancelledWaiter = semaphore.acquire(cancelledController.signal);
    const nextWaiter = semaphore.acquire();
    const cancellation = expect(cancelledWaiter).rejects.toThrow("cancel queued permit");

    cancelledController.abort(new Error("cancel queued permit"));
    await cancellation;
    expect(semaphore.activeCount).toBe(1);

    releaseActive();
    const releaseNext = await nextWaiter;
    expect(semaphore.activeCount).toBe(1);
    releaseNext();
    expect(semaphore.activeCount).toBe(0);
  });

  it("rejects an already-aborted acquisition immediately", async () => {
    const semaphore = new Semaphore(1);
    const controller = new AbortController();
    controller.abort(new Error("already cancelled"));

    await expect(semaphore.acquire(controller.signal)).rejects.toThrow("already cancelled");
    expect(semaphore.activeCount).toBe(0);
  });
});
