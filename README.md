# Flaky Egg Distributor

A phone-friendly web app for running an egg distribution business. It covers sales (including part payments), customers and what they owe, payments, orders, stock, expenses, profit, and Excel downloads.

Built with Next.js 14 and Supabase, and hosted on Vercel.

---

## Going live (about 20 minutes)

### 1. Set up the database in Supabase
1. Go to [supabase.com](https://supabase.com) → **New project**. Name it `flaky-egg`, choose a strong database password, and pick the region closest to Nigeria (e.g. **West EU (London)**).
2. When the project is ready, open **SQL Editor** → **New query**.
3. Open [`supabase/schema.sql`](supabase/schema.sql) from this repo, copy **all** of it, paste it in, and click **Run**. You should see "Success".

### 2. Create the owner's login
1. In Supabase, go to **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter the owner's email and a password, and tick **Auto Confirm User**.
3. The **first** user created automatically becomes the **owner**.
4. Next, go to **Authentication** → **Sign In / Providers** (on some projects this is under **Settings**) and turn **off** "Allow new users to sign up". After that, nobody else can create an account.

### 3. Put the app online with Vercel
1. In Supabase, go to **Project Settings** → **API** and copy the **Project URL** and the **anon public** key.
   ⚠️ Never use or share the `service_role` key. The app doesn't need it.
2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → import `porsiekings/flaky-egg-app`.
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = the Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon public key
4. Click **Deploy**. When it finishes, you'll have a link like `flaky-egg-app.vercel.app`.
5. Back in Supabase, go to **Authentication** → **URL Configuration** and set **Site URL** to that link.

### 4. First steps for the owner
1. Open the link on her phone and sign in.
2. Add it to the home screen:
   - **Android (Chrome):** ⋮ menu → **Add to Home screen**.
   - **iPhone (Safari):** Share → **Add to Home Screen**.
3. Go to **More → Settings** and set the crate price, the low-stock warning level, and **opening stock** (crates in the store today).
4. When eggs arrive, go to **Stock → Stock arrived** and enter the **cost per crate**. The app needs this to work out profit.

From now on, every change pushed to the `main` branch on GitHub goes live automatically within a minute or two.

---

## How the numbers work
- **A customer's balance** is everything they've bought minus everything they've paid.
- **Payments clear the oldest unpaid sales first.** A sale shows "Paid" once the customer's payments cover it.
- **Stock** = opening stock + crates arrived − crates sold − spoilt ± count corrections.
- **Profit** = sales − (crates sold × average cost per crate) − expenses.

## Who can do what
| | Owner | Staff |
|---|---|---|
| Record sales, payments, orders, stock | ✅ | ✅ |
| Edit or delete records | ✅ | — |
| Expenses, profit, reports, downloads, settings | ✅ | — |

### Adding staff later
1. Supabase → **Authentication** → **Users** → **Add user** (tick Auto Confirm).
2. Supabase → **SQL Editor**, run this (change the name and email):
   ```sql
   insert into public.members (user_id, full_name, role)
   select id, 'Staff Name', 'staff' from auth.users where email = 'staff@example.com';
   ```
3. To remove someone: `delete from public.members where user_id = (select id from auth.users where email = 'staff@example.com');`

## Running it on a computer (for developers)
```bash
cp .env.example .env.local   # fill in the two values
npm install
npm run dev                  # http://localhost:3000
```

## Backups
Supabase's free plan keeps limited backups. Once a month, download everything from **Reports → Download for Excel** and keep the files safe. Supabase's paid plan adds daily backups.
