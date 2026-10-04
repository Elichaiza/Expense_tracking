import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import type { Household, Kind } from './lib/types'
import { useHouseholdData } from './lib/useHouseholdData'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Transactions from './pages/Transactions'
import Summary from './pages/Summary'
import Settings from './pages/Settings'
import AddTransaction from './components/AddTransaction'
import LockScreen from './components/LockScreen'
import BiometricToggle from './components/BiometricToggle'
import { disable, isEnabled } from './lib/biometric'

const RELOCK_AFTER_MS = 60_000

type Tab = 'expenses' | 'income' | 'summary' | 'settings'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'expenses', label: 'הוצאות', icon: '🧾' },
  { id: 'income', label: 'הכנסות', icon: '💰' },
  { id: 'summary', label: 'סיכום', icon: '📊' },
  { id: 'settings', label: 'הגדרות', icon: '⚙️' },
]

function Main({ household }: { household: Household }) {
  const [tab, setTab] = useState<Tab>('expenses')
  const [adding, setAdding] = useState<Kind | null>(null)
  const { expenses: items, categories, recurring, members, loading, reload } = useHouseholdData(household.id)

  const kind: Kind | null = tab === 'expenses' ? 'expense' : tab === 'income' ? 'income' : null
  const kindItems = kind ? items.filter((x) => x.kind === kind) : []
  const kindCategories = kind ? categories.filter((c) => c.kind === kind) : []

  return (
    <div className="h-full flex flex-col max-w-md mx-auto">
      <header className="px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-2 font-bold text-lg">
        {household.name}
      </header>
      <BiometricToggle variant="offer" />
      <main className="flex-1 overflow-y-auto px-4 pb-28">
        {loading ? (
          <p className="text-center text-slate-400 mt-16">טוען…</p>
        ) : kind ? (
          <Transactions
            kind={kind}
            householdId={household.id}
            items={kindItems}
            categories={kindCategories}
            members={members}
            onChanged={reload}
          />
        ) : tab === 'summary' ? (
          <Summary items={items} categories={categories} />
        ) : (
          <Settings
            household={household}
            categories={categories}
            recurring={recurring}
            onChanged={reload}
          />
        )}
      </main>

      {kind && (
        <button
          className="fixed bottom-24 end-5 w-14 h-14 rounded-full bg-emerald-500 text-slate-950 text-3xl shadow-lg active:bg-emerald-400"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
          aria-label={kind === 'income' ? 'הוספת הכנסה' : 'הוספת הוצאה'}
          onClick={() => setAdding(kind)}
        >
          +
        </button>
      )}

      <nav className="fixed bottom-0 inset-x-0 bg-slate-900 border-t border-slate-800 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto grid grid-cols-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`py-3 flex flex-col items-center text-xs ${
                tab === t.id ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {adding && (
        <AddTransaction
          kind={adding}
          householdId={household.id}
          categories={categories.filter((c) => c.kind === adding)}
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
  const [locked, setLocked] = useState(isEnabled)

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

  // חזרה לאפליקציה אחרי יותר מדקה ברקע נועלת אותה שוב
  useEffect(() => {
    let hiddenAt = 0
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now()
      else if (hiddenAt && isEnabled() && Date.now() - hiddenAt > RELOCK_AFTER_MS) setLocked(true)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

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
