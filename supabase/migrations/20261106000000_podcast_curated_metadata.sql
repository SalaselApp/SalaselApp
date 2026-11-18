-- Align curated podcast metadata with the existing playlist taxonomy.
-- Apply before deploying writers. Legacy type/style stay unknown until edited.
begin;
alter table public.podcasts
  add column if not exists participants text[] not null default '{}',
  add column if not exists type smallint check (type in (0, 1, 2)),
  add column if not exists style smallint check (style in (0, 1, 2, 3)),
  add column if not exists classes smallint[] not null default '{}' check (classes <@ array[0, 1, 2, 3]::smallint[]);
-- Like playlist descriptions, a curator may leave this blank. Never import YouTube prose.
alter table public.podcasts drop constraint if exists podcasts_description_check;
alter table public.podcasts alter column description set default '';
commit;
