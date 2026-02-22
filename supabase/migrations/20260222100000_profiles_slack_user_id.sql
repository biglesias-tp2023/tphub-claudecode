-- ============================================
-- Migration: 20260222_profiles_slack_user_id.sql
-- Description: Add slack_user_id column to profiles table
--   for direct @mentions in daily alert Slack messages.
-- Date: 2026-02-22
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slack_user_id text;

COMMENT ON COLUMN profiles.slack_user_id IS 'Slack User ID (e.g. U04ABCDEF) for @mentions in daily alert messages. Obtain from Slack profile > Copy member ID.';
