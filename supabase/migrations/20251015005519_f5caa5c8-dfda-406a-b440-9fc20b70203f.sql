-- Create models table
CREATE TABLE IF NOT EXISTS public.models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT UNIQUE NOT NULL,
  model_name TEXT NOT NULL,
  provider TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create arena responses table
CREATE TABLE IF NOT EXISTS public.arena_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  model_id TEXT NOT NULL,
  response TEXT NOT NULL,
  response_time NUMERIC,
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create arena votes table
CREATE TABLE IF NOT EXISTS public.arena_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  model_a_id TEXT NOT NULL,
  model_b_id TEXT NOT NULL,
  winner_model_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create leaderboard results table
CREATE TABLE IF NOT EXISTS public.leaderboard_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  technique TEXT NOT NULL,
  task TEXT NOT NULL,
  score NUMERIC NOT NULL,
  rank INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_results ENABLE ROW LEVEL SECURITY;

-- Create public read policies (data is public for everyone to see)
CREATE POLICY "Public read access for models"
  ON public.models FOR SELECT
  USING (true);

CREATE POLICY "Public read access for arena_responses"
  ON public.arena_responses FOR SELECT
  USING (true);

CREATE POLICY "Public read access for arena_votes"
  ON public.arena_votes FOR SELECT
  USING (true);

CREATE POLICY "Public read access for leaderboard_results"
  ON public.leaderboard_results FOR SELECT
  USING (true);

-- Create indexes for better performance
CREATE INDEX idx_arena_responses_model_id ON public.arena_responses(model_id);
CREATE INDEX idx_arena_responses_created_at ON public.arena_responses(created_at DESC);
CREATE INDEX idx_arena_votes_created_at ON public.arena_votes(created_at DESC);
CREATE INDEX idx_leaderboard_results_model_name ON public.leaderboard_results(model_name);
CREATE INDEX idx_leaderboard_results_task ON public.leaderboard_results(task);