-- Existing installations: add only the new field, retaining current settings and RLS.
alter table public.seer_server_settings
    add column if not exists latest_mintmark_id bigint
    check (latest_mintmark_id is null or latest_mintmark_id > 0);

notify pgrst, 'reload schema';
