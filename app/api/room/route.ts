import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { SPELER_KLEUREN } from '@/lib/questions'

function randomCode(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase()
}

// POST /api/room — maak een room aan
export async function POST(req: NextRequest) {
  const { playerName, packId = 'algemeen', totalQuestions = 8 } = await req.json()
  if (!playerName) return NextResponse.json({ error: 'Naam verplicht' }, { status: 400 })

  // Genereer unieke code
  let code = randomCode()
  for (let i = 0; i < 10; i++) {
    const { data } = await supabase.from('ht_rooms').select('id').eq('code', code).single()
    if (!data) break
    code = randomCode()
  }

  // Maak room aan
  const { data: room, error: roomErr } = await supabase
    .from('ht_rooms')
    .insert({ code, pack_id: packId, total_questions: totalQuestions })
    .select()
    .single()

  if (roomErr || !room) return NextResponse.json({ error: 'Room aanmaken mislukt' }, { status: 500 })

  // Maak host-speler aan
  const kleur = SPELER_KLEUREN[0]!
  const { data: player, error: playerErr } = await supabase
    .from('ht_players')
    .insert({
      room_id: room.id,
      name: playerName,
      color_emoji: kleur.emoji,
      color_hex: kleur.hex,
      is_host: true,
    })
    .select()
    .single()

  if (playerErr || !player) return NextResponse.json({ error: 'Speler aanmaken mislukt' }, { status: 500 })

  // Koppel host aan room
  await supabase.from('ht_rooms').update({ host_player_id: player.id }).eq('id', room.id)

  return NextResponse.json({ room: { ...room, host_player_id: player.id }, player })
}
