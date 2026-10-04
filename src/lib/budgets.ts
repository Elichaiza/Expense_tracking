import { supabase } from './supabase'

/** שומר או מעדכן תקציב חודשי. categoryId=null הוא התקציב הכולל */
export async function saveBudget(householdId: string, categoryId: string | null, amount: number) {
  return supabase.from('budgets').upsert(
    {
      household_id: householdId,
      category_key: categoryId ?? 'total',
      category_id: categoryId,
      amount,
    },
    { onConflict: 'household_id,category_key' },
  )
}

export async function removeBudget(householdId: string, categoryId: string | null) {
  return supabase
    .from('budgets')
    .delete()
    .eq('household_id', householdId)
    .eq('category_key', categoryId ?? 'total')
}
