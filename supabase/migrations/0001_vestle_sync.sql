-- Vestle sync schema. Run once in the Supabase SQL editor (or `supabase db push`).
--
-- The app is offline-first: each device keeps its own copy and syncs changes.
-- Rows hold the item as JSON so new app fields don't need a migration.
-- Conflicts resolve last-write-wins on the app's own updated_at; the server never lets an
-- older write overwrite a newer one. synced_at is the server's clock, used as the pull cursor.

create table if not exists public.items (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null,
  data       jsonb,                       -- null once deleted
  deleted    boolean     not null default false,
  updated_at timestamptz not null,        -- when the user last changed it, on their device
  synced_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists items_user_synced on public.items (user_id, synced_at);

create table if not exists public.user_settings (
  user_id    uuid        primary key default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb       not null,
  updated_at timestamptz not null,
  synced_at  timestamptz not null default now()
);

-- Last write wins, by the time the user made the change; stamp the server time on every accepted write.
create or replace function public.vestle_last_write_wins() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return old;                           -- an older edit arrived late: keep what's there
  end if;
  new.synced_at := now();
  return new;
end $$;

drop trigger if exists items_lww on public.items;
create trigger items_lww before insert or update on public.items
  for each row execute function public.vestle_last_write_wins();

drop trigger if exists user_settings_lww on public.user_settings;
create trigger user_settings_lww before insert or update on public.user_settings
  for each row execute function public.vestle_last_write_wins();

-- Each account sees and changes only its own rows.
alter table public.items enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "own items" on public.items;
create policy "own items" on public.items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "own settings" on public.user_settings;
create policy "own settings" on public.user_settings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Item photos and receipts: a private bucket, one folder per account (<user id>/<file>).
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "own photos read" on storage.objects;
create policy "own photos read" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "own photos write" on storage.objects;
create policy "own photos write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "own photos update" on storage.objects;
create policy "own photos update" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "own photos delete" on storage.objects;
create policy "own photos delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
