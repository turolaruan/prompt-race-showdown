-- Add technique column to arena_votes if not exists
ALTER TABLE arena_votes ADD COLUMN IF NOT EXISTS technique text;

-- Add task column to arena_votes if not exists  
ALTER TABLE arena_votes ADD COLUMN IF NOT EXISTS task text;

-- Update RLS policy to allow inserts
DROP POLICY IF EXISTS "Anyone can insert votes" ON arena_votes;
CREATE POLICY "Anyone can insert votes" 
ON arena_votes 
FOR INSERT 
WITH CHECK (true);