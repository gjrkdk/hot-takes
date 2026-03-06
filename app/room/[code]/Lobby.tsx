'use client'

import { useState } from 'react'
import type { Room, Player, Vote } from '@/lib/supabase'

type Props = { room: Room; players: Player[]; votes: Vote[]; ikSpeler: Player; huidigVraag: string }

export function Lobby({ room, players, ikSpeler }: Props) {
  const [laden, setLaden] = useState(false)
  const isHost = ikSpeler.is_host

  async function start() {
    setLaden(true)
    await fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', roomId: room.id, playerId: ikSpeler.id }),
    })
    setLaden(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔥</div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, background: 'linear-gradient(135deg, #ff4d00, #ff9500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Hot Takes
          </h1>
          <p style={{ margin: '0.5rem 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
            Lobby · Wachten op spelers...
          </p>
        </div>

        {/* Room code */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.08)', padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Room code</p>
          <p style={{ margin: 0, fontSize: '3rem', fontWeight: 900, letterSpacing: '0.25em', color: '#ff9500' }}>{room.code}</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>
            Deel deze code met je vrienden
          </p>
        </div>

        {/* Spelers */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.08)', padding: '1.25rem' }}>
          <p style={{ margin: '0 0 0.875rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Spelers ({players.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {players.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: p.id === ikSpeler.id ? 'rgba(255,255,255,0.08)' : 'transparent' }}>
                <span style={{ fontSize: '1.5rem' }}>{p.color_emoji}</span>
                <span style={{ fontWeight: p.id === ikSpeler.id ? 700 : 500, color: p.id === ikSpeler.id ? '#f0f0f5' : 'rgba(255,255,255,0.7)' }}>
                  {p.name}
                </span>
                {p.is_host && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', background: 'rgba(255,149,0,0.2)', color: '#ff9500', padding: '0.15rem 0.5rem', borderRadius: '2rem', fontWeight: 700 }}>HOST</span>}
                {p.id === ikSpeler.id && !p.is_host && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>jij</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Start knop (alleen host) */}
        {isHost ? (
          <button onClick={start} disabled={players.length < 2 || laden} style={{
            padding: '1rem', borderRadius: '0.75rem', border: 'none', fontFamily: 'inherit',
            fontSize: '1rem', fontWeight: 700, cursor: players.length < 2 ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg, #ff4d00, #ff9500)',
            color: 'white', opacity: players.length < 2 || laden ? 0.5 : 1,
            boxShadow: '0 4px 20px rgba(255,100,0,0.4)',
          }}>
            {players.length < 2 ? 'Wachten op meer spelers...' : laden ? '⏳ Starten...' : '🚀 Spel starten!'}
          </button>
        ) : (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem' }}>
            Wachten tot de host het spel start...
          </p>
        )}
      </div>
    </div>
  )
}
