import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

/**
 * Valida que el email sea del dominio @thinkpaladar.com
 */
export function isValidThinkPaladarEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@thinkpaladar.com');
}
