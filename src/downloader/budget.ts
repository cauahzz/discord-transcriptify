/**
 * A running total with a ceiling. Everything a transcript embeds stays in
 * memory until the file is written, so the sum is what has to be bounded, not
 * only each download.
 */
export class ByteBudget {
  private used = 0;
  private closed = false;

  /** @param maxBytes Ceiling in bytes; zero or less means no ceiling. */
  constructor(private readonly maxBytes: number) {}

  private get limited() {
    return this.maxBytes > 0;
  }

  get exhausted() {
    return this.closed;
  }

  /**
   * Claims `bytes` if they still fit, and says whether they did. The first
   * claim that does not fit closes the budget: looking for a smaller item that
   * still fits would mean downloading every remaining one just to measure it.
   */
  take(bytes: number) {
    if (this.closed) return false;
    if (this.limited && this.used + bytes > this.maxBytes) {
      this.closed = true;
      return false;
    }
    this.used += bytes;
    return true;
  }
}

/**
 * Runs at most `concurrency` tasks at a time and queues the rest, so the
 * buffers of every download in a large transcript are not alive at once.
 * Zero or less means no limit.
 */
export function createLimiter(concurrency: number) {
  if (!(concurrency > 0)) return <T>(task: () => Promise<T>) => task();

  let running = 0;
  const waiting: (() => void)[] = [];

  return async <T>(task: () => Promise<T>): Promise<T> => {
    // a finished task hands its slot straight to the next in line, so a newcomer cannot take it in between
    if (running >= concurrency) await new Promise<void>((resolve) => waiting.push(resolve));
    else running++;
    try {
      return await task();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else running--;
    }
  };
}
