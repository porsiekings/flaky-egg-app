-- Flaky Egg Distributor — database setup (inventory edition)
-- Paste this whole file into Supabase → SQL Editor → New query, then click Run.
-- Safe to run on a new project, and safe to run again after an update.

-- ============ Team members (who may use the app) ============
create table if not exists public.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid());
$$;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid() and role = 'owner');
$$;

-- The first person to sign up becomes the owner automatically.
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
  opening_stock int not null default 0, -- no longer used: opening stock is entered per egg size
  currency text not null default 'NGN',
  updated_at timestamptz not null default now()
);
alter table public.settings add column if not exists aging_days int not null default 10;
alter table public.settings add column if not exists old_days int not null default 14;
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ============ Products (egg sizes, sold by the crate) ============
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sell_price numeric(12,2) not null default 5400 check (sell_price >= 0),
  low_stock_level int not null default 10,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists products_name_unique on public.products (lower(name));
insert into public.products (name, sort_order)
select v.name, v.sort from (values ('Jumbo', 1), ('Large', 2), ('Medium', 3), ('Small', 4)) v(name, sort)
where not exists (select 1 from public.products);

-- ============ Suppliers (farms / people she buys from) ============
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);
create unique index if not exists suppliers_name_unique on public.suppliers (lower(name));

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

-- ============ Purchases (stock she orders from suppliers) ============
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id) on delete restrict,
  ordered_on date not null default current_date,
  expected_on date,
  received_on date,
  status text not null default 'expected' check (status in ('expected', 'received', 'cancelled')),
  transport_cost numeric(12,2) not null default 0 check (transport_cost >= 0),
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  crates_ordered int not null check (crates_ordered > 0),
  crates_received int check (crates_received >= 0),
  unit_cost numeric(12,2) not null check (unit_cost >= 0)
);
create index if not exists purchase_items_purchase_idx on public.purchase_items (purchase_id);

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
alter table public.sales add column if not exists product_id uuid references public.products(id) on delete restrict;
create index if not exists sales_customer_idx on public.sales (customer_id);
create index if not exists sales_date_idx on public.sales (sale_date);
create index if not exists sales_product_idx on public.sales (product_id);

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

-- ============ Customer orders ============
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
alter table public.orders add column if not exists product_id uuid references public.products(id) on delete restrict;

alter table public.sales drop constraint if exists sales_order_fk;
alter table public.sales add constraint sales_order_fk foreign key (order_id) references public.orders(id) on delete set null;

-- ============ Stock movements ============
-- in       = crates received (a batch; its date is the batch date for egg age)
-- opening  = stock she already had when she started using the app (also a batch)
-- spoilt   = cracked / spoilt crates
-- adjust   = count correction (+ or -)
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  moved_on date not null default current_date,
  kind text not null,
  crates int not null,
  unit_cost numeric(12,2),
  supplier text,
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.stock_movements add column if not exists product_id uuid references public.products(id) on delete restrict;
alter table public.stock_movements add column if not exists purchase_id uuid references public.purchases(id) on delete cascade;
alter table public.stock_movements add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;
alter table public.stock_movements drop constraint if exists stock_movements_kind_check;
alter table public.stock_movements add constraint stock_movements_kind_check check (kind in ('in', 'opening', 'spoilt', 'adjust'));
create index if not exists stock_movements_product_idx on public.stock_movements (product_id, moved_on);

-- Older records made before egg sizes existed go to the first size.
update public.sales set product_id = (select id from public.products order by sort_order, created_at limit 1) where product_id is null;
update public.orders set product_id = (select id from public.products order by sort_order, created_at limit 1) where product_id is null;
update public.stock_movements set product_id = (select id from public.products order by sort_order, created_at limit 1) where product_id is null;
alter table public.sales alter column product_id set not null;
alter table public.orders alter column product_id set not null;
alter table public.stock_movements alter column product_id set not null;

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
drop view if exists public.stock_level;
drop view if exists public.stock_by_product;
drop view if exists public.stock_batches;
drop view if exists public.sale_status;
drop view if exists public.customer_balances;

create view public.customer_balances with (security_invoker = true) as
select c.id, c.name, c.phone,
  coalesce(s.total, 0) as total_bought,
  coalesce(s.crates, 0) as crates_bought,
  coalesce(p.total, 0) as total_paid,
  coalesce(s.total, 0) - coalesce(p.total, 0) as balance,
  s.last_sale,
  p.last_payment
from public.customers c
left join (select customer_id, sum(amount) total, sum(crates) crates, max(sale_date) last_sale from public.sales group by customer_id) s on s.customer_id = c.id
left join (select customer_id, sum(amount) total, max(paid_on) last_payment from public.payments group by customer_id) p on p.customer_id = c.id;

-- Each sale's paid/due: a customer's payments clear their oldest sales first.
create view public.sale_status with (security_invoker = true) as
with ordered as (
  select s.*,
    coalesce(sum(s.amount) over (partition by s.customer_id order by s.sale_date, s.created_at, s.id
      rows between unbounded preceding and 1 preceding), 0) as before_amt
  from public.sales s
),
paid as (select customer_id, sum(amount) total from public.payments group by customer_id)
select o.id, o.customer_id, o.product_id, o.sale_date, o.crates, o.unit_price, o.amount, o.order_id, o.notes, o.created_by, o.created_at,
  c.name as customer_name, pr.name as product_name,
  least(o.amount, greatest(0, coalesce(p.total, 0) - o.before_amt)) as paid,
  o.amount - least(o.amount, greatest(0, coalesce(p.total, 0) - o.before_amt)) as due
from ordered o
join public.customers c on c.id = o.customer_id
join public.products pr on pr.id = o.product_id
left join paid p on p.customer_id = o.customer_id;

-- Batches still in the store, oldest sold first (FIFO). One row per delivery with crates left.
create view public.stock_batches with (security_invoker = true) as
with batches as (
  select m.id, m.product_id, m.moved_on, m.crates, m.unit_cost, m.kind, m.supplier_id,
    coalesce(sum(m.crates) over (partition by m.product_id order by m.moved_on, m.created_at, m.id
      rows between unbounded preceding and 1 preceding), 0) as before_crates
  from public.stock_movements m
  where m.kind in ('in', 'opening') and m.crates > 0
),
used as (
  select product_id, sum(crates) crates from (
    select product_id, crates from public.sales
    union all select product_id, crates from public.stock_movements where kind = 'spoilt'
    union all select product_id, -crates from public.stock_movements where kind = 'adjust'
  ) x group by product_id
)
select b.id, b.product_id, b.moved_on, b.kind, b.supplier_id, b.unit_cost, b.crates as crates_in,
  least(b.crates, greatest(0, b.crates + b.before_crates - coalesce(u.crates, 0))) as crates_left
from batches b left join used u on u.product_id = b.product_id;

create view public.stock_by_product with (security_invoker = true) as
select p.id, p.name, p.sell_price, p.low_stock_level, p.sort_order, p.active,
  coalesce(m.crates_in, 0) as crates_in,
  coalesce(s.crates, 0) as crates_sold,
  coalesce(m.crates_spoilt, 0) as crates_spoilt,
  coalesce(m.crates_adjust, 0) as crates_adjust,
  coalesce(m.crates_in, 0) - coalesce(s.crates, 0) - coalesce(m.crates_spoilt, 0) + coalesce(m.crates_adjust, 0) as on_hand,
  coalesce(b.value, 0) as stock_value,
  b.oldest_batch,
  m.avg_cost,
  coalesce(o.crates, 0) as on_order_to_customers,
  coalesce(pi.crates, 0) as incoming
from public.products p
left join (
  select product_id,
    sum(crates) filter (where kind in ('in', 'opening')) crates_in,
    sum(crates) filter (where kind = 'spoilt') crates_spoilt,
    sum(crates) filter (where kind = 'adjust') crates_adjust,
    sum(crates * unit_cost) filter (where kind in ('in', 'opening') and unit_cost is not null)
      / nullif(sum(crates) filter (where kind in ('in', 'opening') and unit_cost is not null), 0) avg_cost
  from public.stock_movements group by product_id
) m on m.product_id = p.id
left join (select product_id, sum(crates) crates from public.sales group by product_id) s on s.product_id = p.id
left join (
  select product_id, sum(crates_left * coalesce(unit_cost, 0)) value, min(moved_on) filter (where crates_left > 0) oldest_batch
  from public.stock_batches group by product_id
) b on b.product_id = p.id
left join (select product_id, sum(crates) crates from public.orders where status = 'pending' group by product_id) o on o.product_id = p.id
left join (
  select i.product_id, sum(i.crates_ordered) crates from public.purchase_items i
  join public.purchases pu on pu.id = i.purchase_id where pu.status = 'expected' group by i.product_id
) pi on pi.product_id = p.id;

-- ============ Security: only team members can see or change anything ============
alter table public.members enable row level security;
alter table public.settings enable row level security;
alter table public.products enable row level security;
alter table public.suppliers enable row level security;
alter table public.customers enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
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

drop policy if exists "members read" on public.products;
create policy "members read" on public.products for select using (public.is_member());
drop policy if exists "owner manages" on public.products;
create policy "owner manages" on public.products for all using (public.is_owner()) with check (public.is_owner());

-- Day-to-day records: every member can read and add; only the owner can edit or delete.
do $$
declare t text;
begin
  foreach t in array array['customers', 'suppliers', 'sales', 'payments', 'orders', 'stock_movements', 'purchases', 'purchase_items'] loop
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

-- Members may mark customer orders delivered/cancelled, and receive purchases.
drop policy if exists "members update orders" on public.orders;
create policy "members update orders" on public.orders for update using (public.is_member()) with check (public.is_member());
drop policy if exists "members update purchases" on public.purchases;
create policy "members update purchases" on public.purchases for update using (public.is_member()) with check (public.is_member());
drop policy if exists "members update purchase items" on public.purchase_items;
create policy "members update purchase items" on public.purchase_items for update using (public.is_member()) with check (public.is_member());

-- Expenses (money, profit) are owner-only.
drop policy if exists "owner expenses" on public.expenses;
create policy "owner expenses" on public.expenses for all using (public.is_owner()) with check (public.is_owner());
