-- Return a closed Pool to draft only when no votes have been recorded.
create or replace function public.return_pool_to_draft(p_pool_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_status text;
begin
    if not public.is_admin() then
        raise exception 'Admin access required';
    end if;

    select status::text
    into v_status
    from public.pools
    where id = p_pool_id
    for update;

    if not found then
        raise exception 'Pool not found';
    end if;

    if v_status <> 'closed' then
        raise exception 'Only a closed Pool can be returned to draft';
    end if;

    if exists (
        select 1
        from public.votes
        where pool_id = p_pool_id
    ) then
        raise exception 'A Pool with vote records cannot be returned to draft';
    end if;

    update public.pools
    set status = 'draft'
    where id = p_pool_id;
end;
$$;

revoke all on function public.return_pool_to_draft(uuid) from public;
grant execute on function public.return_pool_to_draft(uuid) to authenticated;

notify pgrst, 'reload schema';
