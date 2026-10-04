create table if not exists public.seer_server_settings (
    id smallint primary key check (id = 1),
    latest_pet_id bigint check (latest_pet_id is null or latest_pet_id > 0),
    latest_skin_id bigint check (latest_skin_id is null or latest_skin_id > 0),
    updated_at timestamptz not null default now()
);

insert into public.seer_server_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.seer_server_settings enable row level security;

revoke all on public.seer_server_settings from public, anon, authenticated;
grant select on public.seer_server_settings to anon, authenticated;
grant update on public.seer_server_settings to authenticated;

drop policy if exists "Anyone can read Seer server settings" on public.seer_server_settings;
create policy "Anyone can read Seer server settings"
    on public.seer_server_settings
    for select
    to anon, authenticated
    using (true);

drop policy if exists "Admins can update Seer server settings" on public.seer_server_settings;
create policy "Admins can update Seer server settings"
    on public.seer_server_settings
    for update
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

notify pgrst, 'reload schema';
