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
 * אותיות סופיות מומרות לרגילות בשני הצדדים, כדי ש"מלפפון" יתפוס גם "מלפפונים".
 */

const FINALS: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' }
const noFinals = (s: string) => s.replace(/[ךםןףץ]/g, (c) => FINALS[c])
const words = (list: string[]) => list.map(noFinals)

// נבדק ראשון: מוצרי מדף שהשם שלהם מכיל ירק/חלב/בשר ("רסק עגבניות", "חלב קוקוס", "מרק עוף")
const DRY = words([
  'רסק', 'מיץ', 'שימורי', 'קפוא', 'אבקת', 'אבקה', 'רוטב', 'חטיף', 'ממרח', 'ריבה', 'ריבת', 'שוקולד',
  'עוגיות', 'עוגה', 'עוגת', 'בטעם', 'מיובש', 'יבש', 'חמוץ', 'חמוצ', 'כבוש', 'חלבה', 'דגני', 'לחם', 'מרק',
  'שמן ', 'שמני', 'חומץ', 'טונה', 'תבלין', 'מלח', 'תה ', 'קפה', 'סירופ', 'סילאן', 'פסטה', 'אורז', 'קמח', 'סוכר',
  'יין', 'בירה', 'סודה', 'קולה', 'משקה', 'לימונדה', 'חלב קוקוס', 'חלב שקדים', 'חלב סויה', 'חלב שיבולת',
  'חמאת בוטנים', 'פלפל שחור', 'פלפל לבן', 'שום גבישי', 'בצל מטוגן', 'קרקר', 'ביסלי', 'במבה', 'ציפס',
  'פופקורן', 'קטשופ', 'בורקס', 'פיצה', 'גלידה', 'מלאווח', 'גחנון', 'סבון', 'שמפו', 'מרכך', 'נייר',
  'טישו', 'מגבונ', 'אקונומיקה', 'נוזל', 'משחת', 'חיתול',
])

const MEAT = words([
  'בשר', 'עוף', 'עופות', 'חזה', 'שניצל', 'כרעיים', 'שוקיים', 'כנפיים', 'פרגי', 'הודו', 'קבב', 'המבורגר',
  'נקניק', 'פסטרמה', 'סלמי', 'סטייק', 'אנטריקוט', 'צלעות', 'צלי', 'אסאדו', 'כבד ', 'קציצות', 'שווארמה',
  'בקר', 'טלה', 'כבש', 'נתחי', 'מרגז', 'בייקון', 'לבבות', 'דג ', 'דגים', 'סלמון', 'דניס', 'אמנון', 'מושט',
  'בורי ', 'לברק', 'פילה',
])

const DAIRY = words([
  'חלב', 'גבינ', 'קוטג', 'יוגורט', 'שמנת', 'חמאה', 'חמאת', 'מעדן', 'מעדנ', 'מילקי', 'דנונה', 'אקטימל',
  'לבנה', 'לאבנה', 'צפתית', 'בולגרית', 'מוצרלה', 'פרמז', 'צהובה', 'ריקוטה', 'מסקרפונה', 'פטה ', 'חלומי',
  'קשקבל', 'שוקו ', 'ביצ', 'מרגרינה', 'קפיר', 'יופלה', 'גמדים', 'פודינג', 'קרם פרש', 'טופו',
])

const PRODUCE = words([
  'ירק', 'פירות', 'פרי ', 'תפוח', 'תפוז', 'תפוא', 'עגבני', 'מלפפון', 'גזר', 'בצל', 'שום ', 'פלפל', 'חסה',
  'כרוב', 'ברוקולי', 'קישוא', 'זוקיני', 'חציל', 'בטטה', 'תירס', 'פטריות', 'פטרוזיליה', 'כוסברה', 'שמיר',
  'נענע', 'בזיליקום', 'עירית', 'סלרי', 'סלק', 'צנון', 'דלעת', 'דלורית', 'קולורבי', 'שומר ', 'תרד', 'קייל',
  'רוקט', 'נבט', 'לפת', 'ארטישוק', 'אספרגוס', 'במיה', 'שעועית ירוקה', 'גינגר', 'אבוקדו', 'לימון', 'ליים ',
  'בננ', 'ענב', 'אבטיח', 'מלון ', 'מלונים', 'אגס', 'אפרסק', 'נקטרינ', 'שזיף', 'משמש', 'תות', 'דובדבנ', 'רימון',
  'מנגו', 'אננס', 'קיווי', 'קלמנטינ', 'אשכולי', 'פומלה', 'תמר', 'תאנ', 'אפרסמון', 'ליצי', 'פסיפלורה',
  'אוכמניות', 'פטל',
])

/** שם מנורמל: בלי כמויות, ניקוד, גרשיים וסימני פיסוק. משמש גם כמפתח לכללים שנלמדו */
export const normalizeItem = (s: string) =>
  noFinals(s.toLowerCase())
    .replace(/[֑-ׇ"'׳״`]/g, '')
    .replace(/[\d.,\-_/\\()*#:;!?+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function has(name: string, keywords: string[]) {
  const padded = ` ${name} `
  return keywords.some((k) => padded.includes(' ' + k) || padded.includes(' ה' + k) || padded.includes(' ו' + k))
}

/** מחלקה לפריט: קודם כלל שנלמד (תיקון ידני או AI), אחרת לפי מילות מפתח. null = לא מזוהה */
export function classifyItem(name: string, rules: Record<string, Section> = {}): Section | null {
  const n = normalizeItem(name)
  if (rules[n]) return rules[n]
  if (has(n, DRY)) return 'dry'
  if (has(n, MEAT)) return 'meat'
  if (has(n, DAIRY)) return 'dairy'
  if (has(n, PRODUCE)) return 'produce'
  return null
}

const AI_TIMEOUT_MS = 8000

/**
 * שואל את ה-AI על הפריטים שהמילון לא מכיר, בקריאה אחת לכולם, ושומר את התשובות ככללים
 * כדי שבפעם הבאה הסיווג יהיה מיידי. כל כשל (רשת, מכסה, זמן) פשוט מחזיר רשימה ריקה.
 */
async function classifyWithAi(householdId: string, names: string[]): Promise<Record<string, Section>> {
  try {
    const { data, error } = await Promise.race([
      supabase.functions.invoke('classify-shopping', { body: { household_id: householdId, items: names } }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), AI_TIMEOUT_MS)),
    ])
    const sections: unknown[] = error || !Array.isArray(data?.sections) ? [] : data.sections
    const found: Record<string, Section> = {}
    names.forEach((name, i) => {
      const key = normalizeItem(name)
      const section = sections[i]
      if (key && SECTIONS.some((s) => s.id === section)) found[key] = section as Section
    })
    const rows = Object.entries(found).map(([name, section]) => ({ household_id: householdId, name, section }))
    if (rows.length) await supabase.from('shopping_rules').upsert(rows, { onConflict: 'household_id,name' })
    return found
  } catch {
    return {}
  }
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
  const unknown = names.filter((name) => classifyItem(name, rules) === null)
  const learned = unknown.length ? await classifyWithAi(householdId, unknown) : {}
  const all = { ...rules, ...learned }
  const res = await supabase
    .from('shopping_items')
    // גם ה-AI לא ידע (או לא זמין) = יבשים, באמצע הרשימה
    .insert(names.map((name) => ({ household_id: householdId, name, section: classifyItem(name, all) ?? 'dry' })))
    .select(COLUMNS)
  return { data: res.data as ShoppingItem[] | null, error: res.error, learned }
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
