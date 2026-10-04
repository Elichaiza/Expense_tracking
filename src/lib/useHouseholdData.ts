import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Category, Expense, Recurring } from './types'

export function useHouseholdData(householdId: string) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [recurring, setRecurring] = useState<Recurring[]>([])
  const [members, setMembers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const [e, c, m, r] = await Promise.all([
      supabase
        .from('expenses')
        .select('id,user_id,amount,title,merchant,category_id,spent_at,recurring_id')
        .eq('household_id', householdId)
        .order('spent_at', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('id,name,icon').eq('household_id', householdId).order('name'),
      supabase.from('household_members').select('user_id,display_name').eq('household_id', householdId),
      supabase
        .from('recurring_expenses')
        .select('id,amount,title,category_id,day_of_month')
        .eq('household_id', householdId)
        .eq('active', true)
        .order('day_of_month'),
    ])
    if (e.data) setExpenses(e.data.map((x) => ({ ...x, amount: Number(x.amount) })))
    if (c.data) setCategories(c.data)
    if (m.data) setMembers(Object.fromEntries(m.data.map((x) => [x.user_id, x.display_name ?? ''])))
    if (r.data) setRecurring(r.data.map((x) => ({ ...x, amount: Number(x.amount) })))
    setLoading(false)
  }, [householdId])

  // יוצר את ההוצאות הקבועות שהגיע זמנן (בטוח להרצה חוזרת), ואז טוען מחדש
  const generateAndReload = useCallback(async () => {
    await supabase.rpc('generate_recurring', { p_household: householdId })
    await reload()
  }, [householdId, reload])

  useEffect(() => {
    generateAndReload()
    const channel = supabase
      .channel('expenses-' + householdId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `household_id=eq.${householdId}` },
        () => reload(),
      )
      .subscribe()
    const onVisible = () => document.visibilityState === 'visible' && generateAndReload()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [householdId, reload, generateAndReload])

  return { expenses, categories, recurring, members, loading, reload }
}
