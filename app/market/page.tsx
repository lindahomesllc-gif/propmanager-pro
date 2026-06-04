'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { supabase, USER_ID, fm } from '@/lib/supabase'

export default function MarketPage() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchCity, setSearchCity] = useState('Orlando')
  const [searchState, setSearchState] = useState('FL')

  useEffect(() => {
    supabase.from('properties').select('id, address, city, state, bedrooms, bathrooms, market_value, purchase_price, type').eq('user_id', USER_ID)
      .then(({ data }) => { setProperties(data || []); setLoading(false) })
  }, [])

  const totalMarket = properties.reduce((s, p) => s + (p.market_value || 0), 0)
  const totalPurchase = properties.reduce((s, p) => s + (p.purchase_price || 0), 0)
  const totalAppreciation = totalMarket - totalPurchase
  const appreciationPct = totalPurchase > 0 ? ((totalAppreciation / totalPurchase) * 100).toFixed(1) : 0

  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '14px' }
  const secTtl = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: '12px' }
  const inp = { padding: '8px 11px', fontSize: '13px', border: '0.5px solid var(--border2)', borderRadius: '7px', background: 'var(--bg3)', color: 'var(--text)', fontFamily: 'Plus Jakarta Sans, sans-serif', outline: 'none' }

  const zillowUrl = `https://www.zillow.com/homes/${searchCity}-${searchState}/`
  const realtorUrl = `https://www.realtor.com/realestateandhomes-search/${searchCity}_${searchState}`
  const rentometerUrl = `https://www.rentometer.com/`

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Market Data</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        {[
          { label: '🏠 Portfolio Value', value: fm(totalMarket), color: 'var(--green)' },
          { label: '💵 Total Purchased', value: fm(totalPurchase), color: 'var(--text)' },
          { label: '📈 Appreciation', value: fm(totalAppreciation), color: 'var(--green)' },
          { label: '🏘 Properties', value: properties.length, color: 'var(--text)' },
        ].map((mc, i) => (
          <div key={mc.label} style={{ padding: '14px 20px', background: 'var(--bg2)', borderRight: i < 3 ? '0.5px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600, marginBottom: '4px' }}>{mc.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: mc.color }}>{mc.value}</div>
          </div>
        ))}
      </div>

        <div style={card}>
          <div style={secTtl}>Property Values</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                {['Property','Type','Purchased','Market Value','Appreciation'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text3)', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {properties.map(p => {
                const app = (p.market_value || 0) - (p.purchase_price || 0)
                const pct = p.purchase_price ? ((app / p.purchase_price) * 100).toFixed(1) : 0
                return (
                  <tr key={p.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{p.address}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{p.city}, {p.state}</div>
                    </td>
                    <td style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text2)', textTransform: 'capitalize' }}>{p.type?.replace(/_/g, ' ') || '—'}</td>
                    <td style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text)' }}>{fm(p.purchase_price)}</td>
                    <td style={{ padding: '8px 10px', fontSize: '13px', fontWeight: 600, color: 'var(--green)' }}>{fm(p.market_value)}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: app >= 0 ? 'var(--green)' : 'var(--red)' }}>{fm(app)}</div>
                      <div style={{ fontSize: '11px', color: app >= 0 ? 'var(--green)' : 'var(--red)' }}>{app >= 0 ? '+' : ''}{pct}%</div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div style={card}>
          <div style={secTtl}>Research Market Rents</div>
          <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '16px' }}>Search rental comps and market data for your area using these tools:</div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input style={{ ...inp, width: '140px' }} placeholder='City' value={searchCity} onChange={e => setSearchCity(e.target.value)} />
            <input style={{ ...inp, width: '80px' }} placeholder='State' value={searchState} onChange={e => setSearchState(e.target.value.toUpperCase())} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '10px' }}>
            {[
              { name: 'Zillow', desc: 'Home values and rental estimates', url: zillowUrl, color: 'var(--blue)' },
              { name: 'Realtor.com', desc: 'MLS listings and market trends', url: realtorUrl, color: 'var(--green)' },
              { name: 'Rentometer', desc: 'Rental comp analysis tool', url: rentometerUrl, color: 'var(--amber)' },
              { name: 'Apartments.com', desc: 'Rental market data', url: 'https://www.apartments.com', color: 'var(--red)' },
            ].map(tool => (
              <a key={tool.name} href={tool.url} target='_blank' style={{ display: 'block', background: 'var(--bg3)', border: '0.5px solid var(--border)', borderLeft: '3px solid ' + tool.color, borderRadius: '8px', padding: '14px 16px', textDecoration: 'none' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{tool.name} ↗</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{tool.desc}</div>
              </a>
            ))}
          </div>
        </div>

      </div>
    </AppShell>
  )
}