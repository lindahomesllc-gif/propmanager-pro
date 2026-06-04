'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { getMessages, sendMessage, getTenants, type Message, type Tenant } from '@/lib/supabase'

const USER_ID = 'cacb3a74-75d7-4e07-af71-6db4fdde9a92'

export default function MessagesPage() {
  const [messages, setMessages]   = useState<Message[]>([])
  const [tenants, setTenants]     = useState<Tenant[]>([])
  const [activeId, setActiveId]   = useState<string | null>(null)
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([getMessages(USER_ID), getTenants(USER_ID)]).then(([msgs, tens]) => {
      setMessages(msgs)
      setTenants(tens)
      if (tens.length > 0) setActiveId(tens[0].id)
      setLoading(false)
    })
  }, [])

  const activeTenant = tenants.find(t => t.id === activeId)
  const threadMsgs   = messages.filter(m => m.tenant_id === activeId)

  async function handleSend() {
    if (!input.trim() || !activeId) return
    const newMsg = await sendMessage({
      tenant_id: activeId,
      property_id: activeTenant?.property_id || '',
      sender: 'landlord',
      body: input.trim(),
      read_at: new Date().toISOString(),
    })
    if (newMsg) setMessages(prev => [...prev, newMsg])
    setInput('')
  }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Messages</div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'grid', gridTemplateColumns: '200px 1fr' }}>
        {/* Thread list */}
        <div style={{ background: 'var(--bg2)', borderRight: '0.5px solid var(--border)', overflowY: 'auto' }}>
          <div style={{ padding: '10px 12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', borderBottom: '0.5px solid var(--border)' }}>
            Conversations
          </div>
          {loading ? (
            <div style={{ padding: '20px', color: 'var(--text3)', fontSize: '12px', textAlign: 'center' }}>Loading…</div>
          ) : tenants.length === 0 ? (
            <div style={{ padding: '20px', color: 'var(--text3)', fontSize: '12px', textAlign: 'center' }}>No tenants yet</div>
          ) : tenants.map(t => {
            const last = messages.filter(m=>m.tenant_id===t.id).slice(-1)[0]
            const unread = messages.filter(m=>m.tenant_id===t.id && m.sender==='tenant' && !m.read_at).length
            return (
              <div key={t.id} onClick={() => setActiveId(t.id)} style={{
                display: 'flex', alignItems: 'center', gap: '9px', padding: '10px 12px',
                cursor: 'pointer', borderBottom: '0.5px solid var(--border)',
                background: t.id === activeId ? 'var(--bg3)' : 'transparent',
                borderLeft: t.id === activeId ? '2px solid #4ADE9A' : '2px solid transparent',
              }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1E3D2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--green)', flexShrink: 0 }}>
                  {t.full_name.split(' ').map((w:string)=>w[0]).join('').slice(0,2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.full_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
                    {last ? last.body.substring(0, 28) + '…' : 'No messages yet'}
                  </div>
                </div>
                {unread > 0 && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }}></div>}
              </div>
            )
          })}
        </div>

        {/* Chat panel */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
          {activeTenant ? (
            <>
              <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#1E3D2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'var(--green)' }}>
                  {activeTenant.full_name.split(' ').map((w:string)=>w[0]).join('').slice(0,2)}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{activeTenant.full_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{activeTenant.phone || activeTenant.email || 'Tenant'}</div>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {threadMsgs.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: '13px', padding: '40px' }}>
                    No messages yet — start the conversation!
                  </div>
                ) : threadMsgs.map(m => {
                  const isMe = m.sender === 'landlord'
                  return (
                    <div key={m.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: isMe ? '#1E3D2A' : '#1E3A5C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: isMe ? 'var(--green)' : 'var(--blue)', flexShrink: 0 }}>
                        {isMe ? 'P' : activeTenant.full_name.split(' ').map((w:string)=>w[0]).join('').slice(0,2)}
                      </div>
                      <div>
                        <div style={{ maxWidth: '72%', padding: '9px 13px', borderRadius: '12px', fontSize: '12.5px', lineHeight: 1.55, background: isMe ? 'var(--green)' : 'var(--bg3)', color: isMe ? 'var(--bg)' : 'var(--text)', fontWeight: isMe ? 500 : 400, borderBottomRightRadius: isMe ? '3px' : '12px', borderBottomLeftRadius: isMe ? '12px' : '3px', border: isMe ? 'none' : '0.5px solid var(--border)' }}>
                          {m.body}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '3px', textAlign: isMe ? 'right' : 'left' }}>
                          {new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ padding: '10px 14px', borderTop: '0.5px solid var(--border)', background: 'var(--bg2)', display: 'flex', gap: '8px' }}>
                <input
                  className="input"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message…"
                  style={{ borderRadius: '20px', background: 'var(--bg3)' }}
                />
                <button className="btn btn-primary" onClick={handleSend} style={{ fontSize: '11px' }}>Send</button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: '13px' }}>
              Select a tenant to view messages
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
