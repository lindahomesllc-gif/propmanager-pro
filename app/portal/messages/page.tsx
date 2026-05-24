'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function MessagesPage() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [messages, setMessages] = useState<any[]>([])
  const [tenant, setTenant] = useState<any>(null)
  const [newMsg, setNewMsg] = useState('')
  const [loading, setLoading] = useState(true)

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
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>

  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col h-[80vh]">
      <h1 className="text-2xl font-bold mb-4">Messages</h1>
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 border rounded-lg p-4 bg-gray-50">
        {messages.length === 0 && <p className="text-gray-400 text-center">No messages yet.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === 'tenant' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
              m.sender === 'tenant' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-800'
            }`}>
              {m.body}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded-lg px-4 py-2 text-sm"
          placeholder="Type a message..."
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Send</button>
      </div>
    </div>
  )
}
