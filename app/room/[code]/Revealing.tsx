'use client'

import { useState, useEffect } from 'react'
import type { Room, Player, Vote } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

type Props = { room: Room; players: Player[]; votes: Vote[]; ikSpeler: Player; huidigVraag: string }
type Guess = { guesser_id: string; target_player_id: string; guessed_vote: boolean }

export function Revealing({ room, players, votes, ikSpeler, huidigVraag }: Props) {
  const [guesses, setGuesses] = useState<Guess[]>([])
  const [laden, setLaden] = useState(false)
  const isHost = ikSpeler.is_host

  const vraagVotes = votes.filter(v => v.question_index === room.current_question)
  const mijnGokken = guesses.filter(g => g.guesser_id === ikSpeler.id)

  // Score deze ronde
  const aantalGoed = mijnGokken.filter(g => {
    const echte = vraagVotes.find(v => v.player_id === g.target_player_id)
    return echte?.vote === g.guessed_vote
  }).length
  const maxGoed = players.length - 1

  useEffect(() => {
    async function laad() {
      const { data } = await supabase.from('ht_guesses').select('*')
        .eq('room_id', room.id).eq('question_index', room.current_question)
      setGuesses(data ?? [])
    }
    laad()
  }, [room.id, room.current_question])

  async function naarScores() {
    setLaden(true)
    await fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reveal', roomId: room.id, playerId: ikSpeler.id }),
    })
    setLaden(false)
  }

  const gesorteerdeAnderen = [...players]
    .filter(p => p.id !== ikSpeler.id)
    .sort((a, b) => a.name.localeCompare(b.name))

  const alleGoed = aantalGoed === maxGoed

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '1.5rem', maxWidth: 420, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.5rem' }}>
          Vraag {room.current_question + 1} · Resultaat
        </p>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#f0f0f5', lineHeight: 1.3 }}>
          {huidigVraag}
        </h2>
      </div>

      {/* Eigen score deze ronde */}
      <div style={{
        background: alleGoed ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${alleGoed ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '1rem', padding: '1rem', textAlign: 'center', marginBottom: '1.25rem',
      }}>
        <p style={{ margin: '0 0 0.25rem', fontSize: '2.25rem', fontWeight: 900, color: alleGoed ? '#ffd700' : '#f0f0f5' }}>
          {aantalGoed}/{maxGoed}
        </p>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>
          {alleGoed ? '🎯 Perfect! Alles goed geraden!' : `${aantalGoed} correct geraden`}
        </p>
      </div>

      {/* Per speler: echte stem + jouw gok + ✅/❌ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', flex: 1 }}>
        {gesorteerdeAnderen.map(speler => {
          const echteVote = vraagVotes.find(v => v.player_id === speler.id)
          const mijnGok = mijnGokken.find(g => g.target_player_id === speler.id)
          const isGoed = mijnGok?.guessed_vote === echteVote?.vote

          return (
            <div key={speler.id} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 0.875rem', borderRadius: '0.75rem',
              background: isGoed ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${isGoed ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}>
              <span style={{ fontSize: '1.5rem' }}>{speler.color_emoji}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, color: '#f0f0f5', fontSize: '0.95rem' }}>{speler.name}</p>
                <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
                  Jouw gok: {mijnGok !== undefined ? (mijnGok.guessed_vote ? '👍 Eens' : '👎 Oneens') : '–'}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                <span style={{
                  padding: '0.25rem 0.625rem', borderRadius: '2rem', fontWeight: 700, fontSize: '0.8rem',
                  background: echteVote?.vote ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                  color: echteVote?.vote ? '#22c55e' : '#ef4444',
                }}>
                  {echteVote?.vote ? '👍 Eens' : '👎 Oneens'}
                </span>
                <span style={{ fontSize: '1.1rem' }}>{isGoed ? '✅' : '❌'}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Knop */}
      <div style={{ marginTop: '1.25rem' }}>
        {isHost ? (
          <button onClick={naarScores} disabled={laden} style={{
            width: '100%', padding: '0.875rem', borderRadius: '0.75rem', border: 'none',
            fontFamily: 'inherit', fontSize: '1rem', fontWeight: 700,
            cursor: laden ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg, #ff4d00, #ff9500)', color: 'white',
            opacity: laden ? 0.7 : 1, boxShadow: '0 4px 20px rgba(255,100,0,0.3)',
          }}>
            📊 Scores bekijken
          </button>
        ) : (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' }}>
            Wachten op de host...
          </p>
        )}
      </div>
    </div>
  )
}
