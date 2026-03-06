import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(URL, KEY)

// ─── Types ────────────────────────────────────────────────────────────────
export type GameStatus =
  | 'lobby'      // wachten op spelers
  | 'voting'     // iedereen stemt
  | 'revealing'  // votes worden onthuld, raad-ronde
  | 'scores'     // scorebord na vraag
  | 'finished'   // eindstand

export type Room = {
  id: string
  code: string
  status: GameStatus
  pack_id: string
  current_question: number
  total_questions: number
  reveal_index: number        // welke stem is momenteel onthuld
  reveal_phase: 'guess' | 'name'  // 'guess' = anoniem raden, 'name' = naam tonen
  host_player_id: string | null
  created_at: string
}

export type Player = {
  id: string
  room_id: string
  name: string
  color_emoji: string
  color_hex: string
  score: number
  is_host: boolean
  joined_at: string
}

export type Vote = {
  id: string
  room_id: string
  player_id: string
  question_index: number
  vote: boolean  // true = eens, false = oneens
}

export type Guess = {
  id: string
  room_id: string
  guesser_id: string
  question_index: number
  reveal_index: number
  guessed_player_id: string
}
