'use client'
import { useEffect, useState } from 'react'
import { signedUrl } from '@/lib/supabase'

// Inline <img> that resolves a private-storage file to a short-lived signed URL.
export function SignedImg({ src, style, alt = '', className }: { src: string; style?: any; alt?: string; className?: string }) {
  const [u, setU] = useState('')
  useEffect(() => { let on = true; if (src) signedUrl(src).then(x => { if (on) setU(x) }); return () => { on = false } }, [src])
  return u ? <img src={u} alt={alt} style={style} className={className} /> : <div style={style} className={className} />
}

// A div whose background image is a signed URL (for cover photos rendered as backgrounds).
export function SignedBg({ src, style, children, onClick }: { src: string; style?: any; children?: any; onClick?: () => void }) {
  const [u, setU] = useState('')
  useEffect(() => { let on = true; if (src) signedUrl(src).then(x => { if (on) setU(x) }); return () => { on = false } }, [src])
  return <div onClick={onClick} style={{ ...style, ...(u ? { backgroundImage: `url(${u})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : {}) }}>{children}</div>
}
