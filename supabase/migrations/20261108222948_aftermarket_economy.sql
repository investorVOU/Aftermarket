-- Clients may read their own progress; only the authoritative game server writes it.
create table public.game_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  snapshot jsonb not null,
  chain_balances jsonb not null default '{}'::jsonb,
  wallet_id text not null,
  updated_at timestamptz not null default now()
);
alter table public.game_saves enable row level security;
revoke all on public.game_saves from anon, authenticated;
grant select on public.game_saves to authenticated;
create policy "Read own game" on public.game_saves for select to authenticated
using ((select auth.uid()) = user_id);

create table public.chain_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  revision bigint not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','confirmed','failed')),
  transaction_hash text,
  error text,
  created_at timestamptz not null default now(),
  unique (user_id, revision)
);
create index chain_outbox_pending_idx on public.chain_outbox(id) where status = 'pending';
create index chain_outbox_user_idx on public.chain_outbox(user_id, id desc);
alter table public.chain_outbox enable row level security;
grant all on public.game_saves, public.chain_outbox to service_role;
grant usage, select on sequence public.chain_outbox_id_seq to service_role;
revoke all on public.chain_outbox from anon, authenticated;
grant select on public.chain_outbox to authenticated;
create policy "Read own settlement" on public.chain_outbox for select to authenticated
using ((select auth.uid()) = user_id);

-- INVOKER rights + service_role-only execution. Save and chain outbox commit atomically.
create function public.commit_game(
  p_user_id uuid, p_expected_revision bigint, p_snapshot jsonb,
  p_balances jsonb, p_wallet_id text, p_payload jsonb
) returns bigint language plpgsql security invoker set search_path = '' as $$
declare next_revision bigint;
begin
  insert into public.game_saves(user_id, snapshot, wallet_id)
    values (p_user_id, p_snapshot, p_wallet_id) on conflict (user_id) do nothing;
  update public.game_saves set revision = revision + 1, snapshot = p_snapshot,
    chain_balances = p_balances, updated_at = now()
    where user_id = p_user_id and revision = p_expected_revision
    returning revision into next_revision;
  if next_revision is null then raise exception 'Save revision conflict'; end if;
  if p_payload is not null then
    insert into public.chain_outbox(user_id, revision, payload)
      values (p_user_id, next_revision, p_payload || jsonb_build_object('revision', next_revision));
  end if;
  return next_revision;
end; $$;
revoke all on function public.commit_game(uuid,bigint,jsonb,jsonb,text,jsonb) from public, anon, authenticated;
grant execute on function public.commit_game(uuid,bigint,jsonb,jsonb,text,jsonb) to service_role;
