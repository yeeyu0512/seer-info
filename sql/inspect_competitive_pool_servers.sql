-- Read-only preflight for Supabase SQL Editor; works before and after migration.
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('competitive_pools', 'competitive_pool_characters')
order by table_name, ordinal_position;

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in ('public.competitive_pools'::regclass,
                  'public.competitive_pool_characters'::regclass);

select tablename, indexname, indexdef from pg_indexes
where schemaname = 'public'
  and tablename in ('competitive_pools', 'competitive_pool_characters');

select tablename, policyname, roles, cmd, qual, with_check from pg_policies
where schemaname = 'public'
  and tablename in ('competitive_pools', 'competitive_pool_characters');

select relname, relrowsecurity as rls_enabled, relforcerowsecurity as rls_forced
from pg_class
where oid in ('public.competitive_pools'::regclass,
              'public.competitive_pool_characters'::regclass);

select cp.*, coalesce(to_jsonb(cp)->>'server', 'tw') as effective_server,
       (select count(*) from public.competitive_pool_characters c
        where c.competitive_pool_id = cp.id) as character_count
from public.competitive_pools cp order by cp.start_at desc;

-- Must return zero rows before applying the exclusion constraint.
-- Resolve any existing same-server overlap intentionally; do not auto-delete data.
select a.id as first_id, a.name as first_name, b.id as second_id, b.name as second_name
from public.competitive_pools a
join public.competitive_pools b on a.id < b.id
    and coalesce(to_jsonb(a)->>'server', 'tw') = coalesce(to_jsonb(b)->>'server', 'tw')
    and a.start_at < b.end_at and b.start_at < a.end_at;
