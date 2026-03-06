import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/action — game state machine
export async function POST(req: NextRequest) {
  const { action, roomId, playerId, vote, guessedPlayerId, questionIndex, revealIndex } = await req.json()

  // ── start: lobby → voting ────────────────────────────────────────────────
  if (action === 'start') {
    const { data: room } = await supabase.from('ht_rooms').select('*').eq('id', roomId).single()
    if (!room) return NextResponse.json({ error: 'Room niet gevonden' }, { status: 404 })
    if (room.host_player_id !== playerId) return NextResponse.json({ error: 'Alleen de host kan starten' }, { status: 403 })
    await supabase.from('ht_rooms').update({ status: 'voting', current_question: 0, reveal_index: 0 }).eq('id', roomId)
    return NextResponse.json({ ok: true })
  }

  // ── vote: stem opslaan ────────────────────────────────────────────────────
  if (action === 'vote') {
    const { data: room } = await supabase.from('ht_rooms').select('*').eq('id', roomId).single()
    if (!room || room.status !== 'voting') return NextResponse.json({ error: 'Niet in stemfase' }, { status: 400 })

    await supabase.from('ht_votes').upsert({
      room_id: roomId,
      player_id: playerId,
      question_index: room.current_question,
      vote: vote,
    }, { onConflict: 'room_id,player_id,question_index' })

    // Check: heeft iedereen gestemd?
    const { data: players } = await supabase.from('ht_players').select('id').eq('room_id', roomId)
    const { data: votes } = await supabase.from('ht_votes').select('id').eq('room_id', roomId).eq('question_index', room.current_question)

    if ((players?.length ?? 0) > 0 && votes?.length === players?.length) {
      // Iedereen heeft gestemd → ga naar revealing
      await supabase.from('ht_rooms').update({ status: 'revealing', reveal_index: 0 }).eq('id', roomId)
    }

    return NextResponse.json({ ok: true })
  }

  // ── reveal: onthul volgende stem ──────────────────────────────────────────
  if (action === 'reveal') {
    const { data: room } = await supabase.from('ht_rooms').select('*').eq('id', roomId).single()
    if (!room) return NextResponse.json({ error: 'Room niet gevonden' }, { status: 404 })
    if (room.host_player_id !== playerId) return NextResponse.json({ error: 'Alleen host' }, { status: 403 })

    const { data: players } = await supabase.from('ht_players').select('id').eq('room_id', roomId)
    const totalPlayers = players?.length ?? 0
    const newRevealIndex = room.reveal_index + 1

    if (newRevealIndex >= totalPlayers) {
      // Alles onthuld → bereken scores + ga naar scores-scherm
      await berekenEnUpdateScores(roomId, room.current_question)
      await supabase.from('ht_rooms').update({ status: 'scores' }).eq('id', roomId)
    } else {
      await supabase.from('ht_rooms').update({ reveal_index: newRevealIndex }).eq('id', roomId)
    }
    return NextResponse.json({ ok: true })
  }

  // ── guess: raad wie een stem heeft uitgebracht ────────────────────────────
  if (action === 'guess') {
    const { data: room } = await supabase.from('ht_rooms').select('*').eq('id', roomId).single()
    if (!room || room.status !== 'revealing') return NextResponse.json({ error: 'Niet in raad-fase' }, { status: 400 })

    await supabase.from('ht_guesses').upsert({
      room_id: roomId,
      guesser_id: playerId,
      question_index: room.current_question,
      reveal_index: revealIndex ?? room.reveal_index,
      guessed_player_id: guessedPlayerId,
    }, { onConflict: 'room_id,guesser_id,question_index,reveal_index' })

    return NextResponse.json({ ok: true })
  }

  // ── next: volgende vraag of eindstand ─────────────────────────────────────
  if (action === 'next') {
    const { data: room } = await supabase.from('ht_rooms').select('*').eq('id', roomId).single()
    if (!room) return NextResponse.json({ error: 'Room niet gevonden' }, { status: 404 })
    if (room.host_player_id !== playerId) return NextResponse.json({ error: 'Alleen host' }, { status: 403 })

    const nextQ = room.current_question + 1
    if (nextQ >= room.total_questions) {
      await supabase.from('ht_rooms').update({ status: 'finished' }).eq('id', roomId)
    } else {
      await supabase.from('ht_rooms').update({
        status: 'voting',
        current_question: nextQ,
        reveal_index: 0,
      }).eq('id', roomId)
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Onbekende actie' }, { status: 400 })
}

// ── Score berekening ─────────────────────────────────────────────────────────
async function berekenEnUpdateScores(roomId: string, questionIndex: number) {
  const { data: votes } = await supabase
    .from('ht_votes')
    .select('player_id, vote')
    .eq('room_id', roomId)
    .eq('question_index', questionIndex)

  if (!votes || votes.length === 0) return

  const { data: guesses } = await supabase
    .from('ht_guesses')
    .select('guesser_id, guessed_player_id, reveal_index')
    .eq('room_id', roomId)
    .eq('question_index', questionIndex)

  // Sorteer votes op player_id voor consistente reveal volgorde
  const sorted = [...votes].sort((a, b) => a.player_id.localeCompare(b.player_id))

  // Punten per speler
  const scoreUpdate: Record<string, number> = {}

  sorted.forEach((vote, revIdx) => {
    const correcteGokkers = (guesses ?? []).filter(
      g => g.reveal_index === revIdx && g.guessed_player_id === vote.player_id && g.guesser_id !== vote.player_id
    )
    // Gokker krijgt +2 per correcte gok
    correcteGokkers.forEach(g => {
      scoreUpdate[g.guesser_id] = (scoreUpdate[g.guesser_id] ?? 0) + 2
    })
    // Speler die niemand raadde: +1 (mysterieus)
    if (correcteGokkers.length === 0) {
      scoreUpdate[vote.player_id] = (scoreUpdate[vote.player_id] ?? 0) + 1
    }
  })

  // Update scores
  await Promise.all(
    Object.entries(scoreUpdate).map(([playerId, pts]) =>
      supabase.rpc('ht_increment_score', { p_player_id: playerId, p_pts: pts })
    )
  )
}
