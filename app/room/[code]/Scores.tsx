'use client'

import { useState } from 'react'
import type { Room, Player, Vote } from '@/lib/supabase'

type Props = { room: Room; players: Player[]; votes: Vote[]; ikSpeler: Player; huidigVraag: string }

export function Scores({ room, players, votes, ikSpeler }: Props) {
  const [laden, setLaden] = useState(false)

  const gesorteerd = [...players].sort((a, b) => b.score - a.score)
  const isHost = ikSpeler.is_host
  const isLaatste = room.current_question + 1 >= room.total_questions

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
                {/* Achtergrond balk */}
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
