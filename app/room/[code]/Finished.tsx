'use client'

import { useState } from 'react'
import type { Room, Player, Vote } from '@/lib/supabase'
import { getVraag } from '@/lib/questions'

type Props = { room: Room; players: Player[]; votes: Vote[]; ikSpeler: Player; huidigVraag: string }

export function Finished({ room, players, votes, ikSpeler }: Props) {
  const [gridOpen, setGridOpen] = useState(false)

  const gesorteerd = [...players].sort((a, b) => b.score - a.score)
  const winnaar = gesorteerd[0]

  function getLabel(player: Player): { emoji: string; label: string } {
    const mijnStemmen = votes.filter(v => v.player_id === player.id)
    const totaal = mijnStemmen.length
    if (totaal === 0) return { emoji: '👻', label: 'Spookverschijning' }
    const eens = mijnStemmen.filter(v => v.vote).length
    const ratio = eens / totaal
    if (ratio >= 0.8) return { emoji: '😇', label: 'Eeuwige optimist' }
    if (ratio <= 0.2) return { emoji: '😤', label: 'Notoire dwarsligger' }
    if (ratio >= 0.4 && ratio <= 0.6) return { emoji: '⚖️', label: 'Eeuwige twijfelaar' }
    if (player.score === gesorteerd[0]?.score) return { emoji: '🔮', label: 'Gedachtelezer' }
    if (player.score === gesorteerd[gesorteerd.length - 1]?.score) return { emoji: '🕵️', label: 'Meest mysterieus' }
    return { emoji: '🌶️', label: 'Hot take specialist' }
  }

  const aantalVragen = room.total_questions

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🏆</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: '0 0 0.375rem', background: 'linear-gradient(135deg, #ffd700, #ff9500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Eindstand!
          </h1>
          {winnaar && (
            <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '1rem' }}>
              {winnaar.color_emoji} <strong style={{ color: '#ffd700' }}>{winnaar.name}</strong> wint met {winnaar.score} punten!
            </p>
          )}
        </div>

        {/* Eindscores */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {gesorteerd.map((p, i) => {
            const { emoji, label } = getLabel(p)
            const isIk = p.id === ikSpeler.id
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.875rem 1rem', borderRadius: '0.875rem',
                background: i === 0 ? 'rgba(255,215,0,0.08)' : isIk ? 'rgba(255,149,0,0.08)' : 'rgba(255,255,255,0.04)',
                border: i === 0 ? '1px solid rgba(255,215,0,0.25)' : isIk ? '1px solid rgba(255,149,0,0.2)' : '1px solid rgba(255,255,255,0.06)',
              }}>
                <span style={{ fontSize: '1.25rem', minWidth: 28, textAlign: 'center' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </span>
                <span style={{ fontSize: '1.375rem' }}>{p.color_emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, color: i === 0 ? '#ffd700' : isIk ? '#ff9500' : '#f0f0f5', fontSize: '0.95rem' }}>
                    {p.name} {isIk && '(jij)'}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                    {emoji} {label}
                  </p>
                </div>
                <span style={{ fontWeight: 800, fontSize: '1.125rem', color: i === 0 ? '#ffd700' : '#f0f0f5' }}>
                  {p.score}
                </span>
              </div>
            )
          })}
        </div>

        {/* Alle stemmen grid */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '0.875rem', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <button
            onClick={() => setGridOpen(o => !o)}
            style={{
              width: '100%', padding: '0.875rem 1rem', border: 'none', background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              📊 Alle stemmen bekijken
            </p>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
              {gridOpen ? '▲' : '▼'}
            </span>
          </button>

          {gridOpen && (
            <div style={{ padding: '0 0.875rem 1rem', overflowX: 'auto' }}>
              {Array.from({ length: aantalVragen }).map((_, qi) => {
                const vraag = getVraag(room.pack_id, qi)
                const vraagVotes = votes.filter(v => v.question_index === qi)
                if (vraagVotes.length === 0) return null

                // Splits eens / oneens
                const eensSpelers = players.filter(p => vraagVotes.find(v => v.player_id === p.id && v.vote === true))
                const oneensSpelers = players.filter(p => vraagVotes.find(v => v.player_id === p.id && v.vote === false))

                return (
                  <div key={qi} style={{ marginBottom: qi < aantalVragen - 1 ? '1.25rem' : 0 }}>
                    {/* Vraag */}
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                      <span style={{ color: '#ff9500', fontStyle: 'normal', fontWeight: 700 }}>V{qi + 1}:</span> {vraag}
                    </p>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {/* Eens */}
                      <div style={{ flex: 1, background: 'rgba(34,197,94,0.08)', borderRadius: '0.5rem', padding: '0.5rem', border: '1px solid rgba(34,197,94,0.15)' }}>
                        <p style={{ margin: '0 0 0.375rem', fontSize: '0.72rem', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          👍 Eens ({eensSpelers.length})
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          {eensSpelers.length === 0
                            ? <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>—</p>
                            : eensSpelers.map(p => (
                              <p key={p.id} style={{ margin: 0, fontSize: '0.8rem', color: p.id === ikSpeler.id ? '#ff9500' : 'rgba(255,255,255,0.7)', fontWeight: p.id === ikSpeler.id ? 700 : 500 }}>
                                {p.color_emoji} {p.name}
                              </p>
                            ))
                          }
                        </div>
                      </div>

                      {/* Oneens */}
                      <div style={{ flex: 1, background: 'rgba(239,68,68,0.08)', borderRadius: '0.5rem', padding: '0.5rem', border: '1px solid rgba(239,68,68,0.15)' }}>
                        <p style={{ margin: '0 0 0.375rem', fontSize: '0.72rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          👎 Oneens ({oneensSpelers.length})
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          {oneensSpelers.length === 0
                            ? <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>—</p>
                            : oneensSpelers.map(p => (
                              <p key={p.id} style={{ margin: 0, fontSize: '0.8rem', color: p.id === ikSpeler.id ? '#ff9500' : 'rgba(255,255,255,0.7)', fontWeight: p.id === ikSpeler.id ? 700 : 500 }}>
                                {p.color_emoji} {p.name}
                              </p>
                            ))
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Opnieuw */}
        <a href="/" style={{
          display: 'block', padding: '0.875rem', borderRadius: '0.75rem', textAlign: 'center',
          background: 'linear-gradient(135deg, #ff4d00, #ff9500)', color: 'white',
          fontWeight: 700, fontSize: '1rem', textDecoration: 'none',
          boxShadow: '0 4px 20px rgba(255,100,0,0.3)',
        }}>
          🔥 Nog een ronde!
        </a>
      </div>
    </div>
  )
}
