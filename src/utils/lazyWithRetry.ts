import { lazy } from 'react';

const RELOAD_KEY = 'tphub_chunk_reload';

/**
 * Wraps React.lazy() with auto-reload on chunk load errors.
 *
 * When Vercel deploys a new version, old JS chunks are removed.
 * If a user has a cached HTML page referencing old chunk URLs,
 * dynamic imports will fail with "Failed to fetch dynamically imported module".
 *
 * This utility detects chunk load errors and forces a full page reload
 * so the browser fetches the new HTML with updated chunk references.
 * A sessionStorage flag prevents infinite reload loops.
 */
export function lazyWithRetry<T extends React.ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>
) {
  return lazy(() => importWithReload(importFn));
}

async function importWithReload<T>(
  importFn: () => Promise<T>
): Promise<T> {
  try {
    const result = await importFn();
    // Successful load - clear the reload flag
    sessionStorage.removeItem(RELOAD_KEY);
    return result;
  } catch (error) {
    if (isChunkLoadError(error) && !sessionStorage.getItem(RELOAD_KEY)) {
      // First chunk error: flag it and reload the page
      sessionStorage.setItem(RELOAD_KEY, '1');
      window.location.reload();
      // Return a never-resolving promise to prevent React from rendering an error
      return new Promise(() => {});
    }
    // Already reloaded once or not a chunk error - let error boundary handle it
    sessionStorage.removeItem(RELOAD_KEY);
    throw error;
  }
}

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message || '';
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module') ||
    (error.name === 'TypeError' && message.includes('Failed to fetch'))
  );
}
