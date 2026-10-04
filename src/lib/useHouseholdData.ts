import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Category, Expense } from './types'

export function useHouseholdData(householdId: string) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [members, setMembers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const [e, c, m] = await Promise.all([
      supabase
        .from('expenses')
        .select('id,user_id,amount,title,merchant,category_id,spent_at')
        .eq('household_id', householdId)
        .order('spent_at', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('id,name,icon').eq('household_id', householdId).order('name'),
      supabase.from('household_members').select('user_id,display_name').eq('household_id', householdId),
    ])
    if (e.data) setExpenses(e.data.map((x) => ({ ...x, amount: Number(x.amount) })))
    if (c.data) setCategories(c.data)
    if (m.data) setMembers(Object.fromEntries(m.data.map((x) => [x.user_id, x.display_name ?? ''])))
    setLoading(false)
  }, [householdId])

  useEffect(() => {
    reload()
    const channel = supabase
      .channel('expenses-' + householdId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `household_id=eq.${householdId}` },
        () => reload(),
      )
      .subscribe()
    const onVisible = () => document.visibilityState === 'visible' && reload()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [householdId, reload])

  return { expenses, categories, members, loading, reload }
}
