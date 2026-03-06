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
  const onthuld = vraagVotes.slice(0, currentRevealIndex + 1)
  const huidigStem = vraagVotes[currentRevealIndex]
  const isHost = ikSpeler.is_host

  // Laad guesses
  useEffect(() => {
    async function laad() {
      const { data } = await supabase.from('ht_guesses').select('*')
        .eq('room_id', room.id).eq('question_index', room.current_question)
      setGuesses(data ?? [])
    }
    laad()

    const sub = supabase.channel(`guesses:${room.id}`)
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

  const heeftAlGeraden = guesses.some(g => g.guesser_id === ikSpeler.id && g.reveal_index === currentRevealIndex)

  async function gok(playerId: string) {
    if (heeftAlGeraden || playerId === ikSpeler.id || huidigStem?.player_id === ikSpeler.id) return
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

  async function onthulVolgende() {
    setLaden(true)
    await fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reveal', roomId: room.id, playerId: ikSpeler.id }),
    })
    setLaden(false)
  }

  // Hoeveel hebben al geraden voor de huidige onthulling?
  const aantalGokkers = guesses.filter(g => g.reveal_index === currentRevealIndex).length
  // Alleen spelers die ook écht iemand kunnen raden (niet zichzelf, niet de onthuld speler)
  // Met 2 spelers heeft niemand een keuze → maxGokkers = 0, knop meteen actief
  const nietOnthuldeSpelers = players.filter(p => p.id !== huidigStem?.player_id)
  const maxGokkers = nietOnthuldeSpelers.length >= 2 ? nietOnthuldeSpelers.length : 0
  const iederheeftGeraden = maxGokkers === 0 || aantalGokkers >= maxGokkers
  const isLaatsteOnthulling = currentRevealIndex >= vraagVotes.length - 1

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '1.5rem', maxWidth: 420, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.5rem' }}>
          Vraag {room.current_question + 1} · Onthulling
        </p>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#f0f0f5', lineHeight: 1.3 }}>{huidigVraag}</h2>
      </div>

      {/* Resultaat totalen */}
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

      {/* Onthulde stemmen */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
          Wie stemde wat?
        </p>

        {onthuld.map((vote, idx) => {
          const speler = players.find(p => p.id === vote.player_id)
          const isHuidige = idx === currentRevealIndex
          return (
            <div key={vote.id} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.875rem', borderRadius: '0.75rem',
              background: isHuidige ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
              border: isHuidige ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
              animation: isHuidige ? 'fadeIn 0.3s ease' : 'none',
            }}>
              <span style={{ fontSize: '1.75rem' }}>{speler?.color_emoji ?? '❓'}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, color: '#f0f0f5' }}>{speler?.name ?? '?'}</p>
                {isHuidige && maxGokkers > 0 && <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                  {aantalGokkers}/{maxGokkers} hebben geraden
                </p>}
              </div>
              <span style={{
                padding: '0.375rem 0.875rem', borderRadius: '2rem', fontWeight: 700, fontSize: '0.875rem',
                background: vote.vote ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                color: vote.vote ? '#22c55e' : '#ef4444',
              }}>
                {vote.vote ? '👍 Eens' : '👎 Oneens'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Raad-interface: toon als jij niet degene bent die onthuld wordt */}
      {huidigStem && huidigStem.player_id !== ikSpeler.id && !heeftAlGeraden && (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ff9500', margin: '0 0 0.75rem', textAlign: 'center' }}>
            🤔 Van wie is deze stem?
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
            {players
              .filter(p => p.id !== huidigStem.player_id && p.id !== ikSpeler.id)
              .map(p => (
                <button key={p.id} onClick={() => gok(p.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 0.875rem', borderRadius: '2rem',
                  border: mijnGok === p.id ? '2px solid #ff9500' : '1.5px solid rgba(255,255,255,0.15)',
                  background: mijnGok === p.id ? 'rgba(255,149,0,0.15)' : 'rgba(255,255,255,0.04)',
                  color: '#f0f0f5', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.875rem',
                }}>
                  {p.color_emoji} {p.name}
                </button>
              ))}
          </div>
        </div>
      )}

      {heeftAlGeraden && huidigStem?.player_id !== ikSpeler.id && (
        <p style={{ textAlign: 'center', color: '#22c55e', fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem' }}>
          ✓ Gok verstuurd!
        </p>
      )}

      {/* Host: onthul volgende knop */}
      {isHost && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {!iederheeftGeraden && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
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
            onClick={onthulVolgende}
            disabled={laden || !iederheeftGeraden}
            style={{
              padding: '0.875rem', borderRadius: '0.75rem', border: 'none', fontFamily: 'inherit',
              fontSize: '1rem', fontWeight: 700,
              cursor: laden || !iederheeftGeraden ? 'not-allowed' : 'pointer',
              background: iederheeftGeraden
                ? 'linear-gradient(135deg, #ff4d00, #ff9500)'
                : 'rgba(255,255,255,0.08)',
              color: iederheeftGeraden ? 'white' : 'rgba(255,255,255,0.3)',
              opacity: laden ? 0.7 : 1,
              boxShadow: iederheeftGeraden ? '0 4px 20px rgba(255,100,0,0.3)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {!iederheeftGeraden
              ? '⏳ Wachten op gokken...'
              : isLaatsteOnthulling
                ? '📊 Scores bekijken'
                : '➡️ Volgende onthulling'}
          </button>
        </div>
      )}
      {!isHost && (
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' }}>
          Wachten op de host...
        </p>
      )}
    </div>
  )
}
