'use client'

import { useEffect, useState, use } from 'react'
import { supabase, type Room, type Player, type Vote } from '@/lib/supabase'
import { getVraag } from '@/lib/questions'
import { Lobby } from './Lobby'
import { Voting } from './Voting'
import { Guessing } from './Guessing'
import { Revealing } from './Revealing'
import { Scores } from './Scores'
import { Finished } from './Finished'

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [votes, setVotes] = useState<Vote[]>([])
  const [ikSpeler, setIkSpeler] = useState<Player | null>(null)
  const [laden, setLaden] = useState(true)
  const [fout, setFout] = useState('')

  // Laad spelerdata uit localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`ht_player_${code}`)
    if (stored) {
      try { setIkSpeler(JSON.parse(stored)) } catch { /**/ }
    }
  }, [code])

  // Laad initiële data
  useEffect(() => {
    async function laad() {
      const { data: roomData } = await supabase.from('ht_rooms').select('*').eq('code', code).single()
      if (!roomData) { setFout('Room niet gevonden'); setLaden(false); return }
      setRoom(roomData)

      const { data: playerData } = await supabase.from('ht_players').select('*').eq('room_id', roomData.id).order('joined_at')
      setPlayers(playerData ?? [])

      const { data: voteData } = await supabase.from('ht_votes').select('*').eq('room_id', roomData.id)
      setVotes(voteData ?? [])

      setLaden(false)
    }
    laad()
  }, [code])

  // Realtime subscriptions
  useEffect(() => {
    if (!room) return

    const roomSub = supabase.channel(`room:${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ht_rooms', filter: `id=eq.${room.id}` },
        payload => setRoom(payload.new as Room))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ht_players', filter: `room_id=eq.${room.id}` },
        async () => {
          const { data } = await supabase.from('ht_players').select('*').eq('room_id', room.id).order('joined_at')
          setPlayers(data ?? [])
          // Update eigen speler (score etc.)
          const stored = localStorage.getItem(`ht_player_${code}`)
          if (stored) {
            const me = JSON.parse(stored) as Player
            const updated = data?.find(p => p.id === me.id)
            if (updated) setIkSpeler(updated)
          }
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ht_votes', filter: `room_id=eq.${room.id}` },
        async () => {
          const { data } = await supabase.from('ht_votes').select('*').eq('room_id', room.id)
          setVotes(data ?? [])
        })
      .subscribe()

    return () => { supabase.removeChannel(roomSub) }
  }, [room?.id, code])

  if (laden) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', animation: 'spin 1s linear infinite' }}>🔥</div>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '1rem' }}>Laden...</p>
      </div>
    </div>
  )

  if (fout) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <div style={{ fontSize: '3rem' }}>😕</div>
      <p style={{ color: '#ff6060' }}>{fout}</p>
      <a href="/" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>← Terug naar home</a>
    </div>
  )

  if (!room || !ikSpeler) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <p style={{ color: 'rgba(255,255,255,0.5)' }}>Sessie verlopen. <a href="/" style={{ color: '#ff6500' }}>Start opnieuw</a></p>
    </div>
  )

  const huidigVraag = getVraag(room.pack_id, room.current_question)
  const props = { room, players, votes, ikSpeler, huidigVraag }

  return (
    <div style={{ minHeight: '100vh' }}>
      {room.status === 'lobby' && <Lobby {...props} />}
      {room.status === 'voting' && <Voting {...props} />}
      {room.status === 'guessing' && <Guessing {...props} />}
      {room.status === 'revealing' && <Revealing {...props} />}
      {room.status === 'scores' && <Scores {...props} />}
      {room.status === 'finished' && <Finished {...props} />}
    </div>
  )
}
