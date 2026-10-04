import type { Category } from './types'

// פלטה קטגורית שאומתה (הפרדה לעיוורי צבעים, ניגודיות). הסדר קבוע ואינו מתחלף.
export const SERIES = [
  '#2a78d6', // כחול
  '#eb6834', // כתום
  '#1baf7a', // טורקיז
  '#eda100', // צהוב
  '#e87ba4', // ורוד
  '#008300', // ירוק
  '#4a3aa7', // סגול
  '#e34948', // אדום
]

// הכנסות/הוצאות: שני צבעים קבועים בכל הגרפים
// הוצאות באדום בהיר, הכנסות בירוק. הזוג אומת מול עיוורי צבעים (טווח 6-8),
// ולכן בגרפים יש תמיד גם מקרא, תוויות בטולטיפ, מרווח בין עמודות וטבלת נתונים.
export const EXPENSE_COLOR = '#fb7185'
export const INCOME_COLOR = SERIES[2]
export const MUTED = '#94a3b8'
export const MUTED_LIGHT = '#cbd5e1'
export const INK = '#0f172a'
export const AXIS = '#64748b'
export const GRID = '#e2e8f0'

// סדר קבוע לקטגוריות ברירת המחדל, כדי שהגדולות יקבלו צבע ו"אחר" יהיה אפור
const DEFAULT_ORDER = [
  'סופר ומכולת', 'מסעדות וקפה', 'דלק ותחבורה', 'חשבונות', 'דיור', 'ילדים', 'בריאות', 'ביגוד',
  'בילויים', 'קניות', 'משכורת', 'עסק ועבודה עצמאית', 'קצבאות', 'שכר דירה', 'מתנות', 'החזרים',
  'השקעות', 'אחר',
]

/**
 * צבע לכל קטגוריה לפי הזהות שלה (לא לפי הדירוג בחודש הנוכחי), כך שהצבע לא משתנה
 * בין חודשים או כשמסננים. מעל 8 קטגוריות, או "ללא קטגוריה", מקבלות אפור.
 */
export function categoryColors(categories: Category[]): Record<string, string> {
  const out: Record<string, string> = { '': MUTED_LIGHT }
  for (const kind of ['expense', 'income'] as const) {
    const list = categories
      .filter((c) => c.kind === kind)
      .sort((a, b) => {
        const ia = DEFAULT_ORDER.indexOf(a.name)
        const ib = DEFAULT_ORDER.indexOf(b.name)
        if (ia !== -1 && ib !== -1) return ia - ib
        if (ia !== -1) return -1
        if (ib !== -1) return 1
        return (a.created_at ?? '').localeCompare(b.created_at ?? '') || a.name.localeCompare(b.name)
      })
    list.forEach((c, i) => {
      out[c.id] = c.name === 'אחר' ? MUTED : (SERIES[i] ?? MUTED)
    })
  }
  return out
}
