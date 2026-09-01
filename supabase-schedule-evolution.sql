-- ============================================
-- EVOLUTION HORAIRES DE LOCATION - A executer dans Supabase SQL Editor
-- (en plus des schemas precedents)
-- ============================================

-- Heures de debut et de fin du tournoi (memes horaires pour tous les terrains)
-- Format TIME (HH:MM:SS)
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS start_time TIME DEFAULT '18:00:00';

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS end_time TIME DEFAULT '22:00:00';

-- L'heure prevue de debut de chaque match (calculee au lancement)
-- Format TIME (HH:MM:SS)
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS scheduled_time TIME DEFAULT NULL;
