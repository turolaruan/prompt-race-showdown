-- Create benchmarks table for storing model benchmark results
CREATE TABLE public.benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_name TEXT NOT NULL,
  task_type TEXT NOT NULL,
  score NUMERIC NOT NULL,
  metric TEXT NOT NULL,
  dataset TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.benchmarks ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Public read access for benchmarks"
ON public.benchmarks
FOR SELECT
USING (true);

-- Create indexes for performance
CREATE INDEX idx_benchmarks_model ON public.benchmarks(model_name);
CREATE INDEX idx_benchmarks_task ON public.benchmarks(task_type);
CREATE INDEX idx_benchmarks_created ON public.benchmarks(created_at DESC);