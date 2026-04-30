-- Contact form submissions (inserted by Netlify function with service role only).
-- Row Level Security: no policies for anon/authenticated — only the service role can access.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  subject text not null,
  message text not null,
  locale text not null default 'sq'
);

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

-- Intentionally no SELECT/INSERT policies for anon or authenticated users.
-- Backend uses SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.
