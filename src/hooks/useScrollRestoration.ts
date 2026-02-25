import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'tphub-scroll-positions';
const MAX_RESTORE_ATTEMPTS = 8;
const RESTORE_INTERVAL_MS = 100;

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
 */
function restoreScroll(target: number, attempt = 0): void {
  window.scrollTo(0, target);
  const reached = Math.abs(window.scrollY - target) < 10;
  if (!reached && attempt < MAX_RESTORE_ATTEMPTS) {
    setTimeout(() => restoreScroll(target, attempt + 1), RESTORE_INTERVAL_MS);
  }
}

export function useScrollRestoration() {
  const { pathname } = useLocation();
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    // Save scroll position of the route we're leaving
    if (prevPathRef.current !== pathname) {
      savePosition(prevPathRef.current, window.scrollY);
      prevPathRef.current = pathname;
    }

    // Restore scroll position of the route we're entering
    const saved = getPosition(pathname);
    if (saved != null && saved > 0) {
      requestAnimationFrame(() => restoreScroll(saved));
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  // Also save on beforeunload so position survives page reloads
  useEffect(() => {
    const handleBeforeUnload = () => {
      savePosition(pathname, window.scrollY);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pathname]);
}
