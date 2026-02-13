import { lazy } from 'react';

/**
 * Wraps React.lazy() with retry logic and exponential backoff.
 *
 * When Vercel deploys a new version, old JS chunks are removed.
 * If a user has a cached HTML page referencing old chunk URLs,
 * dynamic imports will fail with "Failed to fetch dynamically imported module".
 *
 * This utility retries the import up to 3 times with increasing delays
 * before giving up (at which point ChunkLoadErrorBoundary catches the error).
 */
export function lazyWithRetry<T extends React.ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>
) {
  return lazy(() => retryImport(importFn));
}

const RETRY_DELAYS = [500, 1000, 2000];

async function retryImport<T>(
  importFn: () => Promise<T>,
  retries = RETRY_DELAYS.length
): Promise<T> {
  try {
    return await importFn();
  } catch (error) {
    if (retries <= 0) throw error;

    const delay = RETRY_DELAYS[RETRY_DELAYS.length - retries];
    await new Promise((resolve) => setTimeout(resolve, delay));

    return retryImport(importFn, retries - 1);
  }
}
