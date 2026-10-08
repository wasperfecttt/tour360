-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query)

-- Tours: one tour = one apartment/object, owned by a client user
create table if not exists tours (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Новый тур',
  description text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Panoramas: one row per room/scene inside a tour
create table if not exists panoramas (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid references tours(id) on delete cascade not null,
  room_name text not null default 'Комната',
  storage_path text not null,       -- path inside the "panoramas" storage bucket
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table tours enable row level security;
alter table panoramas enable row level security;

-- Owners can fully manage their own tours
create policy "owners manage own tours"
  on tours for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Anyone (including anonymous visitors) can read a published tour
create policy "public can read published tours"
  on tours for select
  using (is_published = true);

-- Panoramas follow the same rule via their parent tour
create policy "owners manage own panoramas"
  on panoramas for all
  using (exists (select 1 from tours where tours.id = panoramas.tour_id and tours.owner_id = auth.uid()))
  with check (exists (select 1 from tours where tours.id = panoramas.tour_id and tours.owner_id = auth.uid()));

create policy "public can read panoramas of published tours"
  on panoramas for select
  using (exists (select 1 from tours where tours.id = panoramas.tour_id and tours.is_published = true));

-- Storage bucket for panorama images (create via Dashboard -> Storage -> New bucket -> "panoramas", public)
-- Then run:
insert into storage.buckets (id, name, public)
values ('panoramas', 'panoramas', true)
on conflict (id) do nothing;

create policy "public read panoramas bucket"
  on storage.objects for select
  using (bucket_id = 'panoramas');

create policy "authenticated upload panoramas bucket"
  on storage.objects for insert
  with check (bucket_id = 'panoramas' and auth.role() = 'authenticated');

create policy "owners delete own panorama files"
  on storage.objects for delete
  using (bucket_id = 'panoramas' and auth.role() = 'authenticated' and owner = auth.uid());
