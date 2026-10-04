import { supabase } from './supabase'

// נעילת האפליקציה ב-Face ID / טביעת אצבע באמצעות WebAuthn (passkey של המכשיר).
// זו נעילה מקומית במכשיר: ההתחברות עצמה נשמרת ב-Supabase, והאימות הביומטרי
// נדרש כדי לפתוח את האפליקציה. הסיסמה נדרשת רק אחרי התנתקות מפורשת.

const KEY = 'bio_cred_id'
const DISMISSED = 'bio_offer_dismissed'

const toB64 = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const fromB64 = (s: string) => {
  const p = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)
  return Uint8Array.from(atob(p), (c) => c.charCodeAt(0))
}

const random = (n: number) => crypto.getRandomValues(new Uint8Array(n)) as BufferSource

export async function isSupported(): Promise<boolean> {
  try {
    return (
      !!window.PublicKeyCredential &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    )
  } catch {
    return false
  }
}

export function isEnabled(): boolean {
  try {
    return !!localStorage.getItem(KEY)
  } catch {
    return false
  }
}

export function offerDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED) === '1'
  } catch {
    return false
  }
}

export function dismissOffer() {
  try {
    localStorage.setItem(DISMISSED, '1')
  } catch {
    /* ignore */
  }
}

export function disable() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

/** רושם passkey במכשיר הזה. זורק שגיאה אם המשתמש ביטל */
export async function enable() {
  const { data } = await supabase.auth.getUser()
  const name = data.user?.email ?? 'family'
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: random(32),
      rp: { name: 'הוצאות המשפחה', id: location.hostname },
      user: { id: random(16), name, displayName: name },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'discouraged',
      },
      attestation: 'none',
      timeout: 60000,
    },
  })) as PublicKeyCredential | null
  if (!cred) throw new Error('cancelled')
  localStorage.setItem(KEY, toB64(cred.rawId))
}

/** מבקש Face ID / טביעת אצבע. true אם האימות הצליח */
export async function unlock(): Promise<boolean> {
  const id = localStorage.getItem(KEY)
  if (!id) return true
  const res = await navigator.credentials.get({
    publicKey: {
      challenge: random(32),
      rpId: location.hostname,
      allowCredentials: [{ type: 'public-key', id: fromB64(id) as BufferSource }],
      userVerification: 'required',
      timeout: 60000,
    },
  })
  return !!res
}
