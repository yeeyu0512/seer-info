-- Apply after competitive_pools.sql. Existing untagged periods belong to Taiwan.
-- Transactional: an existing overlap aborts the entire migration; no periods are removed.
begin;

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
set local search_path = public, extensions;

alter table public.competitive_pools add column if not exists server text;
update public.competitive_pools set server = 'tw' where server is null;
alter table public.competitive_pools alter column server set default 'tw';
alter table public.competitive_pools alter column server set not null;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conrelid = 'public.competitive_pools'::regclass
          and conname = 'competitive_pools_valid_server'
    ) then
        alter table public.competitive_pools add constraint competitive_pools_valid_server
            check (server in ('tw', 'cn'));
    end if;

    if not exists (
        select 1 from pg_constraint
        where conrelid = 'public.competitive_pools'::regclass
          and conname = 'competitive_pools_server_period_excl'
    ) then
        alter table public.competitive_pools add constraint competitive_pools_server_period_excl
            exclude using gist (server with =, tstzrange(start_at, end_at, '[)') with &&);
    end if;
end $$;

create index if not exists competitive_pools_server_period_idx
    on public.competitive_pools (server, start_at desc, end_at);

notify pgrst, 'reload schema';
commit;
