create or replace function public.delete_pool(p_pool_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
    if not public.is_admin() then
        raise exception 'Admin access required';
    end if;

    delete from public.pools
    where id = p_pool_id
      and status in ('draft', 'closed');

    if not found then
        raise exception 'Pool does not exist or is not in draft or closed status';
    end if;
end;
$function$;
