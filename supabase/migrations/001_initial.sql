-- Enable pgvector extension
create extension if not exists vector;

-- -------------------------------------------------------
-- documents: one row per uploaded file
-- -------------------------------------------------------
create table documents (
  id           uuid        default gen_random_uuid() primary key,
  user_id      uuid        references auth.users(id) on delete cascade not null,
  filename     text        not null,
  file_type    text        not null,
  raw_text     text,
  chunk_count  integer     default 0,
  uploaded_at  timestamptz default now()
);

-- -------------------------------------------------------
-- document_chunks: one row per text chunk with embedding
-- voyage-3-lite produces 512-dimensional vectors
-- -------------------------------------------------------
create table document_chunks (
  id            uuid    default gen_random_uuid() primary key,
  document_id   uuid    references documents(id) on delete cascade not null,
  user_id       uuid    references auth.users(id) on delete cascade not null,
  chunk_text    text    not null,
  chunk_index   integer not null,
  embedding     vector(512),
  metadata      jsonb   default '{}'
);

-- Approximate nearest-neighbor index (cosine distance)
create index on document_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- -------------------------------------------------------
-- Row-level security
-- -------------------------------------------------------
alter table documents       enable row level security;
alter table document_chunks enable row level security;

create policy "users_own_documents"
  on documents for all
  using (auth.uid() = user_id);

create policy "users_own_chunks"
  on document_chunks for all
  using (auth.uid() = user_id);

-- -------------------------------------------------------
-- RPC: vector similarity search scoped to a single user
-- -------------------------------------------------------
create or replace function match_chunks(
  query_embedding vector(512),
  match_user_id   uuid,
  match_count     int default 5
)
returns table (
  id            uuid,
  document_id   uuid,
  chunk_text    text,
  chunk_index   int,
  document_name text,
  similarity    float
)
language sql stable
as $$
  select
    dc.id,
    dc.document_id,
    dc.chunk_text,
    dc.chunk_index,
    d.filename as document_name,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  join documents d on dc.document_id = d.id
  where dc.user_id = match_user_id
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;
