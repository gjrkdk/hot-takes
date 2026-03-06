import postgres from 'postgres'

const DB = 'postgresql://postgres.kvvtddcffouebiviuxxp:Hd3AD9F7p4bD7j%40qg@aws-1-eu-central-1.pooler.supabase.com:5432/postgres'
const sql = postgres(DB, { max: 1 })

await sql`
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
)`

await sql`
CREATE TABLE IF NOT EXISTS ht_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES ht_rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color_emoji TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  score INT NOT NULL DEFAULT 0,
  is_host BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW()
)`

await sql`
CREATE TABLE IF NOT EXISTS ht_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES ht_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES ht_players(id) ON DELETE CASCADE,
  question_index INT NOT NULL,
  vote BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, player_id, question_index)
)`

await sql`
CREATE TABLE IF NOT EXISTS ht_guesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES ht_rooms(id) ON DELETE CASCADE,
  guesser_id UUID NOT NULL REFERENCES ht_players(id) ON DELETE CASCADE,
  question_index INT NOT NULL,
  reveal_index INT NOT NULL,
  guessed_player_id UUID NOT NULL REFERENCES ht_players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, guesser_id, question_index, reveal_index)
)`

// Score increment functie
await sql`
CREATE OR REPLACE FUNCTION ht_increment_score(p_player_id UUID, p_pts INT)
RETURNS VOID AS $$
  UPDATE ht_players SET score = score + p_pts WHERE id = p_player_id;
$$ LANGUAGE SQL`

// Realtime aanzetten
try {
  await sql`ALTER PUBLICATION supabase_realtime ADD TABLE ht_rooms`
} catch { /* al toegevoegd */ }
try {
  await sql`ALTER PUBLICATION supabase_realtime ADD TABLE ht_players`
} catch { /* al toegevoegd */ }
try {
  await sql`ALTER PUBLICATION supabase_realtime ADD TABLE ht_votes`
} catch { /* al toegevoegd */ }
try {
  await sql`ALTER PUBLICATION supabase_realtime ADD TABLE ht_guesses`
} catch { /* al toegevoegd */ }

console.log('✅ Database tabellen aangemaakt!')
await sql.end()
