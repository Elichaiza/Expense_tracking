import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    const { data, error } =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) setMsg(error.message)
    else if (mode === 'up' && !data.session) setMsg('נשלח מייל אימות. אשר אותו ואז התחבר.')
  }

  return (
    <div className="min-h-full flex flex-col justify-center px-6 max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-1">💰 הוצאות המשפחה</h1>
      <p className="text-slate-400 mb-8">{mode === 'in' ? 'התחברות' : 'יצירת משתמש חדש'}</p>
      <form onSubmit={submit} className="space-y-3">
        <input
          className="field"
          type="email"
          dir="ltr"
          placeholder="אימייל"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="field"
          type="password"
          dir="ltr"
          placeholder="סיסמה (לפחות 6 תווים)"
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="btn w-full" disabled={busy}>
          {mode === 'in' ? 'כניסה' : 'הרשמה'}
        </button>
        {msg && <p className="text-amber-300 text-sm">{msg}</p>}
      </form>
      <button
        className="mt-6 text-slate-400 underline"
        onClick={() => setMode(mode === 'in' ? 'up' : 'in')}
      >
        {mode === 'in' ? 'אין לי משתמש - הרשמה' : 'יש לי משתמש - כניסה'}
      </button>
    </div>
  )
}
