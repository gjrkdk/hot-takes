'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [tab, setTab] = useState<'maak' | 'join'>('maak')
  const [naam, setNaam] = useState('')
  const [code, setCode] = useState('')
  const [pack, setPack] = useState('algemeen')
  const [vragen, setVragen] = useState(8)
  const [laden, setLaden] = useState(false)
  const [fout, setFout] = useState('')

  async function maakRoom() {
    if (!naam.trim()) return setFout('Vul je naam in')
    setLaden(true); setFout('')
    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: naam.trim(), packId: pack, totalQuestions: vragen }),
      })
      const data = await res.json()
      if (!res.ok) return setFout(data.error)
      localStorage.setItem(`ht_player_${data.room.code}`, JSON.stringify(data.player))
      router.push(`/room/${data.room.code}`)
    } catch { setFout('Verbinding mislukt') }
    finally { setLaden(false) }
  }

  async function joinRoom() {
    if (!naam.trim()) return setFout('Vul je naam in')
    if (!code.trim()) return setFout('Vul een code in')
    setLaden(true); setFout('')
    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: naam.trim(), code: code.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (!res.ok) return setFout(data.error)
      localStorage.setItem(`ht_player_${data.room.code}`, JSON.stringify(data.player))
      router.push(`/room/${data.room.code}`)
    } catch { setFout('Verbinding mislukt') }
    finally { setLaden(false) }
  }

  const btn: React.CSSProperties = {
    width: '100%', padding: '0.875rem', borderRadius: '0.75rem', border: 'none',
    fontSize: '1rem', fontWeight: 700, cursor: laden ? 'not-allowed' : 'pointer',
    background: 'linear-gradient(135deg, #ff4d00, #ff9500)',
    color: 'white', opacity: laden ? 0.7 : 1, transition: 'opacity 0.15s',
    fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(255,100,0,0.4)',
  }

  const input: React.CSSProperties = {
    width: '100%', padding: '0.75rem 1rem', borderRadius: '0.625rem',
    border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
    color: '#f0f0f5', fontSize: '1rem', outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box',
  }

  const PACKS = [
    { id: 'algemeen', naam: '🌶️ Algemeen' },
    { id: 'werk', naam: '💼 Werk & Ambities' },
    { id: 'relaties', naam: '❤️ Relaties' },
    { id: 'controversieel', naam: '🔥 Controversieel' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>🔥</div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, margin: 0, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #ff4d00, #ff9500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Hot Takes
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0.5rem 0 0', fontSize: '0.95rem' }}>
          Stem anoniem · Raad wie wat stemde
        </p>
      </div>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: 400, background: 'rgba(255,255,255,0.04)', borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.08)', padding: '1.75rem', backdropFilter: 'blur(10px)' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '0.625rem', padding: '0.25rem' }}>
          {(['maak', 'join'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setFout('') }} style={{
              flex: 1, padding: '0.5rem', borderRadius: '0.4rem', border: 'none',
              background: tab === t ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: tab === t ? '#f0f0f5' : 'rgba(255,255,255,0.4)',
              fontWeight: tab === t ? 700 : 500, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}>
              {t === 'maak' ? '🎮 Nieuwe room' : '🔗 Joinen'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <input style={input} placeholder="Jouw naam" value={naam} onChange={e => setNaam(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (tab === 'maak' ? maakRoom() : joinRoom())} />

          {tab === 'join' && (
            <input style={{ ...input, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, fontSize: '1.25rem', textAlign: 'center' }}
              placeholder="CODE" maxLength={4} value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && joinRoom()} />
          )}

          {tab === 'maak' && (
            <>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.375rem' }}>
                  Categorie
                </label>
                <select value={pack} onChange={e => setPack(e.target.value)}
                  style={{ ...input, cursor: 'pointer' }}>
                  {PACKS.map(p => <option key={p.id} value={p.id} style={{ background: '#1a1a24' }}>{p.naam}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.375rem' }}>
                  Aantal vragen: {vragen}
                </label>
                <input type="range" min={4} max={10} value={vragen} onChange={e => setVragen(+e.target.value)}
                  style={{ width: '100%', accentColor: '#ff6500' }} />
              </div>
            </>
          )}

          {fout && <p style={{ color: '#ff6060', fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>{fout}</p>}

          <button style={btn} onClick={tab === 'maak' ? maakRoom : joinRoom} disabled={laden}>
            {laden ? '⏳ Laden...' : tab === 'maak' ? '🎮 Room aanmaken' : '🔗 Joinen'}
          </button>
        </div>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', marginTop: '2rem' }}>
        Geen account nodig · Werkt op elke telefoon
      </p>
    </div>
  )
}
