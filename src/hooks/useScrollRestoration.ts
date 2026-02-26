import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'tphub-scroll-positions';
const SAVE_DEBOUNCE_MS = 150;
const MAX_RESTORE_ATTEMPTS = 10;
const RESTORE_INTERVAL_MS = 120;

function getPositions(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePosition(pathname: string, scrollY: number) {
  try {
    const positions = getPositions();
    positions[pathname] = scrollY;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // ignore quota exceeded
  }
}

function getPosition(pathname: string): number | undefined {
  return getPositions()[pathname];
}

/**
 * Tries to restore scroll position with retries.
 * Content loads async (React Query), so the page may not be tall enough
 * on the first attempt. Retries until scrollTo succeeds or attempts run out.
 * Returns a cleanup function to cancel pending retries.
 */
function restoreScroll(target: number): () => void {
  let cancelled = false;

  const attempt = () => {
    if (cancelled) return;
    window.scrollTo(0, target);
    const reached = Math.abs(window.scrollY - target) < 10;
    if (!reached) {
      setTimeout(attempt, RESTORE_INTERVAL_MS);
    }
  };

  // Track attempts to avoid infinite loop
  let count = 0;
  const guardedAttempt = () => {
    if (cancelled || count >= MAX_RESTORE_ATTEMPTS) return;
    count++;
    window.scrollTo(0, target);
    const reached = Math.abs(window.scrollY - target) < 10;
    if (!reached) {
      setTimeout(guardedAttempt, RESTORE_INTERVAL_MS);
    }
  };

  requestAnimationFrame(guardedAttempt);

  return () => { cancelled = true; };
}

export function useScrollRestoration() {
  const { pathname } = useLocation();
  const prevPathRef = useRef(pathname);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const cancelRestoreRef = useRef<(() => void) | null>(null);

  // Continuously save scroll position (debounced) while the user scrolls.
  // This ensures we always have an accurate position even if the route
  // change effect fires after the DOM has already updated.
  const handleScroll = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      savePosition(pathname, window.scrollY);
    }, SAVE_DEBOUNCE_MS);
  }, [pathname]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timerRef.current);
    };
  }, [handleScroll]);

  // On route change: restore saved position or scroll to top for new pages
  useEffect(() => {
    // Cancel any pending restore from previous navigation
    cancelRestoreRef.current?.();
    cancelRestoreRef.current = null;

    if (prevPathRef.current !== pathname) {
      // Save one final time for the route we're leaving (belt & suspenders)
      savePosition(prevPathRef.current, window.scrollY);
      prevPathRef.current = pathname;
    }

    const saved = getPosition(pathname);
    if (saved != null && saved > 0) {
      cancelRestoreRef.current = restoreScroll(saved);
    } else {
      window.scrollTo(0, 0);
    }

    return () => {
      cancelRestoreRef.current?.();
    };
  }, [pathname]);

  // Save on beforeunload so position survives page reloads
  useEffect(() => {
    const handleBeforeUnload = () => {
      savePosition(pathname, window.scrollY);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pathname]);
}
