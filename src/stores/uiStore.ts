import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface UIState {
  // Sidebar
  isSidebarCollapsed: boolean;
  isSidebarOpen: boolean; // Para mobile

  // Theme
  theme: Theme;

  // Modals
  activeModal: string | null;
  modalData: unknown;

  // Notifications
  notifications: Notification[];

  // Command palette (Cmd+K)
  isCommandPaletteOpen: boolean;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarOpen: (open: boolean) => void;

  setTheme: (theme: Theme) => void;

  openModal: (modalId: string, data?: unknown) => void;
  closeModal: () => void;

  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

let notificationId = 0;

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      isSidebarCollapsed: false,
      isSidebarOpen: false,
      theme: 'light',
      activeModal: null,
      modalData: null,
      notifications: [],
      isCommandPaletteOpen: false,

      // Sidebar
      toggleSidebar: () => {
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed }));
      },

      setSidebarCollapsed: (collapsed) => {
        set({ isSidebarCollapsed: collapsed });
      },

      setSidebarOpen: (open) => {
        set({ isSidebarOpen: open });
      },

      // Theme
      setTheme: (theme) => {
        set({ theme });
        // Aplicar tema al documento
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (theme === 'light') {
          document.documentElement.classList.remove('dark');
        } else {
          // System
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.classList.toggle('dark', prefersDark);
        }
      },

      // Modals
      openModal: (modalId, data) => {
        set({ activeModal: modalId, modalData: data ?? null });
      },

      closeModal: () => {
        set({ activeModal: null, modalData: null });
      },

      // Notifications
      addNotification: (notification) => {
        const id = `notification-${++notificationId}`;
        const newNotification: Notification = {
          ...notification,
          id,
          duration: notification.duration ?? 5000,
        };

        set((state) => ({
          notifications: [...state.notifications, newNotification],
        }));

        // Auto-remove después del duration
        if (newNotification.duration && newNotification.duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, newNotification.duration);
        }
      },

      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      clearNotifications: () => {
        set({ notifications: [] });
      },

      // Command palette
      toggleCommandPalette: () => {
        set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen }));
      },

      setCommandPaletteOpen: (open) => {
        set({ isCommandPaletteOpen: open });
      },
    }),
    {
      name: 'tphub-ui',
      partialize: (state) => ({
        // Solo persistir preferencias de UI
        isSidebarCollapsed: state.isSidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
);

// Keyboard shortcut para Cmd+K (Command Palette / Client Selector)
if (typeof window !== 'undefined') {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      useUIStore.getState().toggleCommandPalette();
    }
  });
}
