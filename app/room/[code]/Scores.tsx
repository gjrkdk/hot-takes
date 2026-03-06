'use client'

import { useState } from 'react'
import type { Room, Player, Vote } from '@/lib/supabase'
import { getVraag } from '@/lib/questions'

type Props = { room: Room; players: Player[]; votes: Vote[]; ikSpeler: Player; huidigVraag: string }

export function Scores({ room, players, votes, ikSpeler, huidigVraag }: Props) {
  const [laden, setLaden] = useState(false)
  const [stemmenOpen, setStemmenOpen] = useState(true)

  const gesorteerd = [...players].sort((a, b) => b.score - a.score)
  const isHost = ikSpeler.is_host
  const isLaatste = room.current_question + 1 >= room.total_questions

  // Votes voor huidige vraag, gesorteerd op naam
  const vraagVotes = votes
    .filter(v => v.question_index === room.current_question)
    .sort((a, b) => {
      const pa = players.find(p => p.id === a.player_id)?.name ?? ''
      const pb = players.find(p => p.id === b.player_id)?.name ?? ''
      return pa.localeCompare(pb)
    })

  async function volgende() {
    setLaden(true)
    await fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'next', roomId: room.id, playerId: ikSpeler.id }),
    })
    setLaden(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.5rem' }}>
            Na vraag {room.current_question + 1}
          </p>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, background: 'linear-gradient(135deg, #ff4d00, #ff9500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Scorebord
          </h2>
        </div>

        {/* Scores */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {gesorteerd.map((p, i) => {
            const isIk = p.id === ikSpeler.id
            const maxScore = gesorteerd[0]?.score ?? 1
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.875rem',
                padding: '0.875rem 1rem', borderRadius: '0.875rem',
                background: isIk ? 'rgba(255,149,0,0.1)' : 'rgba(255,255,255,0.04)',
                border: isIk ? '1px solid rgba(255,149,0,0.3)' : '1px solid rgba(255,255,255,0.06)',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${(p.score / Math.max(maxScore, 1)) * 100}%`,
                  background: i === 0 ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.03)',
                  borderRadius: '0.875rem', transition: 'width 0.5s ease',
                }} />
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: i === 0 ? '#ffd700' : 'rgba(255,255,255,0.3)', minWidth: 24, textAlign: 'center' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </span>
                <span style={{ fontSize: '1.5rem' }}>{p.color_emoji}</span>
                <span style={{ flex: 1, fontWeight: isIk ? 700 : 500, color: isIk ? '#ff9500' : '#f0f0f5' }}>
                  {p.name} {isIk && '(jij)'}
                </span>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f0f0f5' }}>{p.score}</span>
              </div>
            )
          })}
        </div>

        {/* Stemoverzicht deze vraag */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '0.875rem', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <button
            onClick={() => setStemmenOpen(o => !o)}
            style={{
              width: '100%', padding: '0.875rem 1rem', border: 'none', background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Wie stemde wat?
              </p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' }}>
                &ldquo;{huidigVraag}&rdquo;
              </p>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
              {stemmenOpen ? '▲' : '▼'}
            </span>
          </button>

          {stemmenOpen && (
            <div style={{ padding: '0 0.875rem 0.875rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {vraagVotes.map(v => {
                const speler = players.find(p => p.id === v.player_id)
                const isIk = v.player_id === ikSpeler.id
                return (
                  <div key={v.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.625rem',
                    padding: '0.5rem 0.625rem', borderRadius: '0.5rem',
                    background: isIk ? 'rgba(255,149,0,0.08)' : 'transparent',
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>{speler?.color_emoji}</span>
                    <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: isIk ? 700 : 500, color: isIk ? '#ff9500' : 'rgba(255,255,255,0.75)' }}>
                      {speler?.name} {isIk && '(jij)'}
                    </span>
                    <span style={{
                      padding: '0.2rem 0.625rem', borderRadius: '2rem', fontWeight: 700, fontSize: '0.8rem',
                      background: v.vote ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)',
                      color: v.vote ? '#22c55e' : '#ef4444',
                    }}>
                      {v.vote ? '👍 Eens' : '👎 Oneens'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {isHost ? (
          <button onClick={volgende} disabled={laden} style={{
            padding: '0.875rem', borderRadius: '0.75rem', border: 'none', fontFamily: 'inherit',
            fontSize: '1rem', fontWeight: 700, cursor: laden ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg, #ff4d00, #ff9500)', color: 'white',
            opacity: laden ? 0.7 : 1, boxShadow: '0 4px 20px rgba(255,100,0,0.3)',
          }}>
            {isLaatste ? '🏆 Eindstand bekijken' : '▶️ Volgende vraag'}
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
