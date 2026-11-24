-- Flaky Egg Distributor — database setup
-- Paste this whole file into Supabase → SQL Editor → New query, then click Run.
-- It is safe to run on a new, empty project.

-- ============ Team members (who may use the app) ============
create table if not exists public.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

-- Helper: is the signed-in user a member? Is the user the owner?
create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid());
$$;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid() and role = 'owner');
$$;

-- The first person to sign up becomes the owner automatically.
-- Anyone after that must be added by the owner (see README, "Adding staff later").
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.members) then
    insert into public.members (user_id, full_name, role)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'owner');
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ Business settings (one row) ============
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  business_name text not null default 'Flaky Egg Distributor',
  default_crate_price numeric(12,2) not null default 5400,
  low_stock_level int not null default 20,
  opening_stock int not null default 0,
  currency text not null default 'NGN',
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ============ Customers ============
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);
create unique index if not exists customers_name_unique on public.customers (lower(name));

-- ============ Sales ============
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  sale_date date not null default current_date,
  crates int not null check (crates > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  amount numeric(14,2) generated always as (crates * unit_price) stored,
  order_id uuid,
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists sales_customer_idx on public.sales (customer_id);
create index if not exists sales_date_idx on public.sales (sale_date);

-- ============ Payments (money received from customers) ============
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  sale_id uuid references public.sales(id) on delete set null,
  paid_on date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  method text not null default 'cash' check (method in ('cash', 'transfer', 'pos', 'other')),
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists payments_customer_idx on public.payments (customer_id);

-- ============ Orders ============
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  crates int not null check (crates > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  due_date date,
  status text not null default 'pending' check (status in ('pending', 'delivered', 'cancelled')),
  sale_id uuid references public.sales(id) on delete set null,
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.sales drop constraint if exists sales_order_fk;
alter table public.sales add constraint sales_order_fk foreign key (order_id) references public.orders(id) on delete set null;

-- ============ Stock movements (crates in, spoilt, corrections) ============
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  moved_on date not null default current_date,
  kind text not null check (kind in ('in', 'spoilt', 'adjust')),
  crates int not null,                 -- positive for 'in'/'spoilt'; + or - for 'adjust'
  unit_cost numeric(12,2),             -- cost per crate for 'in'
  supplier text,
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- ============ Expenses ============
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null default current_date,
  category text not null,
  amount numeric(14,2) not null check (amount > 0),
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- ============ Views ============
create or replace view public.customer_balances with (security_invoker = true) as
select c.id, c.name, c.phone,
  coalesce(s.total, 0) as total_bought,
  coalesce(s.crates, 0) as crates_bought,
  coalesce(p.total, 0) as total_paid,
  coalesce(s.total, 0) - coalesce(p.total, 0) as balance,
  s.last_sale,
  p.last_payment
from public.customers c
left join (
  select customer_id, sum(amount) total, sum(crates) crates, max(sale_date) last_sale
  from public.sales group by customer_id
) s on s.customer_id = c.id
left join (
  select customer_id, sum(amount) total, max(paid_on) last_payment from public.payments group by customer_id
) p on p.customer_id = c.id;

-- Each sale's paid/due: a customer's payments clear their oldest sales first.
create or replace view public.sale_status with (security_invoker = true) as
with ordered as (
  select s.*,
    coalesce(sum(s.amount) over (partition by s.customer_id order by s.sale_date, s.created_at, s.id
      rows between unbounded preceding and 1 preceding), 0) as before_amt
  from public.sales s
),
paid as (select customer_id, sum(amount) total from public.payments group by customer_id)
select o.id, o.customer_id, o.sale_date, o.crates, o.unit_price, o.amount, o.order_id, o.notes, o.created_by, o.created_at,
  c.name as customer_name,
  least(o.amount, greatest(0, coalesce(p.total, 0) - o.before_amt)) as paid,
  o.amount - least(o.amount, greatest(0, coalesce(p.total, 0) - o.before_amt)) as due
from ordered o
join public.customers c on c.id = o.customer_id
left join paid p on p.customer_id = o.customer_id;

create or replace view public.stock_level with (security_invoker = true) as
select
  (select opening_stock from public.settings where id = 1)
  + coalesce((select sum(crates) from public.stock_movements where kind = 'in'), 0)
  + coalesce((select sum(crates) from public.stock_movements where kind = 'adjust'), 0)
  - coalesce((select sum(crates) from public.stock_movements where kind = 'spoilt'), 0)
  - coalesce((select sum(crates) from public.sales), 0) as crates_in_stock;

-- ============ Security: only team members can see or change anything ============
alter table public.members enable row level security;
alter table public.settings enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.payments enable row level security;
alter table public.orders enable row level security;
alter table public.stock_movements enable row level security;
alter table public.expenses enable row level security;

drop policy if exists "members read members" on public.members;
create policy "members read members" on public.members for select using (public.is_member());
drop policy if exists "owner manages members" on public.members;
create policy "owner manages members" on public.members for all using (public.is_owner()) with check (public.is_owner());

drop policy if exists "members read settings" on public.settings;
create policy "members read settings" on public.settings for select using (public.is_member());
drop policy if exists "owner updates settings" on public.settings;
create policy "owner updates settings" on public.settings for update using (public.is_owner()) with check (public.is_owner());

-- Day-to-day records: every member can read and add; only the owner can edit or delete.
do $$
declare t text;
begin
  foreach t in array array['customers', 'sales', 'payments', 'orders', 'stock_movements'] loop
    execute format('drop policy if exists "members read" on public.%I', t);
    execute format('create policy "members read" on public.%I for select using (public.is_member())', t);
    execute format('drop policy if exists "members add" on public.%I', t);
    execute format('create policy "members add" on public.%I for insert with check (public.is_member())', t);
    execute format('drop policy if exists "owner edits" on public.%I', t);
    execute format('create policy "owner edits" on public.%I for update using (public.is_owner()) with check (public.is_owner())', t);
    execute format('drop policy if exists "owner deletes" on public.%I', t);
    execute format('create policy "owner deletes" on public.%I for delete using (public.is_owner())', t);
  end loop;
end $$;

-- Members may mark orders delivered/cancelled (status change).
drop policy if exists "members update orders" on public.orders;
create policy "members update orders" on public.orders for update using (public.is_member()) with check (public.is_member());

-- Expenses (money, profit) are owner-only.
drop policy if exists "owner expenses" on public.expenses;
create policy "owner expenses" on public.expenses for all using (public.is_owner()) with check (public.is_owner());
