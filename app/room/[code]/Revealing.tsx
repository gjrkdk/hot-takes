'use client'

import { useState, useEffect } from 'react'
import type { Room, Player, Vote } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

type Props = { room: Room; players: Player[]; votes: Vote[]; ikSpeler: Player; huidigVraag: string }
type Guess = { guesser_id: string; guessed_player_id: string; reveal_index: number }

export function Revealing({ room, players, votes, ikSpeler, huidigVraag }: Props) {
  const [guesses, setGuesses] = useState<Guess[]>([])
  const [mijnGok, setMijnGok] = useState<string | null>(null)
  const [laden, setLaden] = useState(false)

  const vraagVotes = votes
    .filter(v => v.question_index === room.current_question)
    .sort((a, b) => a.player_id.localeCompare(b.player_id))

  const currentRevealIndex = room.reveal_index
  const phase = room.reveal_phase ?? 'guess'
  const huidigeStem = vraagVotes[currentRevealIndex]
  const onthuldSpelerId = huidigeStem?.player_id
  const isHost = ikSpeler.is_host
  const isLaatsteOnthulling = currentRevealIndex >= vraagVotes.length - 1

  // Laad guesses
  useEffect(() => {
    async function laad() {
      const { data } = await supabase.from('ht_guesses').select('*')
        .eq('room_id', room.id).eq('question_index', room.current_question)
      setGuesses(data ?? [])
    }
    laad()

    const sub = supabase.channel(`guesses:${room.id}:${room.current_question}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ht_guesses', filter: `room_id=eq.${room.id}` },
        async () => {
          const { data } = await supabase.from('ht_guesses').select('*')
            .eq('room_id', room.id).eq('question_index', room.current_question)
          setGuesses(data ?? [])
        })
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [room.id, room.current_question])

  // Reset mijnGok bij nieuwe onthulling
  useEffect(() => { setMijnGok(null) }, [currentRevealIndex])

  // Gok-logica
  const heeftAlGeraden = guesses.some(g => g.guesser_id === ikSpeler.id && g.reveal_index === currentRevealIndex)
  const kanRaden = onthuldSpelerId !== ikSpeler.id && !heeftAlGeraden && phase === 'guess'

  // Aantal gokkers voor huidige reveal
  const aantalGokkers = guesses.filter(g => g.reveal_index === currentRevealIndex).length
  const nietOnthuldeSpelers = players.filter(p => p.id !== onthuldSpelerId)
  const maxGokkers = nietOnthuldeSpelers.length >= 2 ? nietOnthuldeSpelers.length : 0
  const iederheeftGeraden = maxGokkers === 0 || aantalGokkers >= maxGokkers

  async function gok(playerId: string) {
    if (!kanRaden || playerId === ikSpeler.id) return
    setMijnGok(playerId)
    await fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'guess',
        roomId: room.id,
        playerId: ikSpeler.id,
        guessedPlayerId: playerId,
        revealIndex: currentRevealIndex,
        questionIndex: room.current_question,
      }),
    })
  }

  async function onthulNaam() {
    setLaden(true)
    await fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reveal_name', roomId: room.id, playerId: ikSpeler.id }),
    })
    setLaden(false)
  }

  async function volgendeOnthulling() {
    setLaden(true)
    await fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reveal', roomId: room.id, playerId: ikSpeler.id }),
    })
    setLaden(false)
  }

  // Wie raadde goed voor de huidige onthulling?
  const correcteGokkers = guesses.filter(
    g => g.reveal_index === currentRevealIndex && g.guessed_player_id === onthuldSpelerId
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '1.5rem', maxWidth: 420, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.5rem' }}>
          Vraag {room.current_question + 1} · Onthulling {currentRevealIndex + 1}/{vraagVotes.length}
        </p>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#f0f0f5', lineHeight: 1.3 }}>{huidigVraag}</h2>
      </div>

      {/* Stemtotalen */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: '👍 Eens', count: vraagVotes.filter(v => v.vote).length, kleur: '#22c55e' },
          { label: '👎 Oneens', count: vraagVotes.filter(v => !v.vote).length, kleur: '#ef4444' },
        ].map(item => (
          <div key={item.label} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: '0.75rem', padding: '0.875rem', textAlign: 'center', border: `1px solid ${item.kleur}30` }}>
            <p style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: 800, color: item.kleur }}>{item.count}</p>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>{item.label}</p>
          </div>
        ))}
      </div>

      {/* Eerder onthulde stemmen (altijd met naam) */}
      {currentRevealIndex > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          {vraagVotes.slice(0, currentRevealIndex).map(vote => {
            const speler = players.find(p => p.id === vote.player_id)
            return (
              <div key={vote.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.625rem 0.875rem', borderRadius: '0.625rem',
                background: 'rgba(255,255,255,0.03)', border: '1px solid transparent', opacity: 0.6,
              }}>
                <span style={{ fontSize: '1.25rem' }}>{speler?.color_emoji}</span>
                <span style={{ flex: 1, fontWeight: 600, color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>{speler?.name}</span>
                <span style={{
                  padding: '0.25rem 0.625rem', borderRadius: '2rem', fontWeight: 700, fontSize: '0.8rem',
                  background: vote.vote ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                  color: vote.vote ? '#22c55e' : '#ef4444',
                }}>{vote.vote ? '👍' : '👎'}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Huidige stem — anoniem of onthuld */}
      <div style={{
        background: 'rgba(255,255,255,0.06)', borderRadius: '1rem',
        border: '1.5px solid rgba(255,255,255,0.12)',
        padding: '1.25rem', marginBottom: '1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Naam/anoniem */}
          <div style={{ flex: 1 }}>
            {phase === 'guess' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.25rem',
                }}>❓</div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Wie is dit?</p>
                  {maxGokkers > 0 && (
                    <p style={{ margin: '0.125rem 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
                      {aantalGokkers}/{maxGokkers} geraden
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '2rem' }}>{players.find(p => p.id === onthuldSpelerId)?.color_emoji}</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, color: '#f0f0f5', fontSize: '1.1rem' }}>
                    {players.find(p => p.id === onthuldSpelerId)?.name}
                  </p>
                  {correcteGokkers.length > 0 ? (
                    <p style={{ margin: '0.125rem 0 0', fontSize: '0.72rem', color: '#22c55e' }}>
                      ✓ {correcteGokkers.map(g => players.find(p => p.id === g.guesser_id)?.name).join(', ')} raadde{correcteGokkers.length === 1 ? '' : 'n'} het goed
                    </p>
                  ) : (
                    <p style={{ margin: '0.125rem 0 0', fontSize: '0.72rem', color: '#ff9500' }}>
                      😏 Niemand raadde het — +1 voor {players.find(p => p.id === onthuldSpelerId)?.name}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Stem badge */}
          <span style={{
            padding: '0.5rem 1rem', borderRadius: '2rem', fontWeight: 800, fontSize: '1rem',
            background: huidigeStem?.vote ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
            color: huidigeStem?.vote ? '#22c55e' : '#ef4444',
            whiteSpace: 'nowrap',
          }}>
            {huidigeStem?.vote ? '👍 Eens' : '👎 Oneens'}
          </span>
        </div>
      </div>

      {/* Gok-interface — alleen tijdens 'guess' fase, niet als jij de onthulde bent */}
      {phase === 'guess' && kanRaden && (
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ff9500', margin: '0 0 0.75rem', textAlign: 'center' }}>
            🤔 Van wie is deze stem?
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
            {players
              .filter(p => p.id !== onthuldSpelerId && p.id !== ikSpeler.id)
              .map(p => (
                <button key={p.id} onClick={() => gok(p.id)} disabled={!!mijnGok} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 0.875rem', borderRadius: '2rem',
                  border: mijnGok === p.id ? '2px solid #ff9500' : '1.5px solid rgba(255,255,255,0.15)',
                  background: mijnGok === p.id ? 'rgba(255,149,0,0.15)' : 'rgba(255,255,255,0.04)',
                  color: '#f0f0f5', cursor: mijnGok ? 'default' : 'pointer',
                  fontFamily: 'inherit', fontWeight: 600, fontSize: '0.875rem',
                  opacity: mijnGok && mijnGok !== p.id ? 0.4 : 1,
                }}>
                  {p.color_emoji} {p.name}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Bevestiging eigen gok */}
      {phase === 'guess' && heeftAlGeraden && onthuldSpelerId !== ikSpeler.id && (
        <p style={{ textAlign: 'center', color: '#22c55e', fontWeight: 600, fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          ✓ Gok verstuurd — wachten op de rest...
        </p>
      )}

      {/* Jij bent de onthulde speler */}
      {phase === 'guess' && onthuldSpelerId === ikSpeler.id && (
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem', marginBottom: '1.25rem', fontStyle: 'italic' }}>
          🫣 Ze raden jouw stem...
        </p>
      )}

      {/* HOST knoppen */}
      {isHost && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
          {phase === 'guess' && (
            <>
              {!iederheeftGeraden && maxGokkers > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {Array.from({ length: maxGokkers }).map((_, i) => (
                      <div key={i} style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: i < aantalGokkers ? '#22c55e' : 'rgba(255,255,255,0.15)',
                        transition: 'background 0.2s',
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                    {aantalGokkers}/{maxGokkers} geraden
                  </span>
                </div>
              )}
              <button
                onClick={onthulNaam}
                disabled={laden || !iederheeftGeraden}
                style={{
                  padding: '0.875rem', borderRadius: '0.75rem', border: 'none', fontFamily: 'inherit',
                  fontSize: '1rem', fontWeight: 700,
                  cursor: laden || !iederheeftGeraden ? 'not-allowed' : 'pointer',
                  background: iederheeftGeraden ? 'linear-gradient(135deg, #ff4d00, #ff9500)' : 'rgba(255,255,255,0.08)',
                  color: iederheeftGeraden ? 'white' : 'rgba(255,255,255,0.3)',
                  opacity: laden ? 0.7 : 1,
                  boxShadow: iederheeftGeraden ? '0 4px 20px rgba(255,100,0,0.3)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {!iederheeftGeraden ? '⏳ Wachten op gokken...' : '🔍 Onthul naam'}
              </button>
            </>
          )}

          {phase === 'name' && (
            <button
              onClick={volgendeOnthulling}
              disabled={laden}
              style={{
                padding: '0.875rem', borderRadius: '0.75rem', border: 'none', fontFamily: 'inherit',
                fontSize: '1rem', fontWeight: 700, cursor: laden ? 'not-allowed' : 'pointer',
                background: 'linear-gradient(135deg, #ff4d00, #ff9500)', color: 'white',
                opacity: laden ? 0.7 : 1, boxShadow: '0 4px 20px rgba(255,100,0,0.3)',
              }}
            >
              {isLaatsteOnthulling ? '📊 Scores bekijken' : '➡️ Volgende onthulling'}
            </button>
          )}
        </div>
      )}

      {/* Niet-host */}
      {!isHost && (
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem', marginTop: 'auto' }}>
          {phase === 'guess' ? 'Wachten tot iedereen heeft geraden...' : 'Wachten op de host...'}
        </p>
      )}
    </div>
  )
}
