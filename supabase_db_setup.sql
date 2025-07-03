-- Supabase SQL: Posts Table
-- Run this in the Supabase SQL editor or psql to set up the posts table for your project.

create table if not exists posts (
  id uuid not null default gen_random_uuid(),
  user_id uuid null,
  body text null,
  created_at timestamptz null default now(),
  constraint posts_pkey primary key (id),
  constraint posts_body_check check ((char_length(body) <= 280))
) tablespace pg_default;

alter table posts add column if not exists images text[];

-- (Optional) For profile image storage, use Supabase Storage buckets.
-- You can create a bucket named 'profile-images' in the Supabase dashboard.
