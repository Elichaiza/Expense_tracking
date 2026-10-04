import { supabase } from './supabase'
import type { Category, Kind } from './types'

const AUTO_THRESHOLD = 0.6 // מתחת לזה ההוצאה נשארת ללא קטגוריה
const SAVE_RULE_THRESHOLD = 0.8 // מעל זה הסיווג נשמר ככלל ולא ישאל שוב את ה-AI

// "שופרסל דיל 142" ו-"שופרסל דיל 87" הופכים לאותו מפתח
export const normalizeMerchant = (s: string) =>
  s
    .toLowerCase()
    .replace(/[\d₪$€.,\-_/\\()'"׳״*#:;!?]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export async function saveRule(householdId: string, title: string, categoryId: string) {
  const merchant = normalizeMerchant(title)
  if (!merchant) return
  await supabase
    .from('merchant_rules')
    .upsert(
      { household_id: householdId, merchant, category_id: categoryId },
      { onConflict: 'household_id,merchant' },
    )
}

/** מחזיר מזהה קטגוריה, או null אם לא הצלחנו לסווג */
export async function autoCategory(
  householdId: string,
  title: string,
  categories: Category[], // רק הקטגוריות של הסוג הנוכחי (הוצאה/הכנסה)
  kind: Kind,
): Promise<string | null> {
  const merchant = normalizeMerchant(title)
  if (!merchant) return null

  // 1. כלל שכבר נלמד - מיידי וללא AI
  const { data: rule } = await supabase
    .from('merchant_rules')
    .select('category_id')
    .eq('household_id', householdId)
    .eq('merchant', merchant)
    .maybeSingle()
  if (rule && categories.some((c) => c.id === rule.category_id)) return rule.category_id

  // 2. שאלה ל-AI. כל כשל (רשת, מכסה וכו') פשוט משאיר ללא קטגוריה
  try {
    const { data, error } = await supabase.functions.invoke('classify-expense', {
      body: { household_id: householdId, title, kind },
    })
    if (error || !data?.category_id || data.confidence < AUTO_THRESHOLD) return null
    // הגנה: התשובה חייבת להיות קטגוריה מהסוג הנכון
    if (!categories.some((c) => c.id === data.category_id)) return null
    if (data.confidence >= SAVE_RULE_THRESHOLD) await saveRule(householdId, title, data.category_id)
    return data.category_id
  } catch {
    return null
  }
}
