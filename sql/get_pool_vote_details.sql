-- Administrator-only Pool voting records. No table SELECT permissions are granted.
create or replace function public.get_pool_vote_details(p_pool_id uuid)
returns table (
    user_id uuid,
    email text,
    mimi_id text,
    voted_at timestamptz,
    selections jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if not public.is_admin() then
        raise exception 'Admin access required';
    end if;

    return query
    select
        v.user_id,
        null::text as email,
        coalesce(b.game_account, '未綁定') as mimi_id,
        v.created_at as voted_at,
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'pool_character_id', pc.id,
                    'character_id', pc.character_id,
                    'character_name', pc.character_name
                )
                order by pc.character_id
            ) filter (where vi.id is not null),
            '[]'::jsonb
        ) as selections
    from public.votes v
    left join public.game_account_bindings b on b.user_id = v.user_id
    left join public.vote_items vi on vi.vote_id = v.id
    left join public.pool_characters pc on pc.id = vi.pool_character_id
    where v.pool_id = p_pool_id
    group by v.id, v.user_id, b.game_account, v.created_at
    order by v.created_at desc;
end;
$$;

revoke all on function public.get_pool_vote_details(uuid) from public;
grant execute on function public.get_pool_vote_details(uuid) to authenticated;

notify pgrst, 'reload schema';
