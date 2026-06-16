'use client'
import AppShell from '@/components/AppShell'

// Investment Strategy playbook — saved from a verified deep-research report
// (23 sources, adversarially fact-checked). Investor education, not advice.
export default function StrategyPage() {
  const card = { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '18px 22px', marginBottom: '16px' }
  const h = { fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }
  const p = { fontSize: '13px', color: 'var(--text2)', lineHeight: 1.65, marginBottom: '8px' }
  const li = { fontSize: '13px', color: 'var(--text2)', lineHeight: 1.6, marginBottom: '6px' }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>📑 Investment Strategy</div>
        <button onClick={() => window.print()} className='btn btn-ghost no-print'>🖨 PDF</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', maxWidth: '820px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '16px' }}>
          Your capital-deployment playbook — from a verified research report (23 sources, fact-checked). The flow: <a href='/analyze' style={{ color: 'var(--green)', textDecoration: 'none' }}>🔍 Analyze</a> › <a href='/modeler' style={{ color: 'var(--green)', textDecoration: 'none' }}>🧮 Model</a> › <a href='/deploy' style={{ color: 'var(--green)', textDecoration: 'none' }}>🌱 Deploy</a>.
        </div>

        <div style={card}>
          <div style={h}>🎯 The big idea — velocity of money</div>
          <div style={p}>Idle equity earns almost nothing. Growth comes from keeping capital <strong>moving</strong>: pull equity out → redeploy into the next deal → repeat. Two ways to recycle it: a <strong>DSCR cash-out refi</strong> (tax-free access, keep the asset) or a <strong>1031 exchange</strong> (defer tax when you sell and trade up). It only works when <strong>each property cash-flows on its own</strong> and you don&apos;t over-leverage.</div>
        </div>

        <div style={card}>
          <div style={h}>🏦 DSCR cash-out refinance <span style={{ fontWeight: 400, fontSize: '11px', color: 'var(--text3)' }}>· verified</span></div>
          <div style={li}>• Qualifies on the <strong>property&apos;s rent, not your tax returns</strong>: DSCR = rent ÷ <strong>PITIA</strong> (principal, interest, taxes, insurance, + HOA).</div>
          <div style={li}>• LTV caps: ~<strong>80% on purchases</strong>, ~<strong>75% on cash-out refis</strong> (range 65–80%). Lower LTV → lower rate.</div>
          <div style={li}>• Minimum DSCR: at least <strong>1.00</strong>; <strong>~1.25 is a common preference</strong>, not a hard floor; some programs go to 0.75 at reduced LTV.</div>
          <div style={li}>• Pricing driven by <strong>FICO + LTV tier</strong>; cash-out prices ~0.2% above a purchase.</div>
          <div style={{ ...p, background: 'var(--amber-bg)', color: 'var(--amber)', borderRadius: '8px', padding: '10px 12px', marginTop: '8px' }}>⚠️ <strong>Don&apos;t trust online rate numbers</strong> — specific rate bands and several "minimum" claims <strong>failed</strong> fact-checking. Get live quotes from 2–3 actual lenders.</div>
        </div>

        <div style={card}>
          <div style={h}>🔁 1031 exchange <span style={{ fontWeight: 400, fontSize: '11px', color: 'var(--text3)' }}>· IRS-backed, high confidence</span></div>
          <div style={li}>• <strong>Defers, not eliminates</strong>, capital-gains tax by reinvesting into like-kind real property (no personal residences).</div>
          <div style={li}>• The clock is brutal &amp; concurrent: <strong>identify in writing within 45 days</strong>, <strong>close within 180 days</strong> — from the same closing, no extensions for weekends/holidays. Miss by a day → the whole exchange fails.</div>
          <div style={li}>• A <strong>Qualified Intermediary must hold the proceeds</strong>. If the money touches your hands even briefly → disqualified.</div>
          <div style={li}>• <strong>Replace value AND debt</strong>, or the shortfall ("boot") is taxed. Sell with a $600k mortgage → replacement needs ≥$600k debt (or make it up in cash).</div>
          <div style={li}>• <strong>3-property rule:</strong> identify up to 3 candidates in the 45 days, buy 1–3.</div>
          <div style={li}>🔑 <strong>Year-end trap:</strong> a sale after ~mid-October can shorten your 180 days to the April 15 tax deadline unless you file an extension.</div>
        </div>

        <div style={card}>
          <div style={h}>🧱 BRRRR / the engine &amp; the risks <span style={{ fontWeight: 400, fontSize: '11px', color: 'var(--text3)' }}>· verified</span></div>
          <div style={li}>• Recycle capital deal-to-deal without injecting new cash each time — but <strong>most deals leave ~$15k–$35k trapped</strong>, so each must cash-flow on its own.</div>
          <div style={li}>• <strong>The killers:</strong> over-leverage (strains cash flow, negative equity in a downturn) and <strong>refinance is NOT guaranteed</strong> — a weak appraisal or rate spike wrecks the exit. (A $350k expected value appraising at $310k cuts a 75% refi from $262.5k to $232.5k.)</div>
        </div>

        <div style={card}>
          <div style={h}>📦 Buy box &amp; reserves <span style={{ fontWeight: 400, fontSize: '11px', color: 'var(--text3)' }}>· industry rules of thumb</span></div>
          <div style={p}>Set criteria <em>before</em> the cash lands so you act fast without forcing a bad deal. Common starting points (not verified — tune with your CPA &amp; the numbers in your tools): ~<strong>8%+ cash-on-cash</strong>, <strong>DSCR ≥ 1.25</strong>, <strong>6+ months PITIA reserves per door</strong>, and <strong>never deploy 100%</strong>. → Define yours in the <a href='/deploy' style={{ color: 'var(--green)', textDecoration: 'none' }}>Next Move planner</a>.</div>
        </div>

        <div style={card}>
          <div style={h}>🌴 Florida watch-outs</div>
          <div style={p}>Two things hit your <strong>PITIA</strong> (and therefore DSCR) hard in Florida: <strong>insurance</strong> (wind/hurricane — expensive &amp; volatile) and <strong>property taxes</strong> (the <em>Save Our Homes</em> cap doesn&apos;t apply to non-homestead rentals, so assessed value/tax can jump after purchase). Both can quietly sink a deal&apos;s DSCR — verify with a local lender + insurance agent.</div>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text3)', lineHeight: 1.6 }}>
          <strong>Disclaimer:</strong> investor education, not personalized financial, tax, or legal advice. Execute 1031s with a Qualified Intermediary + CPA, and DSCR terms with a licensed lender. DSCR figures are 2025–2026 snapshots from lender sources and shift constantly; 1031 mechanics rest on IRS primary sources.
        </div>
      </div>
    </AppShell>
  )
}
