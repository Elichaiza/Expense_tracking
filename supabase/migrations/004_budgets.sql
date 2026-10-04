-- תקציבים: תקציב כולל לחודש + תקציב לכל קטגוריית הוצאה. חוזרים כל חודש לבד.
-- category_key הוא 'total' לתקציב הכולל, או מזהה הקטגוריה. כך אפשר upsert פשוט.

create table if not exists budgets (
  household_id uuid not null references households(id) on delete cascade,
  category_key text not null,
  category_id uuid references categories(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  primary key (household_id, category_key)
);

alter table budgets enable row level security;

drop policy if exists budgets_all on budgets;
create policy budgets_all on budgets for all
  using (is_member(household_id)) with check (is_member(household_id));
