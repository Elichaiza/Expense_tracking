-- הרץ את הקובץ הזה ב-Supabase: SQL Editor -> New query -> Run

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  icon text not null default '🏷️',
  created_at timestamptz not null default now(),
  unique (household_id, name)
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id),
  amount numeric(12,2) not null check (amount >= 0),
  title text not null,
  merchant text,
  category_id uuid references categories(id) on delete set null,
  spent_at date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists expenses_household_date on expenses (household_id, spent_at desc);

-- חנות -> קטגוריה (ישמש בהמשך לסיווג אוטומטי)
create table if not exists merchant_rules (
  household_id uuid not null references households(id) on delete cascade,
  merchant text not null,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (household_id, merchant)
);

-- האם המשתמש הנוכחי חבר במשפחה
create or replace function is_member(hid uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

-- RLS
alter table households enable row level security;
alter table household_members enable row level security;
alter table categories enable row level security;
alter table expenses enable row level security;
alter table merchant_rules enable row level security;

drop policy if exists households_select on households;
create policy households_select on households for select using (is_member(id));

drop policy if exists members_select on household_members;
create policy members_select on household_members for select using (is_member(household_id));

drop policy if exists categories_all on categories;
create policy categories_all on categories for all
  using (is_member(household_id)) with check (is_member(household_id));

drop policy if exists expenses_all on expenses;
create policy expenses_all on expenses for all
  using (is_member(household_id)) with check (is_member(household_id));

drop policy if exists rules_all on merchant_rules;
create policy rules_all on merchant_rules for all
  using (is_member(household_id)) with check (is_member(household_id));

-- יצירת משפחה חדשה (כולל קטגוריות ברירת מחדל)
create or replace function create_household(p_name text, p_display_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into households (name) values (p_name) returning id into hid;
  insert into household_members (household_id, user_id, display_name)
    values (hid, auth.uid(), p_display_name);
  insert into categories (household_id, name, icon) values
    (hid, 'סופר ומכולת', '🛒'), (hid, 'מסעדות וקפה', '🍽️'), (hid, 'דלק ותחבורה', '⛽'),
    (hid, 'חשבונות', '💡'), (hid, 'דיור', '🏠'), (hid, 'ילדים', '🧸'),
    (hid, 'בריאות', '💊'), (hid, 'ביגוד', '👕'), (hid, 'בילויים', '🎉'),
    (hid, 'קניות', '🛍️'), (hid, 'אחר', '📦');
  return hid;
end $$;

-- הצטרפות למשפחה קיימת בעזרת קוד הזמנה
create or replace function join_household(p_code text, p_display_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select id into hid from households where invite_code = lower(trim(p_code));
  if hid is null then raise exception 'invalid code'; end if;
  insert into household_members (household_id, user_id, display_name)
    values (hid, auth.uid(), p_display_name)
    on conflict do nothing;
  return hid;
end $$;

-- עדכון בזמן אמת
alter publication supabase_realtime add table expenses;
