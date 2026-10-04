export type Category = { id: string; name: string; icon: string }

export type Expense = {
  id: string
  user_id: string
  amount: number
  title: string
  merchant: string | null
  category_id: string | null
  spent_at: string
  recurring_id: string | null
}

export type Recurring = {
  id: string
  amount: number
  title: string
  category_id: string | null
  day_of_month: number
}

export type Household = { id: string; name: string; invite_code: string }
