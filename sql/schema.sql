-- Safe to run multiple times.

create table if not exists tours (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Новый тур',
  description text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists panoramas (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid references tours(id) on delete cascade not null,
  room_name text not null default 'Комната',
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table tours enable row level security;
alter table panoramas enable row level security;

drop policy if exists "owners manage own tours" on tours;
create policy "owners manage own tours"
  on tours for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "public can read published tours" on tours;
create policy "public can read published tours"
  on tours for select
  using (is_published = true);

drop policy if exists "owners manage own panoramas" on panoramas;
create policy "owners manage own panoramas"
  on panoramas for all
  using (exists (select 1 from tours where tours.id = panoramas.tour_id and tours.owner_id = auth.uid()))
  with check (exists (select 1 from tours where tours.id = panoramas.tour_id and tours.owner_id = auth.uid()));

drop policy if exists "public can read panoramas of published tours" on panoramas;
create policy "public can read panoramas of published tours"
  on panoramas for select
  using (exists (select 1 from tours where tours.id = panoramas.tour_id and tours.is_published = true));

insert into storage.buckets (id, name, public)
values ('panoramas', 'panoramas', true)
on conflict (id) do nothing;

drop policy if exists "public read panoramas bucket" on storage.objects;
create policy "public read panoramas bucket"
  on storage.objects for select
  using (bucket_id = 'panoramas');

drop policy if exists "authenticated upload panoramas bucket" on storage.objects;
create policy "authenticated upload panoramas bucket"
  on storage.objects for insert
  with check (bucket_id = 'panoramas' and auth.role() = 'authenticated');

drop policy if exists "owners delete own panorama files" on storage.objects;
create policy "owners delete own panorama files"
  on storage.objects for delete
  using (bucket_id = 'panoramas' and auth.role() = 'authenticated' and owner = auth.uid());
