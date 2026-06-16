'use client'
import { useState } from 'react'

// Small ⓘ that shows a real tooltip on hover (and tap), instead of the flaky
// native `title`. Opens leftward so it stays on-screen for right-aligned columns.
export default function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span
      style={{ position: 'relative', display: 'inline-block', marginLeft: '5px', verticalAlign: 'middle' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        onClick={e => { e.stopPropagation(); e.preventDefault(); setOpen(o => !o) }}
        style={{ cursor: 'pointer', color: 'var(--text3)', fontSize: '9px', fontWeight: 700, fontStyle: 'italic', border: '1px solid var(--border2)', borderRadius: '50%', width: '13px', height: '13px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
      >i</span>
      {open && (
        <span style={{ position: 'absolute', zIndex: 200, top: '150%', right: 0, width: '230px', background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '9px 11px', boxShadow: '0 6px 22px rgba(0,0,0,0.22)', fontSize: '11px', fontWeight: 400, color: 'var(--text2)', textTransform: 'none', letterSpacing: 0, lineHeight: 1.5, whiteSpace: 'normal', textAlign: 'left' }}>{text}</span>
      )}
    </span>
  )
}
