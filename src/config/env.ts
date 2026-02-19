/**
 * Environment variable validation.
 * Import this module early (in main.tsx) to fail fast with clear messages.
 */

function requireEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      `Check your .env file or deployment config.`
    );
  }
  return value;
}

export const env = {
  SUPABASE_URL: requireEnv('VITE_SUPABASE_URL'),
  SUPABASE_ANON_KEY: requireEnv('VITE_SUPABASE_ANON_KEY'),
} as const;
