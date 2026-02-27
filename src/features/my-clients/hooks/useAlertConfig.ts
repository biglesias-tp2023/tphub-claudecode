import { useState, useCallback, useRef, useEffect } from 'react';
import { ALERT_DEFAULTS } from '@/services/alertPreferences';

// ─── Types ───

export type AlertFrequency = 'weekdays' | 'daily' | 'weekly';

export interface AlertConfig {
  enabled: boolean;
  channel: 'slack' | 'email';
  frequency: AlertFrequency;
  thresholds: {
    orders: number;
    reviews: number;
    adsRoas: number;
    promos: number;
  };
  lastSavedAt: string | null;
}

// ─── Constants ───

const STORAGE_PREFIX = 'tphub_alert_config_';
const DEBOUNCE_MS = 800;

const DEFAULT_CONFIG: AlertConfig = {
  enabled: false,
  channel: 'slack',
  frequency: 'weekdays',
  thresholds: {
    orders: ALERT_DEFAULTS.ordersThreshold,
    reviews: ALERT_DEFAULTS.reviewsThreshold,
    adsRoas: ALERT_DEFAULTS.adsRoasThreshold,
    promos: ALERT_DEFAULTS.promosThreshold,
  },
  lastSavedAt: null,
};

// ─── localStorage helpers ───

function getStorageKey(consultantId: string): string {
  return `${STORAGE_PREFIX}${consultantId}`;
}

function readConfig(consultantId: string): AlertConfig {
  try {
    const raw = localStorage.getItem(getStorageKey(consultantId));
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function writeConfig(consultantId: string, config: AlertConfig): void {
  localStorage.setItem(getStorageKey(consultantId), JSON.stringify(config));
}

// ─── Standalone reader (no hook needed) ───

export function isAlertConfigEnabled(consultantId: string | undefined): boolean {
  if (!consultantId) return false;
  try {
    const raw = localStorage.getItem(getStorageKey(consultantId));
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed.enabled === true;
  } catch {
    return false;
  }
}

// ─── Hook ───

export function useAlertConfig(consultantId: string) {
  const [config, setConfigState] = useState<AlertConfig>(() => readConfig(consultantId));
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const configRef = useRef(config);
  configRef.current = config;

  // Re-read if consultantId changes
  useEffect(() => {
    if (consultantId) {
      setConfigState(readConfig(consultantId));
    }
  }, [consultantId]);

  const setConfig = useCallback(
    (updater: AlertConfig | ((prev: AlertConfig) => AlertConfig)) => {
      setConfigState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        const saved: AlertConfig = { ...next, lastSavedAt: new Date().toISOString() };

        // Debounced write to localStorage
        clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
          writeConfig(consultantId, saved);
        }, DEBOUNCE_MS);

        return saved;
      });
    },
    [consultantId],
  );

  // Cleanup debounce on unmount — flush pending save
  useEffect(() => {
    return () => {
      clearTimeout(debounceTimer.current);
      // Flush final state on unmount
      if (configRef.current.lastSavedAt) {
        writeConfig(consultantId, configRef.current);
      }
    };
  }, [consultantId]);

  return { config, setConfig } as const;
}
