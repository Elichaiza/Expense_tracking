import { supabase } from './supabase'

export type Section = 'produce' | 'dry' | 'meat' | 'dairy'

export type ShoppingItem = { id: string; name: string; section: Section; created_at: string }

// סדר המערך הוא סדר התצוגה ברשימה, תמיד
export const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'produce', label: 'ירקות ופירות', icon: '🥬' },
  { id: 'dry', label: 'יבשים', icon: '🥫' },
  { id: 'meat', label: 'בשרי', icon: '🥩' },
  { id: 'dairy', label: 'חלבי', icon: '🧀' },
]

const SECTION_ORDER = Object.fromEntries(SECTIONS.map((s, i) => [s.id, i])) as Record<Section, number>

/*
 * מילות מפתח לסיווג. כל מילה נבדקת מול תחילת מילה בשם הפריט (כך "תפוח" תופס גם
 * "תפוחים" וגם "תפוחי אדמה"), וגם אחרי ה' או ו' בתחילת המילה.
 * מילה שמסתיימת ברווח חייבת להתאים למילה שלמה.
 */

// נבדק ראשון: מוצרי מדף שהשם שלהם מכיל ירק/חלב/בשר ("רסק עגבניות", "חלב קוקוס", "מרק עוף")
const DRY = [
  'רסק', 'מיץ', 'שימורי', 'קפוא', 'אבקת', 'אבקה', 'רוטב', 'חטיף', 'ממרח', 'ריבה', 'ריבת', 'שוקולד',
  'עוגיות', 'עוגה', 'עוגת', 'בטעם', 'מיובש', 'יבש', 'חמוץ', 'חמוצ', 'כבוש', 'חלבה', 'דגני', 'לחם', 'מרק',
  'שמן', 'חומץ', 'טונה', 'תבלין', 'מלח', 'תה ', 'קפה', 'סירופ', 'סילאן', 'פסטה', 'אורז', 'קמח', 'סוכר',
  'יין', 'בירה', 'סודה', 'קולה', 'משקה', 'לימונדה', 'חלב קוקוס', 'חלב שקדים', 'חלב סויה', 'חלב שיבולת',
  'חמאת בוטנים', 'פלפל שחור', 'פלפל לבן', 'שום גבישי', 'בצל מטוגן', 'קרקר', 'ביסלי', 'במבה', 'ציפס',
  'פופקורן', 'קטשופ', 'בורקס', 'פיצה', 'גלידה', 'מלאווח', 'גחנון', 'סבון', 'שמפו', 'מרכך', 'נייר',
  'טישו', 'מגבונ', 'אקונומיקה', 'נוזל', 'משחת', 'חיתול',
]

const MEAT = [
  'בשר', 'עוף', 'עופות', 'חזה', 'שניצל', 'כרעיים', 'שוקיים', 'כנפיים', 'פרגי', 'הודו', 'קבב', 'המבורגר',
  'נקניק', 'פסטרמה', 'סלמי', 'סטייק', 'אנטריקוט', 'צלעות', 'צלי', 'אסאדו', 'כבד ', 'קציצות', 'שווארמה',
  'בקר', 'טלה', 'כבש', 'נתחי', 'מרגז', 'בייקון', 'לבבות', 'דג ', 'דגים', 'סלמון', 'דניס', 'אמנון', 'מושט',
  'בורי ', 'לברק', 'פילה',
]

const DAIRY = [
  'חלב', 'גבינ', 'קוטג', 'יוגורט', 'שמנת', 'חמאה', 'חמאת', 'מעדן', 'מעדנ', 'מילקי', 'דנונה', 'אקטימל',
  'לבנה', 'לאבנה', 'צפתית', 'בולגרית', 'מוצרלה', 'פרמז', 'צהובה', 'ריקוטה', 'מסקרפונה', 'פטה ', 'חלומי',
  'קשקבל', 'שוקו ', 'ביצ', 'מרגרינה', 'קפיר', 'יופלה', 'גמדים', 'פודינג', 'קרם פרש', 'טופו',
]

const PRODUCE = [
  'ירק', 'פירות', 'פרי ', 'תפוח', 'תפוז', 'תפוא', 'עגבני', 'מלפפון', 'גזר', 'בצל', 'שום ', 'פלפל', 'חסה',
  'כרוב', 'ברוקולי', 'קישוא', 'זוקיני', 'חציל', 'בטטה', 'תירס', 'פטריות', 'פטרוזיליה', 'כוסברה', 'שמיר',
  'נענע', 'בזיליקום', 'עירית', 'סלרי', 'סלק', 'צנון', 'דלעת', 'דלורית', 'קולורבי', 'שומר ', 'תרד', 'קייל',
  'רוקט', 'נבטים', 'לפת', 'ארטישוק', 'אספרגוס', 'במיה', 'שעועית ירוקה', 'גינגר', 'אבוקדו', 'לימון', 'ליים ',
  'בננ', 'ענבים', 'אבטיח', 'מלון ', 'אגס', 'אפרסק', 'נקטרינ', 'שזיף', 'משמש', 'תות', 'דובדבנ', 'רימון',
  'מנגו', 'אננס', 'קיווי', 'קלמנטינ', 'אשכולי', 'פומלה', 'תמר', 'תאנ', 'אפרסמון', 'ליצי', 'פסיפלורה',
  'אוכמניות', 'פטל',
]

/** שם מנורמל: בלי כמויות, ניקוד, גרשיים וסימני פיסוק. משמש גם כמפתח לכללים שנלמדו */
export const normalizeItem = (s: string) =>
  s
    .toLowerCase()
    .replace(/[֑-ׇ"'׳״`]/g, '')
    .replace(/[\d.,\-_/\\()*#:;!?+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function has(name: string, keywords: string[]) {
  const padded = ` ${name} `
  return keywords.some((k) => padded.includes(' ' + k) || padded.includes(' ה' + k) || padded.includes(' ו' + k))
}

/** מחלקה לפריט: קודם כלל שנלמד מתיקון ידני, אחרת לפי מילות מפתח. לא מזוהה = יבשים */
export function classifyItem(name: string, rules: Record<string, Section> = {}): Section {
  const n = normalizeItem(name)
  if (rules[n]) return rules[n]
  if (has(n, DRY)) return 'dry'
  if (has(n, MEAT)) return 'meat'
  if (has(n, DAIRY)) return 'dairy'
  if (has(n, PRODUCE)) return 'produce'
  return 'dry'
}

/** מפרק טקסט חופשי לפריטים: שורות, פסיקים, תבליטים ומספור ("1. חלב") */
export function parseItems(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of text.split(/[\n,،;]+/)) {
    const name = raw
      .replace(/^\s*(?:[-–—•·*▪◦☐☑✓✔]+|\[[ xX]?\]|\d+[.)]\s)\s*/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80)
    const key = name.toLowerCase()
    if (!name || seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

/** ממיין לפי סדר המחלקות, ובתוך מחלקה לפי סדר ההוספה */
export const sortItems = (items: ShoppingItem[]) =>
  [...items].sort(
    (a, b) => SECTION_ORDER[a.section] - SECTION_ORDER[b.section] || a.created_at.localeCompare(b.created_at),
  )

const COLUMNS = 'id,name,section,created_at'

export async function loadShopping(householdId: string) {
  const [items, rules] = await Promise.all([
    supabase.from('shopping_items').select(COLUMNS).eq('household_id', householdId).order('created_at'),
    supabase.from('shopping_rules').select('name,section').eq('household_id', householdId),
  ])
  return {
    items: items.data as ShoppingItem[] | null,
    rules: rules.data ? (Object.fromEntries(rules.data.map((r) => [r.name, r.section])) as Record<string, Section>) : null,
    error: items.error,
  }
}

export async function addItems(householdId: string, names: string[], rules: Record<string, Section>) {
  const res = await supabase
    .from('shopping_items')
    .insert(names.map((name) => ({ household_id: householdId, name, section: classifyItem(name, rules) })))
    .select(COLUMNS)
  return { data: res.data as ShoppingItem[] | null, error: res.error }
}

/** מחזיר פריטים שנמחקו (ביטול סימון), עם המזהה והזמן המקוריים כדי שיחזרו לאותו מקום */
export async function restoreItems(householdId: string, items: ShoppingItem[]) {
  return supabase.from('shopping_items').upsert(items.map((x) => ({ ...x, household_id: householdId })))
}

/** מעביר פריט למחלקה אחרת וזוכר את זה לפעם הבאה */
export async function moveItem(householdId: string, item: ShoppingItem, section: Section) {
  const res = await supabase.from('shopping_items').update({ section }).eq('id', item.id)
  const name = normalizeItem(item.name)
  if (!res.error && name)
    await supabase
      .from('shopping_rules')
      .upsert({ household_id: householdId, name, section }, { onConflict: 'household_id,name' })
  return res
}
