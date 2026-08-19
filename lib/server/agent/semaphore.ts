export class Semaphore {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly limit: number) {
    if (!Number.isInteger(limit) || limit < 1) throw new Error("Semaphore limit must be a positive integer");
  }

  async acquire(signal?: AbortSignal) {
    if (signal?.aborted) throw signal.reason ?? new Error("Aborted");
    if (this.active < this.limit) {
      this.active += 1;
      return this.releaseOnce();
    }

    await new Promise<void>((resolve, reject) => {
      const start = () => {
        signal?.removeEventListener("abort", abort);
        this.active += 1;
        resolve();
      };
      const abort = () => {
        const index = this.queue.indexOf(start);
        if (index >= 0) this.queue.splice(index, 1);
        reject(signal?.reason ?? new Error("Aborted"));
      };
      signal?.addEventListener("abort", abort, { once: true });
      this.queue.push(start);
    });
    return this.releaseOnce();
  }

  private releaseOnce() {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active -= 1;
      this.queue.shift()?.();
    };
  }

  get activeCount() {
    return this.active;
  }
}
