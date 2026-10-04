-- הוצאות קבועות (חוזרות כל חודש)
-- הרץ ב-Supabase: SQL Editor -> New query -> Run

create table if not exists recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id),
  amount numeric(12,2) not null check (amount >= 0),
  title text not null,
  merchant text,
  category_id uuid references categories(id) on delete set null,
  day_of_month smallint not null check (day_of_month between 1 and 31),
  start_date date not null,
  active boolean not null default true,
  last_generated date,
  created_at timestamptz not null default now()
);

alter table expenses
  add column if not exists recurring_id uuid references recurring_expenses(id) on delete set null;

-- מונע כפילות גם אם שני בני משפחה פותחים את האפליקציה באותו רגע
create unique index if not exists expenses_recurring_unique
  on expenses (recurring_id, spent_at) where recurring_id is not null;

alter table recurring_expenses enable row level security;

drop policy if exists recurring_all on recurring_expenses;
create policy recurring_all on recurring_expenses for all
  using (is_member(household_id)) with check (is_member(household_id));

-- יוצרת הוצאות אמיתיות מכל תבנית עד היום. בטוחה להרצה חוזרת.
-- הוצאה שנמחקה ידנית לא חוזרת, כי last_generated זוכר עד איזה תאריך כבר נוצר.
create or replace function generate_recurring(p_household uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  n integer;
  today date := (now() at time zone 'Asia/Jerusalem')::date;
begin
  if not is_member(p_household) then raise exception 'not a member'; end if;

  with due as (
    select
      r.id as rid, r.household_id, r.user_id, r.amount, r.title, r.merchant, r.category_id,
      (m::date + (least(
          r.day_of_month,
          extract(day from (m + interval '1 month' - interval '1 day'))::int
        ) - 1)) as due_date
    from recurring_expenses r
    cross join lateral generate_series(
      date_trunc('month', r.start_date::timestamp),
      date_trunc('month', today::timestamp),
      interval '1 month'
    ) m
    where r.household_id = p_household and r.active
  ),
  todo as (
    select d.* from due d
    join recurring_expenses r on r.id = d.rid
    where d.due_date <= today
      and d.due_date >= r.start_date
      and (r.last_generated is null or d.due_date > r.last_generated)
  ),
  ins as (
    insert into expenses (household_id, user_id, amount, title, merchant, category_id, spent_at, recurring_id)
    select household_id, user_id, amount, title, merchant, category_id, due_date, rid from todo
    on conflict (recurring_id, spent_at) where recurring_id is not null do nothing
    returning 1
  ),
  upd as (
    update recurring_expenses r set last_generated = t.mx
    from (select rid, max(due_date) as mx from todo group by rid) t
    where r.id = t.rid
    returning 1
  )
  select count(*) into n from ins;

  return n;
end $$;
