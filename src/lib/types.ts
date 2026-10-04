export type Category = { id: string; name: string; icon: string }

export type Expense = {
  id: string
  user_id: string
  amount: number
  title: string
  merchant: string | null
  category_id: string | null
  spent_at: string
}

export type Household = { id: string; name: string; invite_code: string }
