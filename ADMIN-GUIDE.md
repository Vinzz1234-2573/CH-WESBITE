# Children Home website: admin page and database

The admin page (`admin.html`) lets staff add **Programs** (Home page, above Credentials) and **Moments** (Moments page), and keeps the **Google Sheets** with your Google Form responses in one place.

Everything is stored in a Supabase database. Until it's connected, the website works exactly as before.

## Files

| File | What it is |
| --- | --- |
| `admin.html` | The admin page (sign in, Programs, Moments, Form responses, Account) |
| `supabase-config.js` | Your Supabase Project URL and publishable key (the only file you edit to connect) |
| `assets/js/ch-data.js` | Shows published programs and moments on the website |
| `supabase/children-home-setup.sql` | Creates the database tables, picture folder and security rules |

## One-time setup (about 15 minutes)

### 1. Create a Supabase project
1. Go to [supabase.com](https://supabase.com), sign in, and click **New project**.
2. Name it `children-home-website`, choose the **Southeast Asia (Singapore)** region, and set a database password (save it somewhere safe).
3. Wait until the project is ready.

Use a **new project** for this website. Everything is named `ch_…` and the picture folder is `ch-media`, so it wouldn't clash with another project's tables, but a separate project keeps the Children Home's data on its own.

### 2. Create the tables
1. In the project, open **SQL Editor → New query**.
2. Open `supabase/children-home-setup.sql`, copy **everything**, paste it in, and click **Run**.
3. You should see "Success. No rows returned". Running it again later is safe; nothing is deleted.

### 3. Create your login
1. **Authentication → Users → Add user → Create new user.**
2. Enter your email and a strong password (12+ characters), tick **Auto Confirm User**, and click **Create user**.

### 4. Make yourself an admin
In **SQL Editor**, run this with **your** email:

```sql
insert into public.ch_admins (user_id, email)
select id, email from auth.users where email = 'your-email@example.com'
on conflict (user_id) do nothing;
```

### 5. Close sign-ups
**Authentication → Sign In / Providers**: switch **off** "Allow new users to sign up". Then only people you add can ever have a login.

### 6. Connect the website
1. **Project Settings → Data API**: copy the **Project URL** (`https://….supabase.co`).
2. **Project Settings → API Keys**: copy the **publishable** key (starts with `sb_publishable_`). On older projects, use the **anon public** key (starts with `eyJ`).
3. Paste both into `supabase-config.js`:
   ```js
   window.CH_SUPABASE = {
     url: 'https://abcd1234.supabase.co',
     key: 'sb_publishable_…'
   };
   ```
4. Commit and push. Never paste the **secret** or **service_role** key anywhere in the website.

### 7. Sign in
Open `your-website/admin.html` and sign in with the email and password from step 3.

## Using the admin page

### Programs
- **Add program**: English title (required), Chinese title, a short summary for the card, a full description for the pop-up (leave a blank line between paragraphs), and a picture (landscape works best; it's resized automatically).
- **Corporate Google Form link**: this form is **for corporate partners only** (companies and organisations, CSR). On the website it's the **Corporate partnership** button, with a note saying it's for companies. Leave it empty to hide the button. Get the link in Google Forms: **Send → link tab → copy**.
- **Donate link**: leave empty to use the main donation page.
- **Order**: smaller numbers show first.
- New programs are **drafts** until you tick **Show on the website** or click **Publish**. The Programs section on the Home page appears as soon as one program is published.

### Moments
- Choose the **type**: Activities, Community, or Appeal (Appeal shows a red tag and ticks the **Donate now** button for you).
- The **date** decides the order (newest first); the website shows the year.
- **Extra photos** appear as small pictures under "Read more"; visitors tap one to see it big.
- Moments added here appear **above** the three older moments, which stay as they are.

### Form responses
1. Open a Google Form → **Responses** tab → **Link to Sheets** (or **View in Sheets**).
2. Copy the sheet's address from the browser.
3. In the admin page, click **Edit** next to the form's name, paste the link, and **Save**.

**Open in Google Sheets** opens the responses in a new tab. **Show here** previews the sheet inside the admin page; this only works when you're signed in to Google in the same browser with access to that sheet.

**Keep the sheets private.** They hold people's names and phone numbers. Leave sharing on **Restricted** (your team only) and never use **Publish to the web**.

### Account
Change your password. If you forget it, another admin (or anyone with the Supabase login) can set a new one under **Authentication → Users**.

## Add or remove an admin
- **Add:** create their login (step 3), then run step 4 with their email.
- **Remove:** in **Table Editor → ch_admins**, delete their row (or delete the user under Authentication → Users).

## If something goes wrong
- **Programs don't show on the Home page:** check that at least one program is published and that `supabase-config.js` has your URL and key.
- **"Wrong email or password":** check for typos, or set a new password in Authentication → Users.
- **"No admin access":** the login exists but isn't on the admin list; run step 4 with that email.
- **Free Supabase projects pause after about a week with no activity.** If programs and new moments disappear from the website, open the Supabase dashboard and click **Restore project**. The rest of the website keeps working while it's paused.
