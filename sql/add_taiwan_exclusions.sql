-- Run in Supabase SQL Editor before using the exclusion editor.
-- Existing progress values and RLS policies remain in place.
begin;
alter table public.seer_server_settings
    add column if not exists taiwan_exclusions jsonb not null
    default '{"pet":"","skin":"","mintmark":""}'::jsonb
    check (jsonb_typeof(taiwan_exclusions) = 'object'
        and jsonb_typeof(taiwan_exclusions->'pet') = 'string'
        and jsonb_typeof(taiwan_exclusions->'skin') = 'string'
        and jsonb_typeof(taiwan_exclusions->'mintmark') = 'string'
        and taiwan_exclusions ?& array['pet', 'skin', 'mintmark']);
comment on column public.seer_server_settings.taiwan_exclusions is
    'Taiwan-only exclusions by kind: newline-separated positive IDs or inclusive ID ranges, with optional # comments.';
notify pgrst, 'reload schema';
commit;
