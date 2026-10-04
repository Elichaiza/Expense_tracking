import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import type { Household, Kind } from './lib/types'
import { useHouseholdData } from './lib/useHouseholdData'
import { monthKey, todayIso } from './lib/format'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Transactions from './pages/Transactions'
import Analysis from './pages/Analysis'
import Settings from './pages/Settings'
import AddTransaction from './components/AddTransaction'
import LockScreen from './components/LockScreen'
import BiometricToggle from './components/BiometricToggle'
import { MonthSwitcher } from './components/ui'
import {
  IconChart, IconExpense, IconHome, IconIncome, IconPlus, IconSettings,
} from './components/Icons'
import { disable, shouldLock, touchActive } from './lib/biometric'

type Tab = 'home' | 'expenses' | 'income' | 'analysis' | 'settings'

const TABS: { id: Tab; label: string; icon: (p: { className?: string }) => ReactNode }[] = [
  { id: 'home', label: 'בית', icon: IconHome },
  { id: 'income', label: 'הכנסות', icon: IconIncome },
  { id: 'expenses', label: 'הוצאות', icon: IconExpense },
  { id: 'analysis', label: 'ניתוח', icon: IconChart },
  { id: 'settings', label: 'הגדרות', icon: IconSettings },
]

const TITLES: Record<Tab, string> = {
  home: 'סקירה',
  expenses: 'הוצאות',
  income: 'הכנסות',
  analysis: 'ניתוח',
  settings: 'הגדרות',
}

// כל לשונית צובעת את הכותרת בצבע שלה: הוצאות באדום בהיר, הכנסות בירוק
const HEADER_GRADIENT: Record<Tab, string> = {
  home: 'from-emerald-500 via-teal-500 to-sky-500',
  income: 'from-emerald-500 via-emerald-400 to-teal-400',
  expenses: 'from-rose-500 via-rose-400 to-rose-300',
  analysis: 'from-emerald-500 via-teal-500 to-sky-500',
  settings: 'from-emerald-500 via-teal-500 to-sky-500',
}

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'לילה טוב'
  if (h < 12) return 'בוקר טוב'
  if (h < 17) return 'צהריים טובים'
  if (h < 21) return 'ערב טוב'
  return 'לילה טוב'
}

function Main({ household }: { household: Household }) {
  const [tab, setTab] = useState<Tab>('home')
  const [month, setMonth] = useState(() => monthKey(todayIso()))
  const [adding, setAdding] = useState<Kind | null>(null)
  const [uid, setUid] = useState<string | null>(null)
  const { expenses: items, categories, recurring, members, loading, reload } = useHouseholdData(household.id)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null))
  }, [])

  const kind: Kind | null = tab === 'expenses' ? 'expense' : tab === 'income' ? 'income' : null
  const showMonth = tab !== 'settings'
  const myName = uid ? members[uid] : ''

  return (
    <div className="min-h-full max-w-md mx-auto pb-32">
      {/* פס מאחורי שורת המצב של האייפון, כך שהטקסט הלבן שלה תמיד קריא */}
      <div
        className={`fixed top-0 inset-x-0 h-[env(safe-area-inset-top)] z-30 ${tab === 'expenses' ? 'bg-rose-500' : 'bg-emerald-500'}`}
      />

      <header
        className={`bg-gradient-to-bl ${HEADER_GRADIENT[tab]} text-white pt-[env(safe-area-inset-top)] rounded-b-[2rem] shadow-lg ${tab === 'expenses' ? 'shadow-rose-500/20' : 'shadow-emerald-600/20'}`}
      >
        <div className="px-5 pt-5 pb-7">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-white/80">
                {greeting()}
                {myName ? `, ${myName}` : ''} 👋
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight mt-0.5">
                {tab === 'home' ? household.name : TITLES[tab]}
              </h1>
            </div>
            <span className="grid place-items-center w-10 h-10 rounded-2xl bg-white/25 font-bold text-lg">₪</span>
          </div>
          {showMonth && (
            <div className="mt-4">
              <MonthSwitcher month={month} onChange={setMonth} />
            </div>
          )}
        </div>
      </header>

      <main className="px-4 pt-6">
        <BiometricToggle variant="offer" />
        {loading ? (
          <p className="text-center text-slate-400 mt-16">טוען…</p>
        ) : tab === 'home' ? (
          <Home
            items={items}
            categories={categories}
            month={month}
            onAdd={setAdding}
            onSeeAll={(k) => setTab(k === 'income' ? 'income' : 'expenses')}
          />
        ) : kind ? (
          <Transactions
            kind={kind}
            householdId={household.id}
            items={items.filter((x) => x.kind === kind)}
            categories={categories.filter((c) => c.kind === kind)}
            members={members}
            month={month}
            onChanged={reload}
          />
        ) : tab === 'analysis' ? (
          <Analysis items={items} categories={categories} members={members} month={month} />
        ) : (
          <Settings
            household={household}
            categories={categories}
            recurring={recurring}
            items={items}
            members={members}
            onChanged={reload}
          />
        )}
      </main>

      {kind && (
        <button
          className={`fixed end-5 w-14 h-14 rounded-full bg-gradient-to-br text-white grid place-items-center shadow-xl active:scale-95 transition z-20 ${
            kind === 'expense'
              ? 'from-rose-300 to-rose-400 shadow-rose-400/30'
              : 'from-emerald-400 to-teal-500 shadow-emerald-600/30'
          }`}
          style={{ bottom: 'calc(6.25rem + env(safe-area-inset-bottom))' }}
          aria-label={kind === 'income' ? 'הוספת הכנסה' : 'הוספת הוצאה'}
          onClick={() => setAdding(kind)}
        >
          <IconPlus className="w-7 h-7" />
        </button>
      )}

      <nav
        className="fixed inset-x-3 z-30"
        style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-md mx-auto grid grid-cols-5 rounded-3xl bg-white/90 backdrop-blur-xl ring-1 ring-slate-900/5 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.35)] p-1.5">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`py-2 rounded-2xl flex flex-col items-center gap-0.5 text-[11px] font-medium transition ${
                  active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400'
                }`}
              >
                <t.icon className="w-6 h-6" />
                {t.label}
              </button>
            )
          })}
        </div>
      </nav>

      {adding && (
        <AddTransaction
          initialKind={adding}
          householdId={household.id}
          categories={categories}
          onClose={() => setAdding(null)}
          onSaved={reload}
        />
      )}
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [household, setHousehold] = useState<Household | null | undefined>(undefined)
  // נעול רק אם הנעילה מופעלת ועברו יותר מ-7 דקות מהשימוש האחרון (גם אחרי סגירה מלאה)
  const [locked, setLocked] = useState(shouldLock)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const loadHousehold = useCallback(async () => {
    const { data } = await supabase
      .from('households')
      .select('id,name,invite_code')
      .limit(1)
      .maybeSingle()
    setHousehold(data ?? null)
  }, [])

  useEffect(() => {
    if (session) loadHousehold()
    else setHousehold(undefined)
  }, [session, loadHousehold])

  // התנתקות מוחקת את הנעילה הביומטרית של המכשיר
  useEffect(() => {
    if (session === null) {
      disable()
      setLocked(false)
    }
  }, [session])

  // שומרים מתי האפליקציה הייתה פעילה לאחרונה. ב-iPhone אפליקציה ברקע יכולה להיסגר
  // בלי שום אירוע, ולכן מעדכנים גם כל כמה שניות בזמן שהיא פתוחה.
  useEffect(() => {
    if (!session || locked) return
    touchActive()
    const id = setInterval(touchActive, 15_000)
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') touchActive()
      else if (shouldLock()) setLocked(true)
      else touchActive()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', touchActive)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', touchActive)
    }
  }, [session, locked])

  if (session === undefined) return <p className="text-center text-slate-400 pt-24">טוען…</p>
  if (!session) return <Login />
  if (locked)
    return (
      <LockScreen
        onUnlock={() => setLocked(false)}
        onUsePassword={() => {
          disable()
          supabase.auth.signOut()
        }}
      />
    )
  if (household === undefined) return <p className="text-center text-slate-400 pt-24">טוען…</p>
  if (!household) return <Onboarding onDone={loadHousehold} />
  return <Main household={household} />
}
