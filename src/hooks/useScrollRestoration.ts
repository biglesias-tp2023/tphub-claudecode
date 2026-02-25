import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'tphub-scroll-positions';

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
    if (saved != null) {
      requestAnimationFrame(() => window.scrollTo(0, saved));
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
