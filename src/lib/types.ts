export type Kind = 'expense' | 'income'

export type Category = { id: string; name: string; icon: string; kind: Kind; created_at?: string }

// הכנסות והוצאות נשמרות באותה טבלה ומובדלות לפי kind
export type Expense = {
  id: string
  user_id: string
  amount: number
  title: string
  merchant: string | null
  category_id: string | null
  spent_at: string
  recurring_id: string | null
  kind: Kind
}

export type Recurring = {
  id: string
  amount: number
  title: string
  category_id: string | null
  day_of_month: number
  kind: Kind
}

// תקציב חודשי חוזר. category_id ריק = התקציב הכולל
export type Budget = { key: string; category_id: string | null; amount: number }

export type Household = { id: string; name: string; invite_code: string }
