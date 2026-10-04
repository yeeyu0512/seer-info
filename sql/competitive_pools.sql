create table if not exists public.competitive_pools (
    id uuid primary key default gen_random_uuid(),
    name text not null check (btrim(name) <> ''),
    start_at timestamptz not null,
    end_at timestamptz not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint competitive_pools_valid_period check (end_at > start_at)
);

create table if not exists public.competitive_pool_characters (
    id uuid primary key default gen_random_uuid(),
    competitive_pool_id uuid not null references public.competitive_pools(id) on delete cascade,
    seer_pet_id bigint not null check (seer_pet_id > 0),
    pet_name text not null check (btrim(pet_name) <> ''),
    pool_type text not null check (pool_type in ('banned', 'restricted', 'semi_restricted')),
    created_at timestamptz not null default now(),
    constraint competitive_pool_characters_unique_pet unique (competitive_pool_id, seer_pet_id)
);

create index if not exists competitive_pools_period_idx
    on public.competitive_pools (start_at desc, end_at);
create index if not exists competitive_pool_characters_pool_type_idx
    on public.competitive_pool_characters (competitive_pool_id, pool_type, seer_pet_id);

alter table public.competitive_pools enable row level security;
alter table public.competitive_pool_characters enable row level security;

revoke all on public.competitive_pools from public, anon, authenticated;
revoke all on public.competitive_pool_characters from public, anon, authenticated;

grant select on public.competitive_pools to anon, authenticated;
grant insert, update, delete on public.competitive_pools to authenticated;
grant select on public.competitive_pool_characters to anon, authenticated;
grant insert, update, delete on public.competitive_pool_characters to authenticated;

drop policy if exists "Anyone can read current competitive pools" on public.competitive_pools;
create policy "Anyone can read current competitive pools"
    on public.competitive_pools
    for select
    to anon, authenticated
    using (start_at <= now() and end_at > now());

drop policy if exists "Admins can read all competitive pools" on public.competitive_pools;
create policy "Admins can read all competitive pools"
    on public.competitive_pools
    for select
    to authenticated
    using (public.is_admin());

drop policy if exists "Admins can manage competitive pools" on public.competitive_pools;
create policy "Admins can manage competitive pools"
    on public.competitive_pools
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

drop policy if exists "Anyone can read current competitive pool characters" on public.competitive_pool_characters;
create policy "Anyone can read current competitive pool characters"
    on public.competitive_pool_characters
    for select
    to anon, authenticated
    using (
        exists (
            select 1
            from public.competitive_pools cp
            where cp.id = competitive_pool_id
              and cp.start_at <= now()
              and cp.end_at > now()
        )
    );

drop policy if exists "Admins can read all competitive pool characters" on public.competitive_pool_characters;
create policy "Admins can read all competitive pool characters"
    on public.competitive_pool_characters
    for select
    to authenticated
    using (public.is_admin());

drop policy if exists "Admins can manage competitive pool characters" on public.competitive_pool_characters;
create policy "Admins can manage competitive pool characters"
    on public.competitive_pool_characters
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

notify pgrst, 'reload schema';
