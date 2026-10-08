-- Run this in Supabase SQL Editor (safe to run multiple times)

create table if not exists hotspots (
  id uuid primary key default gen_random_uuid(),
  from_panorama_id uuid references panoramas(id) on delete cascade not null,
  target_panorama_id uuid references panoramas(id) on delete cascade not null,
  pitch double precision not null,
  yaw double precision not null,
  created_at timestamptz not null default now()
);

alter table hotspots enable row level security;

drop policy if exists "owners manage own hotspots" on hotspots;
create policy "owners manage own hotspots"
  on hotspots for all
  using (
    exists (
      select 1 from panoramas p
      join tours t on t.id = p.tour_id
      where p.id = hotspots.from_panorama_id and t.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from panoramas p
      join tours t on t.id = p.tour_id
      where p.id = hotspots.from_panorama_id and t.owner_id = auth.uid()
    )
  );

drop policy if exists "public can read hotspots of published tours" on hotspots;
create policy "public can read hotspots of published tours"
  on hotspots for select
  using (
    exists (
      select 1 from panoramas p
      join tours t on t.id = p.tour_id
      where p.id = hotspots.from_panorama_id and t.is_published = true
    )
  );
