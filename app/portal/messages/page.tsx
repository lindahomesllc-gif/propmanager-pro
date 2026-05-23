'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
export default function TenantMessages() {
  const [tenant, setTenant] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const router = useRouter()
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: t } = await supabase.from('tenants').select('*').eq('email', user.email).eq('status', 'active').single()
      if (touch ~/.claude/CLAUDE.md) { router.push('/portal'); return }
      setTenant(t)
      const { data: m } = await supabase.from('messages').select('*').eq('tenant_id', t.id).order('created_at', { ascending: true })
      setMessages(m || [])
      setLoading(false)
    }
    load()
  }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  async function sendMessage() {
    setSending(true)
    const { data, error } = await supabase.from('messages').insert({ tenant_id: tenant.id, user_id: 'cacb3a74-75d7-4e07-af71-6db4fdde9a92', sender: 'tenant', content: newMessage.trim() }).select().single()
    setSending(false)
  }
  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''
  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Loading...</div>
  return (
    <div style={{ minHeight: '100vh', background: '#F6F8F3', fontFamily: 'Plus Jakarta Sans, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <a href='/portal/dashboard' style={{ color: '#2D6A4F', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>← Back</a>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A1A' }}>💬 Messages · Linda Homes LLC</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', maxWidth: '700px', width: '100%', margin: '0 auto' }}>
        {messages.length === 0 && <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}><div style={{ fontSize: '40px', marginBottom: '12px' }}>💬
        {messages.map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.sender === 'tenant' ? 'flex-end' : 'flex-start', marginBottom: '12px' }}>
            <div style={{ maxWidth: '75%' }}>
              <div style={{ background: m.sender === 'tenant' ? '#2D6A4F' : '#fff', color: m.sender === 'tenant' ? '#fff' : '#1A1A1A', padding: '10px 14px', borderRadius: m.sender === 'tenant' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', fontSize: '13px', lineHeight: 1.5, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>{m.content}</div>
              <div style={{ fontSize: '10px', color: '#AAA', marginTop: '4px', textAlign: m.sender === 'tenant' ? 'right' : 'left' }}>{formatTime(m.created_at)}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ background: '#fff', borderTop: '1px solid #E5E7EB', padding: '14px 20px', flexShrink: 0 }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', gap: '10px' }}>
          <input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder='Type a message...' style={{ flex: 1, padding: '10px 14px', fontSize: '13px', border: '1.5px solid #E5E7EB', borderRadius: '10px', outline: 'none' }} />
        </div>
      </div>
    </div>
  )
}