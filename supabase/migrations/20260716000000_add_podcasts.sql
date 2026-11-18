-- Independent YouTube podcast episodes.
--
-- A podcast deliberately has no playlist/show/season foreign key. `id` is an
-- application-owned stable ID (`pod_<uuid>`) used by the public canonical URL:
-- /{lang}/podcast/{id}. The YouTube video ID is a registered source, not the
-- public content identity.

create table podcasts (
  id               text        primary key,
  title            text        not null check (length(btrim(title)) > 0),
  description      text        not null check (length(btrim(description)) > 0),
  thumbnail_id     text        not null check (thumbnail_id ~ '^[A-Za-z0-9_-]{11}$'),
  youtube_video_id text        not null unique check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  language         text        not null check (language in ('ar', 'en', 'ja')),
  categories       smallint[]  not null check (
    cardinality(categories) > 0
    and categories <@ array[0, 1, 2]::smallint[]
  ),
  duration         integer     not null default 0 check (duration >= 0),
  uploaded_at      bigint      not null default 0 check (uploaded_at >= 0),
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index podcasts_publication_index on podcasts (published_at) where published_at is not null;

alter table podcasts enable row level security;

-- Drafts are never exposed through the anonymous public app client. The
-- server-side admin uses service_role only after requireSession() succeeds.
create policy "podcasts: published public read"
  on podcasts for select
  using (published_at is not null);

grant select on podcasts to anon, authenticated;
grant all on podcasts to service_role;
