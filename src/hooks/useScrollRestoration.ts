import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const scrollPositions = new Map<string, number>();

export function useScrollRestoration() {
  const { pathname } = useLocation();
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    // Save scroll position of the route we're leaving
    if (prevPathRef.current !== pathname) {
      scrollPositions.set(prevPathRef.current, window.scrollY);
      prevPathRef.current = pathname;
    }

    // Restore scroll position of the route we're entering
    const saved = scrollPositions.get(pathname);
    if (saved != null) {
      requestAnimationFrame(() => window.scrollTo(0, saved));
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);
}
