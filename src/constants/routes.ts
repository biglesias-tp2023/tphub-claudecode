export const ROUTES = {
  // Auth routes (públicas)
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
    FORGOT_PASSWORD: '/forgot-password',
  },

  // Protected routes
  CONTROLLING: '/controlling',
  CUSTOMERS: '/customers',
  OPERATIONS: '/operations',
  CLIENTS: '/clients',
  REPUTATION: '/reputation',
  STRATEGIC: '/strategic',
  COMPSET: '/compset',
  CALCULATOR: '/calculator',
  CALENDAR: '/calendar',
  HEATMAP: '/heatmap',
  AUDITS: '/audits',
  MAPS: '/maps',
  MARKET: '/market',
  MARKETING: '/marketing',
  FINANCE: '/finance',
  ALERTS: '/alerts',
  ADMIN: '/admin',

  // Catch-all
  NOT_FOUND: '*',
} as const;
