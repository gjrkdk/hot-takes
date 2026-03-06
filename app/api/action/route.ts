import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, roomId, playerId, vote, guesses: guessList } = body

  // ── start: lobby → voting ────────────────────────────────────────────────
  if (action === 'start') {
    const { data: room } = await supabase.from('ht_rooms').select('*').eq('id', roomId).single()
    if (!room) return NextResponse.json({ error: 'Room niet gevonden' }, { status: 404 })
    if (room.host_player_id !== playerId) return NextResponse.json({ error: 'Alleen de host kan starten' }, { status: 403 })
    await supabase.from('ht_rooms').update({ status: 'voting', current_question: 0 }).eq('id', roomId)
    return NextResponse.json({ ok: true })
  }

  // ── vote: stem opslaan → als iedereen klaar: guessing ───────────────────
  if (action === 'vote') {
    const { data: room } = await supabase.from('ht_rooms').select('*').eq('id', roomId).single()
    if (!room || room.status !== 'voting') return NextResponse.json({ error: 'Niet in stemfase' }, { status: 400 })

    await supabase.from('ht_votes').upsert({
      room_id: roomId,
      player_id: playerId,
      question_index: room.current_question,
      vote,
    }, { onConflict: 'room_id,player_id,question_index' })

    const { data: players } = await supabase.from('ht_players').select('id').eq('room_id', roomId)
    const { data: votes } = await supabase.from('ht_votes').select('id')
      .eq('room_id', roomId).eq('question_index', room.current_question)

    if ((players?.length ?? 0) > 0 && votes?.length === players?.length) {
      await supabase.from('ht_rooms').update({ status: 'guessing' }).eq('id', roomId)
    }
    return NextResponse.json({ ok: true })
  }

  // ── submit_guesses: sla gokken op → als iedereen klaar: revealing ────────
  if (action === 'submit_guesses') {
    const { data: room } = await supabase.from('ht_rooms').select('*').eq('id', roomId).single()
    if (!room || room.status !== 'guessing') return NextResponse.json({ error: 'Niet in raad-fase' }, { status: 400 })

    // Sla alle gokken op in één keer
    await supabase.from('ht_guesses').upsert(
      guessList.map((g: { targetPlayerId: string; guessedVote: boolean }) => ({
        room_id: roomId,
        guesser_id: playerId,
        question_index: room.current_question,
        target_player_id: g.targetPlayerId,
        guessed_vote: g.guessedVote,
      })),
      { onConflict: 'room_id,guesser_id,question_index,target_player_id' }
    )

    // Check: heeft iedereen alle gokken ingediend?
    const { data: players } = await supabase.from('ht_players').select('id').eq('room_id', roomId)
    const n = players?.length ?? 0
    const expectedTotal = n * (n - 1) // elke speler raadt N-1 anderen

    const { data: allGuesses } = await supabase.from('ht_guesses').select('id')
      .eq('room_id', roomId).eq('question_index', room.current_question)

    if (n > 0 && (allGuesses?.length ?? 0) >= expectedTotal) {
      await berekenEnUpdateScores(roomId, room.current_question)
      await supabase.from('ht_rooms').update({ status: 'revealing' }).eq('id', roomId)
    }

    return NextResponse.json({ ok: true })
  }

  // ── reveal: revealing → scores (host klikt door) ─────────────────────────
  if (action === 'reveal') {
    const { data: room } = await supabase.from('ht_rooms').select('*').eq('id', roomId).single()
    if (!room) return NextResponse.json({ error: 'Room niet gevonden' }, { status: 404 })
    if (room.host_player_id !== playerId) return NextResponse.json({ error: 'Alleen host' }, { status: 403 })
    await supabase.from('ht_rooms').update({ status: 'scores' }).eq('id', roomId)
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
      await supabase.from('ht_rooms').update({ status: 'voting', current_question: nextQ }).eq('id', roomId)
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Onbekende actie' }, { status: 400 })
}

// ── Score berekening: +1 per correct geraden stem ────────────────────────────
async function berekenEnUpdateScores(roomId: string, questionIndex: number) {
  const { data: votes } = await supabase.from('ht_votes').select('player_id, vote')
    .eq('room_id', roomId).eq('question_index', questionIndex)
  const { data: guesses } = await supabase.from('ht_guesses')
    .select('guesser_id, target_player_id, guessed_vote')
    .eq('room_id', roomId).eq('question_index', questionIndex)

  if (!votes || !guesses) return

  const echteVotes = new Map(votes.map(v => [v.player_id, v.vote]))
  const scoreUpdate: Record<string, number> = {}

  for (const guess of guesses) {
    const echteVote = echteVotes.get(guess.target_player_id)
    if (echteVote === guess.guessed_vote) {
      scoreUpdate[guess.guesser_id] = (scoreUpdate[guess.guesser_id] ?? 0) + 1
    }
  }

  await Promise.all(
    Object.entries(scoreUpdate).map(([pid, pts]) =>
      supabase.rpc('ht_increment_score', { p_player_id: pid, p_pts: pts })
    )
  )
}
