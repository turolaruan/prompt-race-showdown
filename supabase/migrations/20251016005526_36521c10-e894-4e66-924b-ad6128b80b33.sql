-- Adicionar coluna technique nas tabelas relevantes
ALTER TABLE arena_votes ADD COLUMN IF NOT EXISTS technique TEXT;
ALTER TABLE leaderboard_results ADD COLUMN IF NOT EXISTS task_name TEXT;

-- Atualizar valores padrão para técnicas existentes
UPDATE leaderboard_results SET technique = 'Base Model' WHERE technique IS NULL;

-- Criar política de INSERT para arena_votes
CREATE POLICY "Anyone can insert votes"
ON arena_votes
FOR INSERT
WITH CHECK (true);