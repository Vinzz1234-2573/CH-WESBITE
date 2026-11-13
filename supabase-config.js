/* ════════════════════════════════════════════════════════════════════════════
   Children Home website: connection to the Supabase database
   Used by the Home page (Programs), the Moments page and admin.html.

   Paste your two values from Supabase:
     • url: Project Settings → Data API → Project URL   (looks like https://abcd1234.supabase.co)
     • key: Project Settings → API Keys → the PUBLISHABLE key (starts with sb_publishable_)
            or, on older projects, the "anon public" key (starts with eyJ)

   These two values are meant to be public: the security rules in
   supabase/children-home-setup.sql decide what anyone can do with them.
   NEVER paste the "secret" or "service_role" key here.

   While these are empty, the website works exactly as before (no Programs section,
   no database moments) and admin.html shows how to connect.
   ════════════════════════════════════════════════════════════════════════════ */
window.CH_SUPABASE = {
  url: 'https://nnljtbhislaowcztqaxd.supabase.co',
  key: 'sb_publishable_BkXaZEWCCeZAA5ajTZ-yIw_-k7LGGQ8'
};
