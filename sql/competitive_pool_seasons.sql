-- Run after competitive_pool_servers.sql, then deploy the matching frontend/admin.
-- Backfills recognized titles without changing pool IDs, periods or character rows.
-- Any unrecognized title, duplicate season/number or invalid relationship rolls back everything.
begin;

lock table public.competitive_pools in share row exclusive mode;

create table if not exists public.competitive_seasons (
    id uuid primary key default gen_random_uuid(),
    server text not null check (server in ('tw', 'cn')),
    name text not null check (name = btrim(name) and name <> '賽季' and char_length(name) between 3 and 100 and right(name, 2) = '賽季'),
    created_at timestamptz not null default now(),
    constraint competitive_seasons_server_name_key unique (server, name),
    constraint competitive_seasons_id_server_key unique (id, server)
);

alter table public.competitive_pools add column if not exists season_id uuid;
alter table public.competitive_pools add column if not exists pool_number integer;

-- Temporary helpers also validate Chinese ordinals rather than guessing ambiguous titles.
create or replace function pg_temp.competitive_chinese_number(value integer)
returns text language plpgsql immutable strict as $$
declare
    remaining integer := value;
    units integer[] := array[1000, 100, 10, 1];
    labels text[] := array['千', '百', '十', ''];
    digits text := '零一二三四五六七八九';
    result text := '';
    pending_zero boolean := false;
    digit integer;
    i integer;
begin
    if value < 1 or value > 9999 then return null; end if;
    for i in 1..4 loop
        digit := remaining / units[i];
        remaining := remaining % units[i];
        if digit > 0 then
            if pending_zero then result := result || '零'; end if;
            result := result || substr(digits, digit + 1, 1) || labels[i];
            pending_zero := false;
        elsif result <> '' and remaining > 0 then pending_zero := true;
        end if;
    end loop;
    return regexp_replace(result, '^一十', '十');
end $$;

create or replace function pg_temp.competitive_parse_number(value text)
returns integer language plpgsql immutable strict as $$
declare
    cleaned text := translate(value, '０１２３４５６７８９兩〇', '0123456789二零');
    result integer := 0;
    digit integer := null;
    unit integer;
    ch text;
    i integer;
begin
    if cleaned ~ '^[0-9]{1,4}$' then
        result := cleaned::integer;
        if result between 1 and 9999 then return result; end if;
        return null;
    end if;
    if cleaned !~ '^[零一二三四五六七八九十百千]+$' then return null; end if;
    for i in 1..char_length(cleaned) loop
        ch := substr(cleaned, i, 1);
        unit := case ch when '千' then 1000 when '百' then 100 when '十' then 10 else null end;
        if unit is not null then
            result := result + coalesce(digit, 1) * unit;
            digit := null;
        else digit := strpos('零一二三四五六七八九', ch) - 1;
        end if;
    end loop;
    result := result + coalesce(digit, 0);
    if pg_temp.competitive_chinese_number(result) = cleaned then return result; end if;
    return null;
end $$;

create temporary table competitive_season_backfill on commit drop as
with titles as (
    select id, server, name,
        regexp_match(btrim(name), '^(.*賽季)[[:space:]]*第[[:space:]]*([^[:space:]]+)[[:space:]]*池$') as parts
    from public.competitive_pools where season_id is null or pool_number is null
)
select id, server, name, btrim(parts[1]) as season_name,
       pg_temp.competitive_parse_number(parts[2]) as pool_number
from titles;

do $$
declare invalid_titles text;
begin
    select string_agg(id::text || ': ' || coalesce(name, '(null)'), E'\n') into invalid_titles
    from competitive_season_backfill
    where season_name is null or season_name = '賽季' or pool_number is null;
    if invalid_titles is not null then
        raise exception 'Unrecognized competitive pool titles. Review and correct legacy titles before rerunning.'
            using detail = invalid_titles;
    end if;
end $$;

insert into public.competitive_seasons (server, name)
select distinct server, season_name from competitive_season_backfill
on conflict (server, name) do nothing;

update public.competitive_pools cp
set season_id = coalesce(cp.season_id, season.id), pool_number = coalesce(cp.pool_number, mapping.pool_number)
from competitive_season_backfill mapping
join public.competitive_seasons season on season.server = mapping.server and season.name = mapping.season_name
where cp.id = mapping.id;

alter table public.competitive_pools alter column season_id set not null;
alter table public.competitive_pools alter column pool_number set not null;
-- Retain original titles for migration review only; new clients never write this column.
alter table public.competitive_pools alter column name drop not null;
comment on column public.competitive_pools.name is 'Legacy title retained for audit; display titles derive from competitive_seasons.name and pool_number.';

do $$
begin
    if not exists (select 1 from pg_constraint where conrelid = 'public.competitive_pools'::regclass and conname = 'competitive_pools_valid_number') then
        alter table public.competitive_pools add constraint competitive_pools_valid_number check (pool_number between 1 and 9999);
    end if;
    if not exists (select 1 from pg_constraint where conrelid = 'public.competitive_pools'::regclass and conname = 'competitive_pools_season_server_fkey') then
        alter table public.competitive_pools add constraint competitive_pools_season_server_fkey
            foreign key (season_id, server) references public.competitive_seasons(id, server);
    end if;
    if not exists (select 1 from pg_constraint where conrelid = 'public.competitive_pools'::regclass and conname = 'competitive_pools_season_number_key') then
        alter table public.competitive_pools add constraint competitive_pools_season_number_key unique (season_id, pool_number);
    end if;
end $$;

alter table public.competitive_seasons enable row level security;
revoke all on public.competitive_seasons from public, anon, authenticated;
grant select on public.competitive_seasons to anon, authenticated;
grant insert, update on public.competitive_seasons to authenticated;

drop policy if exists "Anyone can read current competitive seasons" on public.competitive_seasons;
create policy "Anyone can read current competitive seasons" on public.competitive_seasons
    for select to anon, authenticated using (exists (
        select 1 from public.competitive_pools cp
        where cp.season_id = competitive_seasons.id and cp.start_at <= now() and cp.end_at > now()
    ));
drop policy if exists "Admins can read competitive seasons" on public.competitive_seasons;
create policy "Admins can read competitive seasons" on public.competitive_seasons
    for select to authenticated using (public.is_admin());
drop policy if exists "Admins can insert competitive seasons" on public.competitive_seasons;
create policy "Admins can insert competitive seasons" on public.competitive_seasons
    for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can update competitive seasons" on public.competitive_seasons;
create policy "Admins can update competitive seasons" on public.competitive_seasons
    for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- A single transaction creates/reuses the season and saves the period.
-- SECURITY INVOKER keeps table grants and RLS in force.
create or replace function public.save_competitive_pool_period(
    p_pool_id uuid, p_server text, p_season_name text, p_pool_number integer,
    p_start_at timestamptz, p_end_at timestamptz
) returns uuid language plpgsql security invoker set search_path = public as $$
declare
    season_name text := btrim(p_season_name);
    saved_season_id uuid;
    result_id uuid;
begin
    if not coalesce(public.is_admin(), false) then raise exception 'Admin access required' using errcode = '42501'; end if;
    if p_server is null or p_server not in ('tw', 'cn') then raise exception '請選擇有效的伺服器。'; end if;
    if season_name is null or season_name = '' or season_name = '賽季' then raise exception '請填寫賽季名稱。'; end if;
    if right(season_name, 2) <> '賽季' then season_name := season_name || '賽季'; end if;
    if char_length(season_name) > 100 then raise exception '賽季名稱不可超過 100 字。'; end if;
    if p_pool_number is null or p_pool_number not between 1 and 9999 then raise exception '池期數須為 1 至 9999 的整數。'; end if;
    if p_start_at is null or p_end_at is null or p_end_at <= p_start_at then raise exception '結束時間必須晚於開始時間。'; end if;
    if p_pool_id is not null then
        perform 1 from public.competitive_pools where id = p_pool_id and server = p_server for update;
        if not found then raise exception 'Pool not found'; end if;
    end if;

    insert into public.competitive_seasons (server, name) values (p_server, season_name)
    on conflict (server, name) do update set name = excluded.name returning id into saved_season_id;

    if p_pool_id is null then
        insert into public.competitive_pools (server, season_id, pool_number, start_at, end_at)
        values (p_server, saved_season_id, p_pool_number, p_start_at, p_end_at) returning id into result_id;
    else
        update public.competitive_pools cp set season_id = saved_season_id,
            pool_number = p_pool_number, start_at = p_start_at, end_at = p_end_at, updated_at = now()
        where cp.id = p_pool_id and cp.server = p_server returning cp.id into result_id;
    end if;
    return result_id;
end $$;

revoke all on function public.save_competitive_pool_period(uuid, text, text, integer, timestamptz, timestamptz) from public, anon;
grant execute on function public.save_competitive_pool_period(uuid, text, text, integer, timestamptz, timestamptz) to authenticated;
notify pgrst, 'reload schema';
commit;
