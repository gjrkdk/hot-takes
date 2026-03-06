'use client'

import type { Room, Player, Vote } from '@/lib/supabase'

type Props = { room: Room; players: Player[]; votes: Vote[]; ikSpeler: Player; huidigVraag: string }

export function Finished({ players, votes, ikSpeler }: Props) {
  const gesorteerd = [...players].sort((a, b) => b.score - a.score)
  const winnaar = gesorteerd[0]

  // Bereken grappige labels per speler
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Confetti header */}
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

        {/* Opnieuw spelen */}
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
