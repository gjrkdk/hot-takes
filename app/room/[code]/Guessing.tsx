'use client'

import { useState, useEffect } from 'react'
import type { Room, Player, Vote } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

type Props = { room: Room; players: Player[]; votes: Vote[]; ikSpeler: Player; huidigVraag: string }

export function Guessing({ room, players, votes, ikSpeler, huidigVraag }: Props) {
  const [mijnGokken, setMijnGokken] = useState<Map<string, boolean>>(new Map())
  const [ingediend, setIngediend] = useState(false)
  const [laden, setLaden] = useState(false)
  const [aantalKlaar, setAantalKlaar] = useState(0)

  const anderenSpelers = players.filter(p => p.id !== ikSpeler.id)
  const allesGeraden = mijnGokken.size === anderenSpelers.length

  // Realtime: hoeveel spelers hebben al alle gokken ingediend?
  useEffect(() => {
    async function laad() {
      const { data } = await supabase
        .from('ht_guesses')
        .select('guesser_id')
        .eq('room_id', room.id)
        .eq('question_index', room.current_question)

      const n = players.length
      const verwacht = n - 1
      const telPerGuesser: Record<string, number> = {}
      data?.forEach(g => {
        telPerGuesser[g.guesser_id] = (telPerGuesser[g.guesser_id] ?? 0) + 1
      })
      const klaar = Object.values(telPerGuesser).filter(c => c >= verwacht).length
      setAantalKlaar(klaar)
    }
    laad()

    const sub = supabase.channel(`guessing:${room.id}:${room.current_question}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ht_guesses', filter: `room_id=eq.${room.id}` },
        () => laad())
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [room.id, room.current_question, players.length])

  function toggleGok(playerId: string, keuze: boolean) {
    if (ingediend) return
    setMijnGokken(prev => new Map(prev).set(playerId, keuze))
  }

  async function indienen() {
    if (!allesGeraden || laden) return
    setLaden(true)

    await fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit_guesses',
        roomId: room.id,
        playerId: ikSpeler.id,
        guesses: Array.from(mijnGokken.entries()).map(([targetPlayerId, guessedVote]) => ({
          targetPlayerId,
          guessedVote,
        })),
      }),
    })

    setIngediend(true)
    setLaden(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '1.5rem', maxWidth: 420, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.5rem' }}>
          Vraag {room.current_question + 1} · Raden
        </p>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.375rem', color: '#f0f0f5', lineHeight: 1.3 }}>
          {huidigVraag}
        </h2>
        {!ingediend && (
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
            Wat denk jij dat iedereen heeft gestemd?
          </p>
        )}
      </div>

      {/* Gok-interface */}
      {!ingediend ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
          {anderenSpelers.map(speler => {
            const gok = mijnGokken.get(speler.id)
            return (
              <div key={speler.id} style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: '0.875rem',
                border: gok !== undefined ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid rgba(255,255,255,0.06)',
                padding: '0.875rem', transition: 'border-color 0.15s',
              }}>
                {/* Naam */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
                  <span style={{ fontSize: '1.375rem' }}>{speler.color_emoji}</span>
                  <span style={{ fontWeight: 700, color: '#f0f0f5' }}>{speler.name}</span>
                  {gok !== undefined && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#22c55e', fontWeight: 700 }}>✓</span>
                  )}
                </div>

                {/* Knoppen */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => toggleGok(speler.id, false)} style={{
                    flex: 1, padding: '0.625rem 0.5rem', borderRadius: '0.625rem', fontFamily: 'inherit',
                    border: gok === false ? '2px solid #ef4444' : '1.5px solid rgba(239,68,68,0.25)',
                    background: gok === false ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.05)',
                    color: gok === false ? '#ef4444' : 'rgba(239,68,68,0.5)',
                    fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    👎 Oneens
                  </button>
                  <button onClick={() => toggleGok(speler.id, true)} style={{
                    flex: 1, padding: '0.625rem 0.5rem', borderRadius: '0.625rem', fontFamily: 'inherit',
                    border: gok === true ? '2px solid #22c55e' : '1.5px solid rgba(34,197,94,0.25)',
                    background: gok === true ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.05)',
                    color: gok === true ? '#22c55e' : 'rgba(34,197,94,0.5)',
                    fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    👍 Eens
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Wachten */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '3rem' }}>✅</div>
          <p style={{ fontWeight: 700, color: '#22c55e', fontSize: '1.1rem', margin: 0 }}>Ingediend!</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', margin: 0, textAlign: 'center' }}>
            Wachten op {players.length - aantalKlaar} andere speler{players.length - aantalKlaar !== 1 ? 's' : ''}...
          </p>
          <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem' }}>
            {players.map((_, i) => (
              <div key={i} style={{
                width: 10, height: 10, borderRadius: '50%',
                background: i < aantalKlaar ? '#22c55e' : 'rgba(255,255,255,0.15)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Submit */}
      {!ingediend && (
        <button onClick={indienen} disabled={!allesGeraden || laden} style={{
          marginTop: '1.25rem', padding: '0.875rem', borderRadius: '0.75rem', border: 'none',
          fontFamily: 'inherit', fontSize: '1rem', fontWeight: 700,
          cursor: !allesGeraden || laden ? 'not-allowed' : 'pointer',
          background: allesGeraden ? 'linear-gradient(135deg, #ff4d00, #ff9500)' : 'rgba(255,255,255,0.08)',
          color: allesGeraden ? 'white' : 'rgba(255,255,255,0.3)',
          opacity: laden ? 0.7 : 1,
          boxShadow: allesGeraden ? '0 4px 20px rgba(255,100,0,0.3)' : 'none',
          transition: 'all 0.2s',
        }}>
          {!allesGeraden
            ? `Nog ${anderenSpelers.length - mijnGokken.size} te raden...`
            : laden ? '⏳ Indienen...' : '✅ Indienen'}
        </button>
      )}
    </div>
  )
}
