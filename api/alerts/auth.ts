/**
 * Shared authentication & sanitization utilities for alert API endpoints.
 *
 * @module api/alerts/auth
 */

import crypto from 'crypto';

/**
 * Escape HTML special characters to prevent XSS in email templates.
 * Only escapes the 5 characters that matter for HTML injection.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Timing-safe comparison of the Authorization header against CRON_SECRET.
 * Prevents timing attacks that could leak the secret byte-by-byte.
 *
 * @returns true if the header matches `Bearer <CRON_SECRET>`
 */
export function verifyCronSecret(authHeader: string | undefined): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authHeader) return false;

  const expected = `Bearer ${secret}`;

  // timingSafeEqual requires equal-length buffers
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);

  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}
