'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm, formatDate } from '@/lib/supabase'

export default function TenantDetailPage({ params }) {
  const [tenant, setTenant] = useState(null)
  const [leases, setLeases] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('tenants').select('*, properties(address, city, state)').eq('id', params.id).eq('user_id', USER_ID).single(),
      supabase.from('leases').select('*').eq('tenant_id', params.id).eq('user_id', USER_ID).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('tenant_id', params.id).eq('user_id', USER_ID).order('due_date', { ascending: false }).limit(10),
    ]).then(([t, l, p]) => {
      setTenant(t.data)
      setLeases(l.data || [])
      setPayments(p.data || [])
      setLoading(false)
    })
  }, [params.id])

  if (loading) return <AppShell><div style={{ padding: '40px', color: 'var(--text3)', textAlign: 'center' }}>Loading...</div></AppShell>
  if (!tenant) return <AppShell><div style={{ padding: '40px', color: 'var(--text3)', textAlign: 'center' }}>Tenant not found.</div></AppShell>

  const t = tenant
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount_paid, 0)
  const activeLease = leases.find(l => l.status === 'executed')

  const card = { background: 'var(--bg2)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const secTtl = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: '12px' }
  const lbl = { fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }
  const val = { fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginTop: '2px' }
  const btnG = { background: 'transparent', color: 'var(--text2)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }
  const btnP = { background: 'var(--green)', color: 'var(--bg)', border: 'none', borderRadius: '7px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }
  const statusColor = t.status === 'active' ? 'var(--green)' : 'var(--text2)'

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div>
          <a href='/tenants' style={{ fontSize: '11px', color: 'var(--text3)', textDecoration: 'none' }}>← Tenants</a>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>{t.full_name}</div>
          <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{t.properties?.address}{t.unit ? ' · ' + t.unit : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: statusColor + '22', color: statusColor, fontWeight: 600, textTransform: 'uppercase' }}>{t.status}</span>
          <a href={'/tenants/' + t.id + '/edit'} style={btnG}>Edit</a>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Move In', value: formatDate(t.move_in_date), color: 'var(--text)' },
            { label: 'Move Out', value: t.move_out_date ? formatDate(t.move_out_date) : 'Current', color: 'var(--green)' },
            { label: 'Total Paid', value: fm(totalPaid), color: 'var(--green)' },
            { label: 'Active Lease', value: activeLease ? fm(activeLease.rent_amount) + '/mo' : 'None', color: activeLease ? 'var(--green)' : 'var(--amber)' },
            { label: 'Payments', value: payments.length, color: 'var(--text)' },
          ].map(mc => (
            <div key={mc.label} style={{ background: 'var(--bg2)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={lbl}>{mc.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: mc.color, marginTop: '5px' }}>{mc.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <div style={card}>
              <div style={secTtl}>Contact Info</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  ['Email', t.email || '—'],
                  ['Phone', t.phone || '—'],
                  ['Date of Birth', t.date_of_birth ? formatDate(t.date_of_birth) : '—'],
                  ['Portal Access', t.portal_access ? 'Yes' : 'No'],
                  ['Emergency Contact', t.emergency_contact_name || '—'],
                  ['Emergency Phone', t.emergency_contact_phone || '—'],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px 10px' }}>
                    <div style={lbl}>{k}</div>
                    <div style={val}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            {t.notes && (
              <div style={card}>
                <div style={secTtl}>Notes</div>
                <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.6' }}>{t.notes}</div>
              </div>
            )}
          </div>
          <div>
            <div style={card}>
              <div style={secTtl}>Leases</div>
              {leases.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '12px' }}>No leases found.</div>
              ) : leases.map(l => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{fm(l.rent_amount)}/mo</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{formatDate(l.start_date)} → {formatDate(l.end_date)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: (l.status === 'executed' ? 'var(--green)' : 'var(--text2)') + '22', color: l.status === 'executed' ? 'var(--green)' : 'var(--text2)' }}>{l.status}</span>
                    <a href={'/leases/' + l.id} style={btnG}>View</a>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: '12px' }}>
                <a href='/leases/new' style={btnG}>+ New Lease</a>
              </div>
            </div>
            <div style={card}>
              <div style={secTtl}>Recent Payments</div>
              {payments.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '12px' }}>No payments recorded.</div>
              ) : payments.slice(0, 5).map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text)' }}>{formatDate(p.due_date)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{p.payment_method || 'manual'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: p.status === 'paid' ? 'var(--green)' : 'var(--amber)' }}>{fm(p.amount_paid)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{p.status}</div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: '12px' }}>
                <a href='/payments/new' style={btnG}>+ Record Payment</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}