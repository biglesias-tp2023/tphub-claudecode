-- Add start_date to strategic_objectives
-- Allows objectives to have a planned start date separate from creation date.
-- Gantt chart will use start_date instead of created_at for bar positioning.

ALTER TABLE strategic_objectives
  ADD COLUMN IF NOT EXISTS start_date DATE;

-- Backfill existing objectives: use created_at as start_date
UPDATE strategic_objectives
  SET start_date = created_at::date
  WHERE start_date IS NULL;

-- Index for Gantt chart queries
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_start_date
  ON strategic_objectives (start_date);
