-- Game account binding RPCs. Run this after creating public.game_account_bindings.
-- Direct table access remains unavailable to anon/authenticated clients.

revoke all on table public.game_account_bindings from anon, authenticated;

create or replace function public.get_my_game_account()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if auth.uid() is null then
        raise exception 'Authentication required';
    end if;

    return (
        select game_account
        from public.game_account_bindings
        where user_id = auth.uid()
    );
end;
$$;

create or replace function public.bind_game_account(p_game_account text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_game_account text := btrim(p_game_account);
begin
    if auth.uid() is null then
        raise exception 'Authentication required';
    end if;

    if v_game_account is null or v_game_account = '' or v_game_account !~ '^[0-9]+$' then
        raise exception 'Game account must contain digits only';
    end if;

    if exists (
        select 1
        from public.game_account_bindings
        where user_id = auth.uid()
    ) then
        raise exception 'This user already has a bound game account';
    end if;

    if exists (
        select 1
        from public.game_account_bindings
        where game_account = v_game_account
    ) then
        raise exception 'This game account is already bound to another user';
    end if;

    begin
        insert into public.game_account_bindings (user_id, game_account)
        values (auth.uid(), v_game_account);
    exception
        when unique_violation then
            if exists (
                select 1
                from public.game_account_bindings
                where user_id = auth.uid()
            ) then
                raise exception 'This user already has a bound game account';
            end if;

            raise exception 'This game account is already bound to another user';
    end;

    return v_game_account;
end;
$$;

revoke all on function public.get_my_game_account() from public;
revoke all on function public.bind_game_account(text) from public;
grant execute on function public.get_my_game_account() to authenticated;
grant execute on function public.bind_game_account(text) to authenticated;

notify pgrst, 'reload schema';

-- Enforce the same requirement server-side, including direct RPC calls that
-- would otherwise bypass the browser UI. Existing submit_vote() is unchanged.
create or replace function public.require_mimi_binding_for_vote()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if auth.uid() is null then
        raise exception 'Authentication required';
    end if;

    if new.user_id is distinct from auth.uid() then
        raise exception 'Votes may only be created for the current user';
    end if;

    if not exists (
        select 1
        from public.game_account_bindings
        where user_id = auth.uid()
    ) then
        raise exception 'Bind a MiMi ID before voting';
    end if;

    return new;
end;
$$;

drop trigger if exists require_mimi_binding_before_vote on public.votes;
create trigger require_mimi_binding_before_vote
before insert on public.votes
for each row
execute function public.require_mimi_binding_for_vote();

revoke all on function public.require_mimi_binding_for_vote() from public;

-- New registrations must supply a numeric mimi_id in auth user metadata.
-- The binding is inserted in the same transaction as auth.users creation, so
-- this also works when email confirmation means there is no client session yet.
create or replace function public.bind_mimi_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_mimi_id text := btrim(new.raw_user_meta_data ->> 'mimi_id');
begin
    if v_mimi_id is null or v_mimi_id = '' or v_mimi_id !~ '^[0-9]+$' then
        raise exception 'A numeric MiMi ID is required to create an account';
    end if;

    begin
        insert into public.game_account_bindings (user_id, game_account)
        values (new.id, v_mimi_id);
    exception
        when unique_violation then
            raise exception 'This MiMi ID is already bound to another account';
    end;

    return new;
end;
$$;

drop trigger if exists bind_mimi_on_auth_signup on auth.users;
create trigger bind_mimi_on_auth_signup
after insert on auth.users
for each row
execute function public.bind_mimi_on_signup();

revoke all on function public.bind_mimi_on_signup() from public;
