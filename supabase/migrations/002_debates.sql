-- -------------------------------------------------------
-- profiles: public user info for discovery
-- -------------------------------------------------------
create table profiles (
  id    uuid references auth.users(id) on delete cascade primary key,
  email text not null
);

alter table profiles enable row level security;
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_own"    on profiles for all   using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Backfill profiles for any users who already exist
insert into profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- -------------------------------------------------------
-- debates: one row per debate session
-- -------------------------------------------------------
create table debates (
  id            uuid        default gen_random_uuid() primary key,
  topic         text        not null,
  challenger_id uuid        references auth.users(id) not null,
  opponent_id   uuid        references auth.users(id) not null,
  status        text        default 'active',
  created_at    timestamptz default now()
);

alter table debates enable row level security;
create policy "debates_visible" on debates
  for select using (auth.uid() = challenger_id or auth.uid() = opponent_id);
create policy "debates_insert" on debates
  for insert with check (auth.uid() = challenger_id);

-- -------------------------------------------------------
-- debate_rounds: one row per generated argument
-- -------------------------------------------------------
create table debate_rounds (
  id         uuid        default gen_random_uuid() primary key,
  debate_id  uuid        references debates(id) on delete cascade not null,
  user_id    uuid        references auth.users(id) not null,
  round_type text        not null, -- opening | rebuttal | closing
  argument   text        not null,
  sources    jsonb       default '[]',
  created_at timestamptz default now()
);

alter table debate_rounds enable row level security;
create policy "rounds_visible" on debate_rounds
  for select using (
    exists (
      select 1 from debates d
      where d.id = debate_id
        and (d.challenger_id = auth.uid() or d.opponent_id = auth.uid())
    )
  );
