import { useState, useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'tphub-sidebar-collapsed';

// Use useSyncExternalStore for proper SSR/hydration support
function getSnapshot(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

function getServerSnapshot(): boolean {
  return false;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

export function useSidebarCollapse() {
  // Use a local state that syncs with external store
  const externalValue = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isCollapsed, setIsCollapsed] = useState(externalValue);

  const toggle = useCallback(() => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem(STORAGE_KEY, newValue.toString());
      return newValue;
    });
  }, []);

  const expand = useCallback(() => {
    setIsCollapsed(false);
    localStorage.setItem(STORAGE_KEY, 'false');
  }, []);

  const collapse = useCallback(() => {
    setIsCollapsed(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  return {
    isCollapsed,
    toggle,
    expand,
    collapse,
  };
}
