-- Allow uploads from the admin interface by permitting inserts on benchmarks
DROP POLICY IF EXISTS "Anyone can insert benchmarks" ON public.benchmarks;
CREATE POLICY "Anyone can insert benchmarks"
ON public.benchmarks
FOR INSERT
WITH CHECK (true);

-- Allow clearing the table from the admin interface
DROP POLICY IF EXISTS "Anyone can delete benchmarks" ON public.benchmarks;
CREATE POLICY "Anyone can delete benchmarks"
ON public.benchmarks
FOR DELETE
USING (true);
