-- הכנסות: משתמשות באותן טבלאות של הוצאות, עם עמודה kind ('expense' / 'income')
-- הרץ ב-Supabase: SQL Editor -> New query -> Run

alter table categories
  add column if not exists kind text not null default 'expense' check (kind in ('expense', 'income'));
alter table expenses
  add column if not exists kind text not null default 'expense' check (kind in ('expense', 'income'));
alter table recurring_expenses
  add column if not exists kind text not null default 'expense' check (kind in ('expense', 'income'));

-- אותו שם קטגוריה (למשל "אחר") מותר פעם בהוצאות ופעם בהכנסות
alter table categories drop constraint if exists categories_household_id_name_key;
create unique index if not exists categories_unique_name on categories (household_id, kind, name);

-- קטגוריות הכנסה לכל המשפחות הקיימות
insert into categories (household_id, name, icon, kind)
select h.id, v.name, v.icon, 'income'
from households h
cross join (values
  ('משכורת', '💼'), ('עסק ועבודה עצמאית', '🧾'), ('קצבאות', '🏛️'), ('שכר דירה', '🏠'),
  ('מתנות', '🎁'), ('החזרים', '💸'), ('השקעות', '📈'), ('אחר', '📦')
) as v(name, icon)
on conflict do nothing;

-- משפחה חדשה מקבלת גם קטגוריות הכנסה
create or replace function create_household(p_name text, p_display_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into households (name) values (p_name) returning id into hid;
  insert into household_members (household_id, user_id, display_name)
    values (hid, auth.uid(), p_display_name);
  insert into categories (household_id, name, icon, kind) values
    (hid, 'סופר ומכולת', '🛒', 'expense'), (hid, 'מסעדות וקפה', '🍽️', 'expense'),
    (hid, 'דלק ותחבורה', '⛽', 'expense'), (hid, 'חשבונות', '💡', 'expense'),
    (hid, 'דיור', '🏠', 'expense'), (hid, 'ילדים', '🧸', 'expense'),
    (hid, 'בריאות', '💊', 'expense'), (hid, 'ביגוד', '👕', 'expense'),
    (hid, 'בילויים', '🎉', 'expense'), (hid, 'קניות', '🛍️', 'expense'),
    (hid, 'אחר', '📦', 'expense'),
    (hid, 'משכורת', '💼', 'income'), (hid, 'עסק ועבודה עצמאית', '🧾', 'income'),
    (hid, 'קצבאות', '🏛️', 'income'), (hid, 'שכר דירה', '🏠', 'income'),
    (hid, 'מתנות', '🎁', 'income'), (hid, 'החזרים', '💸', 'income'),
    (hid, 'השקעות', '📈', 'income'), (hid, 'אחר', '📦', 'income');
  return hid;
end $$;

-- יצירת הוצאות/הכנסות קבועות: עכשיו מעתיקה גם את kind
create or replace function generate_recurring(p_household uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  n integer;
  today date := (now() at time zone 'Asia/Jerusalem')::date;
begin
  if not is_member(p_household) then raise exception 'not a member'; end if;

  with due as (
    select
      r.id as rid, r.household_id, r.user_id, r.amount, r.title, r.merchant, r.category_id, r.kind,
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
    insert into expenses (household_id, user_id, amount, title, merchant, category_id, kind, spent_at, recurring_id)
    select household_id, user_id, amount, title, merchant, category_id, kind, due_date, rid from todo
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
