import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { SPELER_KLEUREN } from '@/lib/questions'

// POST /api/join — voeg speler toe aan room
export async function POST(req: NextRequest) {
  const { playerName, code } = await req.json()
  if (!playerName || !code) return NextResponse.json({ error: 'Naam en code verplicht' }, { status: 400 })

  // Zoek room
  const { data: room } = await supabase
    .from('ht_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (!room) return NextResponse.json({ error: 'Room niet gevonden' }, { status: 404 })
  if (room.status !== 'lobby') return NextResponse.json({ error: 'Spel is al gestart' }, { status: 400 })

  // Haal bestaande spelers op voor kleur-selectie
  const { data: bestaande } = await supabase
    .from('ht_players')
    .select('color_emoji')
    .eq('room_id', room.id)

  const gebruikte = new Set((bestaande ?? []).map(p => p.color_emoji))
  const beschikbaar = SPELER_KLEUREN.filter(k => !gebruikte.has(k.emoji))
  const kleur = beschikbaar[0] ?? SPELER_KLEUREN[Math.floor(Math.random() * SPELER_KLEUREN.length)]!

  if (!kleur) return NextResponse.json({ error: 'Room is vol (max 8 spelers)' }, { status: 400 })

  const { data: player, error } = await supabase
    .from('ht_players')
    .insert({
      room_id: room.id,
      name: playerName,
      color_emoji: kleur.emoji,
      color_hex: kleur.hex,
      is_host: false,
    })
    .select()
    .single()

  if (error || !player) return NextResponse.json({ error: 'Joinen mislukt' }, { status: 500 })

  return NextResponse.json({ room, player })
}
