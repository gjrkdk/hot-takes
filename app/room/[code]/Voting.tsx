'use client'

import { useState, useEffect } from 'react'
import type { Room, Player, Vote } from '@/lib/supabase'

type Props = { room: Room; players: Player[]; votes: Vote[]; ikSpeler: Player; huidigVraag: string }

const TIMER_SEC = 30

export function Voting({ room, players, votes, ikSpeler, huidigVraag }: Props) {
  const [timer, setTimer] = useState(TIMER_SEC)
  const [gestemd, setGestemd] = useState(false)
  const [gekozen, setGekozen] = useState<boolean | null>(null)

  const mijnStem = votes.find(v => v.player_id === ikSpeler.id && v.question_index === room.current_question)
  const heeftGestemd = !!mijnStem || gestemd
  const aantalStemmen = votes.filter(v => v.question_index === room.current_question).length

  // Timer
  useEffect(() => {
    setTimer(TIMER_SEC)
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [room.current_question])

  async function stem(keuze: boolean) {
    if (heeftGestemd) return
    setGekozen(keuze)
    setGestemd(true)
    await fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'vote',
        roomId: room.id,
        playerId: ikSpeler.id,
        vote: keuze,
      }),
    })
  }

  const timerPct = (timer / TIMER_SEC) * 100
  const timerKleur = timer > 15 ? '#22c55e' : timer > 7 ? '#eab308' : '#ef4444'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
      {/* Progress header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
          VRAAG {room.current_question + 1} / {room.total_questions}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: `conic-gradient(${timerKleur} ${timerPct}%, rgba(255,255,255,0.1) 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: timerKleur }}>{timer}</span>
          </div>
        </div>
      </div>

      {/* Voortgangsbalk */}
      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, marginBottom: '2rem', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${((room.current_question) / room.total_questions) * 100}%`, background: 'linear-gradient(90deg, #ff4d00, #ff9500)', borderRadius: 99, transition: 'width 0.3s' }} />
      </div>

      {/* Stelling */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2.5rem', maxWidth: 420, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 1rem' }}>Stelling</p>
          <h2 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 800, lineHeight: 1.25, margin: 0, color: '#f0f0f5', letterSpacing: '-0.02em' }}>
            {huidigVraag}
          </h2>
        </div>

        {/* Stemknoppen */}
        {!heeftGestemd ? (
          <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
            <button onClick={() => stem(false)} style={{
              flex: 1, padding: '1.25rem', borderRadius: '1rem', border: '2px solid rgba(239,68,68,0.4)',
              background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '1.5rem', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 700, transition: 'all 0.15s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem',
            }}>
              <span>👎</span>
              <span style={{ fontSize: '0.875rem' }}>Oneens</span>
            </button>
            <button onClick={() => stem(true)} style={{
              flex: 1, padding: '1.25rem', borderRadius: '1rem', border: '2px solid rgba(34,197,94,0.4)',
              background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: '1.5rem', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 700, transition: 'all 0.15s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem',
            }}>
              <span>👍</span>
              <span style={{ fontSize: '0.875rem' }}>Eens</span>
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>{gekozen ? '👍' : '👎'}</div>
            <p style={{ fontWeight: 700, color: gekozen ? '#22c55e' : '#ef4444', margin: '0 0 0.25rem', fontSize: '1.1rem' }}>
              {gekozen ? 'Eens!' : 'Oneens!'}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', margin: 0 }}>
              Jouw stem is opgeslagen
            </p>
          </div>
        )}

        {/* Wie heeft al gestemd */}
        <div style={{ width: '100%' }}>
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem', textAlign: 'center' }}>
            {aantalStemmen} / {players.length} gestemd
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {players.map(p => {
              const heeftP = votes.some(v => v.player_id === p.id && v.question_index === room.current_question)
              return (
                <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', opacity: heeftP ? 1 : 0.3, transition: 'opacity 0.3s' }}>
                  <span style={{ fontSize: '1.5rem' }}>{p.color_emoji}</span>
                  <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)' }}>{heeftP ? '✓' : '...'}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
