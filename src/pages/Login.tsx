import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Aurora from '../components/Aurora'
import HeroAnimation from '../components/HeroAnimation'

const FEATURES = ['🤖 סיווג אוטומטי', '👨‍👩‍👧 משותף לכל המשפחה', '📱 מותקן כמו אפליקציה']

export default function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
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
    <Aurora>
      <div className="min-h-full max-w-md mx-auto px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] flex flex-col">
        <div className="flex items-center gap-2 py-2 animate-rise">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 text-lg shadow-lg shadow-emerald-500/30">
            ₪
          </span>
          <span className="font-bold tracking-tight">הוצאות המשפחה</span>
        </div>

        <div className="animate-rise" style={{ animationDelay: '.05s' }}>
          <HeroAnimation />
        </div>

        <div className="text-center mt-1 mb-5 animate-rise" style={{ animationDelay: '.12s' }}>
          <h1 className="text-[1.75rem] leading-tight font-extrabold bg-gradient-to-l from-emerald-300 via-teal-200 to-sky-300 bg-clip-text text-transparent">
            כל הוצאות המשפחה,
            <br />
            במקום אחד
          </h1>
          <p className="text-slate-400 text-sm mt-2">עוקבים, מסווגים ורואים לאן הכסף הולך</p>
        </div>

        <form
          onSubmit={submit}
          className="glass p-5 space-y-3 animate-rise"
          style={{ animationDelay: '.2s' }}
        >
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-950/50 text-sm font-semibold">
            {(['in', 'up'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setMsg('')
                }}
                className={`py-2 rounded-xl transition ${
                  mode === m ? 'bg-slate-700/80 text-white shadow' : 'text-slate-400'
                }`}
              >
                {m === 'in' ? 'כניסה' : 'הרשמה'}
              </button>
            ))}
          </div>

          <div className="relative">
            <span className="absolute inset-y-0 start-4 grid place-items-center text-slate-500 pointer-events-none">
              ✉️
            </span>
            <input
              className="field ps-12"
              type="email"
              dir="ltr"
              placeholder="אימייל"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="relative">
            <span className="absolute inset-y-0 start-4 grid place-items-center text-slate-500 pointer-events-none">
              🔒
            </span>
            <input
              className="field ps-12 pe-12"
              type={show ? 'text' : 'password'}
              dir="ltr"
              placeholder="סיסמה (לפחות 6 תווים)"
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              aria-label={show ? 'הסתר סיסמה' : 'הצג סיסמה'}
              onClick={() => setShow(!show)}
              className="absolute inset-y-0 end-3 px-1 grid place-items-center text-slate-400"
            >
              {show ? '🙈' : '👁️'}
            </button>
          </div>

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'רגע…' : mode === 'in' ? 'כניסה' : 'יצירת משתמש'}
          </button>
          {msg && <p className="text-amber-300 text-sm text-center">{msg}</p>}
        </form>

        <div
          className="flex flex-wrap justify-center gap-2 mt-5 animate-rise"
          style={{ animationDelay: '.3s' }}
        >
          {FEATURES.map((f) => (
            <span
              key={f}
              className="text-xs text-slate-300 bg-white/5 border border-white/10 rounded-full px-3 py-1.5"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </Aurora>
  )
}
