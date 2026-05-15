-- ============================================
-- PADEL DOHA TOURNAMENT - SCHEMA SUPABASE
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- 1. Table des tournois
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tournament_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_duration_minutes INTEGER NOT NULL DEFAULT 240, -- durée totale en minutes
  match_duration_minutes INTEGER NOT NULL DEFAULT 20,
  break_duration_minutes INTEGER NOT NULL DEFAULT 5,
  num_courts INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'setup', -- 'setup', 'running', 'finished'
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table des équipes (2 joueurs par équipe)
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  team_name TEXT,
  player1_name TEXT NOT NULL,
  player2_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table des matchs
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL, -- numéro de la session/round
  court_number INTEGER NOT NULL, -- terrain 1, 2, 3...
  team_a_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  team_b_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  score_a INTEGER DEFAULT 0,
  score_b INTEGER DEFAULT 0,
  is_finished BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Index pour performance
CREATE INDEX IF NOT EXISTS idx_teams_tournament ON teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_round ON matches(tournament_id, round_number);

-- 5. Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tournaments_updated_at ON tournaments;
CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. RLS (Row Level Security)
-- Lecture publique, écriture pour tous (admin contrôlé côté app)
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Policies : tout le monde peut lire, tout le monde peut écrire
-- (le contrôle admin est fait côté frontend comme Recettes de Sylvie)
DROP POLICY IF EXISTS "Public read tournaments" ON tournaments;
CREATE POLICY "Public read tournaments" ON tournaments FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public write tournaments" ON tournaments;
CREATE POLICY "Public write tournaments" ON tournaments FOR ALL USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Public read teams" ON teams;
CREATE POLICY "Public read teams" ON teams FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public write teams" ON teams;
CREATE POLICY "Public write teams" ON teams FOR ALL USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Public read matches" ON matches;
CREATE POLICY "Public read matches" ON matches FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public write matches" ON matches;
CREATE POLICY "Public write matches" ON matches FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- 7. Activer Realtime (à faire aussi via UI Supabase : Database > Replication)
ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
