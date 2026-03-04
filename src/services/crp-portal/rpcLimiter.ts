/**
 * Global RPC Concurrency Limiter
 *
 * Limits the number of concurrent Supabase RPC calls to prevent
 * PostgreSQL statement timeouts caused by I/O contention.
 *
 * When React Query fires multiple hooks simultaneously (e.g., Controlling
 * loads 4+ hooks at once), each creating batched RPC calls, the database
 * can receive 4-6+ concurrent heavy queries. This semaphore ensures only
 * MAX_CONCURRENT RPCs touch the database at any given time; the rest wait
 * in a FIFO queue.
 *
 * @module services/crp-portal/rpcLimiter
 */

const MAX_CONCURRENT = 2;

/** Max companies per RPC call to avoid PostgreSQL statement timeouts */
export const RPC_BATCH_SIZE = 10;
let running = 0;
const queue: Array<() => void> = [];

/**
 * Wraps an async function so that at most MAX_CONCURRENT execute simultaneously.
 * Excess calls are queued and executed in FIFO order as slots free up.
 */
export async function withRpcLimit<T>(fn: () => PromiseLike<T>): Promise<T> {
  if (running >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => queue.push(resolve));
  }
  running++;
  try {
    return await fn();
  } finally {
    running--;
    const next = queue.shift();
    if (next) next();
  }
}
