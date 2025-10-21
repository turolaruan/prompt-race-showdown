-- Refactor benchmarks table to store full benchmark payload details
BEGIN;

-- Clear existing data to avoid conflicts with new schema
TRUNCATE TABLE public.benchmarks;

-- Drop legacy columns no longer in use
ALTER TABLE public.benchmarks
  DROP COLUMN IF EXISTS task_type,
  DROP COLUMN IF EXISTS score,
  DROP COLUMN IF EXISTS metric,
  DROP COLUMN IF EXISTS dataset;

-- Ensure optional model_name column allows nulls during insertion
ALTER TABLE public.benchmarks
  ALTER COLUMN model_name DROP NOT NULL;

-- Add new columns to match provided benchmark JSON payload
ALTER TABLE public.benchmarks
  ADD COLUMN IF NOT EXISTS model_path TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS total INTEGER NOT NULL,
  ADD COLUMN IF NOT EXISTS correct INTEGER NOT NULL,
  ADD COLUMN IF NOT EXISTS accuracy_percent NUMERIC NOT NULL,
  ADD COLUMN IF NOT EXISTS by_answer_type JSONB,
  ADD COLUMN IF NOT EXISTS val_json TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS generated_max_new_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS stop_on_answer BOOLEAN,
  ADD COLUMN IF NOT EXISTS out_dir TEXT,
  ADD COLUMN IF NOT EXISTS runtime_seconds NUMERIC,
  ADD COLUMN IF NOT EXISTS avg_seconds_per_example NUMERIC;

-- Drop obsolete indexes
DROP INDEX IF EXISTS idx_benchmarks_task;

COMMIT;
