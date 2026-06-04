'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const fmtTime = (d: any) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''

export default function MessagesPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<any[]>([])
  const [tenant, setTenant] = useState<any>(null)
  const [newMsg, setNewMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/portal'); return }
      const { data: t } = await supabase.from('tenants').select('*').eq('email', user.email).eq('status', 'active').single()
      if (!t) { router.push('/portal'); return }
      setTenant(t)
      const { data: m } = await supabase.from('messages').select('*').eq('tenant_id', t.id).order('created_at', { ascending: true })
      setMessages(m || [])
      setLoading(false)
      setTimeout(() => bottomRef.current?.scrollIntoView(), 50)
    }
    load()
  }, [])

  async function sendMessage() {
    if (!newMsg.trim() || !tenant) return
    await supabase.from('messages').insert({
      tenant_id: tenant.id,
      property_id: tenant.property_id,
      user_id: tenant.user_id,
      sender: 'tenant',
      body: newMsg.trim(),
    })
    setNewMsg('')
    const { data: m } = await supabase.from('messages').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: true })
    setMessages(m || [])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  return (
    <div style={{ minHeight: '100vh', maxHeight: '100vh', background: '#F6F8F3', fontFamily: 'Plus Jakarta Sans, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <a href='/portal/dashboard' style={{ color: '#2D6A4F', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>← Back</a>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A1A' }}>💬 Messages</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', maxWidth: '700px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {loading ? (
          <div style={{ color: '#888', textAlign: 'center', paddingTop: '40px', fontSize: '13px' }}>Loading…</div>
        ) : messages.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '40px', textAlign: 'center', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>👋</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#1A1A1A' }}>No messages yet</div>
            <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>Send your landlord a message below — questions, requests, anything.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map(m => {
              const mine = m.sender === 'tenant'
              return (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: '16px', fontSize: '13.5px', lineHeight: 1.5, background: mine ? '#2D6A4F' : '#fff', color: mine ? '#fff' : '#1A1A1A', border: mine ? 'none' : '1px solid #E5E7EB', borderBottomRightRadius: mine ? '4px' : '16px', borderBottomLeftRadius: mine ? '16px' : '4px' }}>
                    {m.body}
                  </div>
                  <div style={{ fontSize: '10px', color: '#AAA', marginTop: '3px', padding: '0 4px' }}>{mine ? 'You' : 'Landlord'} · {fmtTime(m.created_at)}</div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div style={{ background: '#fff', borderTop: '1px solid #E5E7EB', padding: '12px 20px', flexShrink: 0 }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', gap: '8px' }}>
          <input
            style={{ flex: 1, padding: '11px 14px', fontSize: '14px', border: '1.5px solid #E5E7EB', borderRadius: '10px', outline: 'none', background: '#FAFAFA', boxSizing: 'border-box' }}
            placeholder='Type a message…'
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
          />
          <button onClick={sendMessage} disabled={!newMsg.trim()} style={{ background: '#2D6A4F', color: '#fff', border: 'none', borderRadius: '10px', padding: '0 20px', fontSize: '14px', fontWeight: 700, cursor: newMsg.trim() ? 'pointer' : 'not-allowed', opacity: newMsg.trim() ? 1 : 0.5 }}>Send</button>
        </div>
      </div>
    </div>
  )
}
