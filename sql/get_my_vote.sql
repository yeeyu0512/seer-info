-- Run this once in the Supabase SQL Editor.
-- Returns only the caller's selected pool-character UUIDs for one Pool.

create or replace function public.get_my_vote(p_pool_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_vote_id uuid;
begin
    if auth.uid() is null then
        raise exception 'Authentication required';
    end if;

    select v.id
    into v_vote_id
    from public.votes as v
    where v.pool_id = p_pool_id
      and v.user_id = auth.uid()
    order by v.created_at desc
    limit 1;

    if v_vote_id is null then
        return '{}'::uuid[];
    end if;

    return coalesce(
        (
            select array_agg(vi.pool_character_id order by vi.created_at)
            from public.vote_items as vi
            where vi.vote_id = v_vote_id
              and vi.pool_id = p_pool_id
        ),
        '{}'::uuid[]
    );
end;
$$;

revoke all on function public.get_my_vote(uuid) from public;
grant execute on function public.get_my_vote(uuid) to authenticated;
