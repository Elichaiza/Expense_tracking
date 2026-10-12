-- רשימת קניות משותפת למשפחה. כל פריט משויך למחלקה, והרשימה תמיד מוצגת בסדר:
-- ירקות ופירות -> יבשים -> בשרי -> חלבי. פריט שסומן בעגלה פשוט נמחק.

create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  section text not null default 'dry' check (section in ('produce', 'dry', 'meat', 'dairy')),
  created_at timestamptz not null default now()
);
create index if not exists shopping_items_household on shopping_items (household_id, created_at);

-- תיקון ידני של מחלקה נשמר ככלל, כך שבפעם הבאה הפריט יסווג נכון לבד
create table if not exists shopping_rules (
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  section text not null check (section in ('produce', 'dry', 'meat', 'dairy')),
  primary key (household_id, name)
);

alter table shopping_items enable row level security;
alter table shopping_rules enable row level security;

drop policy if exists shopping_items_all on shopping_items;
create policy shopping_items_all on shopping_items for all
  using (is_member(household_id)) with check (is_member(household_id));

drop policy if exists shopping_rules_all on shopping_rules;
create policy shopping_rules_all on shopping_rules for all
  using (is_member(household_id)) with check (is_member(household_id));

-- עדכון בזמן אמת (בטוח להרצה חוזרת)
do $$ begin
  alter publication supabase_realtime add table shopping_items;
exception when duplicate_object then null;
end $$;
