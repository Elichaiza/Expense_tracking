import { createClient } from '@supabase/supabase-js'

// ההתחברות נשמרת במכשיר ומתחדשת לבד, כך שלא צריך להקליד סיסמה בכל פתיחה
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } },
)
