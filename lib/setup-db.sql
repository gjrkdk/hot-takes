-- Hot Takes game tables
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS ht_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code CHAR(4) UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'lobby',
  pack_id TEXT NOT NULL DEFAULT 'algemeen',
  current_question INT NOT NULL DEFAULT 0,
  total_questions INT NOT NULL DEFAULT 8,
  reveal_index INT NOT NULL DEFAULT 0,
  host_player_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ht_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES ht_rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color_emoji TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  score INT NOT NULL DEFAULT 0,
  is_host BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ht_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES ht_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES ht_players(id) ON DELETE CASCADE,
  question_index INT NOT NULL,
  vote BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, player_id, question_index)
);

CREATE TABLE IF NOT EXISTS ht_guesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES ht_rooms(id) ON DELETE CASCADE,
  guesser_id UUID NOT NULL REFERENCES ht_players(id) ON DELETE CASCADE,
  question_index INT NOT NULL,
  reveal_index INT NOT NULL,
  guessed_player_id UUID NOT NULL REFERENCES ht_players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, guesser_id, question_index, reveal_index)
);

-- Realtime inschakelen
ALTER PUBLICATION supabase_realtime ADD TABLE ht_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE ht_players;
ALTER PUBLICATION supabase_realtime ADD TABLE ht_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE ht_guesses;

-- Auto-opruimen van oude rooms (ouder dan 24 uur)
CREATE OR REPLACE FUNCTION cleanup_old_rooms() RETURNS void AS $$
  DELETE FROM ht_rooms WHERE created_at < NOW() - INTERVAL '24 hours';
$$ LANGUAGE SQL;
