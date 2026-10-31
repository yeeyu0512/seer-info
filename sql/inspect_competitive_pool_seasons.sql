-- Read-only preview before applying competitive_pool_seasons.sql.
-- Titles must end in 賽季 第X池. Review null matches before migration.
with titles as (
    select cp.id, cp.server, cp.name, cp.start_at, cp.end_at,
        regexp_match(btrim(cp.name), '^(.*賽季)[[:space:]]*第[[:space:]]*([^[:space:]]+)[[:space:]]*池$') as parts,
        (select count(*) from public.competitive_pool_characters c where c.competitive_pool_id = cp.id) as character_count
    from public.competitive_pools cp
    where to_jsonb(cp)->>'season_id' is null or to_jsonb(cp)->>'pool_number' is null
)
select id, server, name as legacy_title, btrim(parts[1]) as proposed_season_name,
       parts[2] as proposed_pool_number_label, start_at, end_at, character_count,
       case when parts is null then '需人工確認名稱' else '待遷移驗證期數' end as status
from titles order by server, start_at;

-- Review schema changes/privileges if the live database differs from repository SQL.
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name in ('competitive_pools', 'competitive_seasons')
order by table_name, ordinal_position;
