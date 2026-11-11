create table public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Island Trader' check (char_length(display_name) between 1 and 40),
  wallet_id text not null,
  created_at timestamptz not null default now()
);
create table public.game_transactions (
  user_id uuid not null references auth.users(id) on delete cascade,
  sequence bigint not null,
  simulation_time double precision not null,
  details jsonb not null,
  primary key(user_id,sequence)
);
create table public.market_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  sample_id bigint not null,
  simulation_time double precision not null,
  prices jsonb not null,
  primary key(user_id,sample_id)
);
create table public.economic_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  sequence bigint not null,
  simulation_time double precision not null,
  details jsonb not null,
  primary key(user_id,sequence)
);
alter table public.player_profiles enable row level security;
alter table public.game_transactions enable row level security;
alter table public.market_history enable row level security;
alter table public.economic_events enable row level security;
revoke all on public.player_profiles, public.game_transactions, public.market_history, public.economic_events from anon, authenticated;
grant select on public.player_profiles, public.game_transactions, public.market_history, public.economic_events to authenticated;
grant all on public.player_profiles, public.game_transactions, public.market_history, public.economic_events to service_role;
create policy "Read own profile" on public.player_profiles for select to authenticated using ((select auth.uid())=user_id);
create policy "Read own transactions" on public.game_transactions for select to authenticated using ((select auth.uid())=user_id);
create policy "Read own price history" on public.market_history for select to authenticated using ((select auth.uid())=user_id);
create policy "Read own economic events" on public.economic_events for select to authenticated using ((select auth.uid())=user_id);

-- Runs inside the same database transaction as the save/outbox commit.
create function public.record_game_history() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  insert into public.player_profiles(user_id,wallet_id,display_name)
  values(new.user_id,new.wallet_id,coalesce(new.snapshot->'economy'->'player'->>'name','Island Trader'))
  on conflict(user_id) do update set display_name=excluded.display_name;
  insert into public.game_transactions(user_id,sequence,simulation_time,details)
  select new.user_id,(t->>'id')::bigint,(t->>'time')::double precision,t
  from jsonb_array_elements(coalesce(new.snapshot->'economy'->'transactions','[]'::jsonb)) t
  on conflict do nothing;
  insert into public.market_history(user_id,sample_id,simulation_time,prices)
  select new.user_id,round((t->>'time')::numeric*10)::bigint,(t->>'time')::double precision,t->'prices'
  from jsonb_array_elements(coalesce(new.snapshot->'economy'->'priceHistory','[]'::jsonb)) t
  on conflict do nothing;
  insert into public.economic_events(user_id,sequence,simulation_time,details)
  select new.user_id,(t->>'id')::bigint,(t->>'time')::double precision,t
  from jsonb_array_elements(coalesce(new.snapshot->'economy'->'economicEvents','[]'::jsonb)) t
  on conflict do nothing;
  return new;
end; $$;
revoke all on function public.record_game_history() from public,anon,authenticated;
grant execute on function public.record_game_history() to service_role;
create trigger game_history_after_save after insert or update on public.game_saves
for each row execute function public.record_game_history();
