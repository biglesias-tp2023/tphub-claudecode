/**
 * CRP Portal Error Handling
 *
 * Standardized error handler for all CRP Portal service modules.
 * Logs full error details in DEV mode only, then throws a user-friendly message.
 *
 * @module services/crp-portal/errors
 */

/**
 * Handles errors from CRP Portal service calls.
 *
 * - In DEV mode: logs the full error to the console for debugging.
 * - In all modes: throws an Error with a user-friendly message that includes the context.
 *
 * @param context - A label identifying the calling function (e.g. "fetchCrpOrders")
 * @param error - The caught error (Postgrest error, generic Error, or unknown)
 * @throws Always throws an Error with the context string
 *
 * @example
 * ```typescript
 * try {
 *   const { data, error } = await supabase.from('table').select('*');
 *   if (error) handleCrpError('fetchItems', error);
 * } catch (err) {
 *   handleCrpError('fetchItems', err);
 * }
 * ```
 */
export function handleCrpError(context: string, error: unknown): never {
  if (import.meta.env.DEV) {
    console.error(`[crp-portal] ${context}:`, error);
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error);

  throw new Error(`${context}: ${message}`);
}
