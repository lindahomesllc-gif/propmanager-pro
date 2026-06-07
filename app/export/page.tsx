'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

// Tables a landlord owns. Exported as CSV (per table) or one JSON full backup.
const TABLES: { key: string; label: string }[] = [
  { key: 'properties', label: 'Properties' },
  { key: 'units', label: 'Units & Rooms' },
  { key: 'entities', label: 'Entities' },
  { key: 'tenants', label: 'Tenants' },
  { key: 'leases', label: 'Leases' },
  { key: 'payments', label: 'Payments' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'mortgages', label: 'Mortgages' },
  { key: 'messages', label: 'Messages' },
]

function toCSV(rows: any[]): string {
  if (!rows.length) return ''
  const cols = Array.from(rows.reduce((s: Set<string>, r) => { Object.keys(r).forEach(k => s.add(k)); return s }, new Set<string>()))
  const esc = (v: any) => {
    if (v == null) return ''
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n')
}

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
}

const stamp = () => new Date().toISOString().split('T')[0]

export default function ExportPage() {
  const [data, setData] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')

  useEffect(() => {
    (async () => {
      const out: Record<string, any[]> = {}
      await Promise.all(TABLES.map(async t => {
        const { data: rows } = await supabase.from(t.key).select('*')
        out[t.key] = rows || []
      }))
      setData(out); setLoading(false)
    })()
  }, [])

  function exportCSV(key: string, label: string) {
    const rows = data[key] || []
    if (!rows.length) { alert('No ' + label + ' to export.'); return }
    download(`propmanager-${key}-${stamp()}.csv`, toCSV(rows), 'text/csv;charset=utf-8')
  }

  async function exportBackup() {
    setBusy('backup')
    const backup = { app: 'PropManager Pro', exported_at: new Date().toISOString(), data }
    download(`propmanager-backup-${stamp()}.json`, JSON.stringify(backup, null, 2), 'application/json')
    setBusy('')
  }

  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '20px', maxWidth: '680px' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Export & Backup</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {/* Full backup */}
        <div style={{ ...card, marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>💾 Full backup</div>
              <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '4px', maxWidth: '460px', lineHeight: 1.5 }}>
                Download a single file with <strong>everything</strong> — every property, tenant, lease, payment and more. Keep it somewhere safe; it’s your personal off-site copy.
              </div>
            </div>
            <button className='btn btn-primary' onClick={exportBackup} disabled={loading || busy === 'backup'}>
              {busy === 'backup' ? 'Preparing…' : '⬇ Download backup'}
            </button>
          </div>
        </div>

        {/* Per-table CSVs */}
        <div style={card}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>Export by type (CSV)</div>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '14px' }}>Open these in Excel or Google Sheets — handy for accountants, taxes, or your own records.</div>
          {loading ? (
            <div style={{ display: 'grid', gap: '8px' }}>{[0, 1, 2, 3].map(i => <div key={i} className='skeleton' style={{ height: '44px' }} />)}</div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {TABLES.map(t => {
                const n = (data[t.key] || []).length
                return (
                  <div key={t.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg3)', borderRadius: '8px', border: '0.5px solid var(--border)' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text)' }}>{t.label} <span style={{ color: 'var(--text3)', fontSize: '12px' }}>· {n} record{n === 1 ? '' : 's'}</span></div>
                    <button className='btn btn-ghost' style={{ fontSize: '12px', padding: '6px 12px', opacity: n ? 1 : 0.5 }} onClick={() => exportCSV(t.key, t.label)} disabled={!n}>Download CSV</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
