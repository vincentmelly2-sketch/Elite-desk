-- Run this in the Supabase SQL editor (Project > SQL Editor > New query)

create extension if not exists "pgcrypto";

create table if not exists principals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  created_at timestamptz default now()
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  principal_id uuid references principals(id) on delete set null,
  platform text not null check (platform in ('x', 'facebook', 'instagram', 'press')),
  content text not null,
  status text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'rejected')),
  author text,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists posts_set_updated_at on posts;
create trigger posts_set_updated_at
before update on posts
for each row execute procedure set_updated_at();

alter table principals enable row level security;
alter table posts enable row level security;

create policy "authenticated read principals" on principals
  for select using (auth.role() = 'authenticated');
create policy "authenticated write principals" on principals
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated read posts" on posts
  for select using (auth.role() = 'authenticated');
create policy "authenticated write posts" on posts
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into principals (name, role) values
  ('Hon. A. Wanjiru', 'Senator, Nairobi County'),
  ('Kestrel Holdings', 'Corporate — CEO office'),
  ('M. Otieno', 'Recording artist');
