import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Aurora from '../components/Aurora'
import HeroAnimation from '../components/HeroAnimation'
import TopBar from '../components/TopBar'

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
      <TopBar />
      <div className="max-w-md mx-auto px-5 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] flex flex-col">
        <div className="animate-rise">
          <HeroAnimation />
        </div>

        <div className="text-center mt-1 mb-5 animate-rise" style={{ animationDelay: '.12s' }}>
          <h1 className="text-[1.75rem] leading-tight font-extrabold bg-gradient-to-l from-emerald-600 via-teal-500 to-sky-600 bg-clip-text text-transparent">
            כל הוצאות המשפחה,
            <br />
            במקום אחד
          </h1>
          <p className="text-slate-500 text-sm mt-2">עוקבים, מסווגים ורואים לאן הכסף הולך</p>
        </div>

        <form
          onSubmit={submit}
          className="glass p-5 space-y-3 animate-rise"
          style={{ animationDelay: '.2s' }}
        >
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-200/70 text-sm font-semibold">
            {(['in', 'up'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setMsg('')
                }}
                className={`py-2 rounded-xl transition ${
                  mode === m ? 'bg-white text-slate-900 shadow' : 'text-slate-500'
                }`}
              >
                {m === 'in' ? 'כניסה' : 'הרשמה'}
              </button>
            ))}
          </div>

          <div className="relative">
            <span className="absolute inset-y-0 start-4 grid place-items-center text-slate-400 pointer-events-none">
              ✉️
            </span>
            <input
              className="field-light ps-12"
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
            <span className="absolute inset-y-0 start-4 grid place-items-center text-slate-400 pointer-events-none">
              🔒
            </span>
            <input
              className="field-light ps-12 pe-12"
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
              className="absolute inset-y-0 end-3 px-1 grid place-items-center text-slate-500"
            >
              {show ? '🙈' : '👁️'}
            </button>
          </div>

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'רגע…' : mode === 'in' ? 'כניסה' : 'יצירת משתמש'}
          </button>
          {msg && <p className="text-red-600 text-sm text-center">{msg}</p>}
        </form>

        <div
          className="flex flex-wrap justify-center gap-2 mt-5 animate-rise"
          style={{ animationDelay: '.3s' }}
        >
          {FEATURES.map((f) => (
            <span
              key={f}
              className="text-xs text-slate-600 bg-white/70 border border-slate-200 rounded-full px-3 py-1.5"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </Aurora>
  )
}
