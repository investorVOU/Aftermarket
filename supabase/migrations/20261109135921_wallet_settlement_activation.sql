-- Preserve authoritative identity when an off-chain profile activates NEAR settlement.
create or replace function public.commit_game(
  p_user_id uuid, p_expected_revision bigint, p_snapshot jsonb,
  p_balances jsonb, p_wallet_id text, p_payload jsonb, p_command_id text default null
) returns bigint language plpgsql security invoker set search_path='' as $$
declare next_revision bigint;
begin
  if p_command_id is not null then
    insert into public.game_commands(user_id,command_id) values(p_user_id,p_command_id) on conflict do nothing;
    if not found then raise exception 'Duplicate command'; end if;
  end if;
  insert into public.game_saves(user_id,snapshot,wallet_id)
  values(p_user_id,p_snapshot,p_wallet_id) on conflict(user_id) do nothing;
  update public.game_saves set revision=revision+1,snapshot=p_snapshot,
    chain_balances=p_balances,wallet_id=p_wallet_id,updated_at=now()
  where user_id=p_user_id and revision=p_expected_revision returning revision into next_revision;
  if next_revision is null then raise exception 'Save revision conflict'; end if;
  if p_payload is not null then
    insert into public.chain_outbox(user_id,revision,payload)
    values(p_user_id,next_revision,p_payload||jsonb_build_object('revision',next_revision));
  end if;
  return next_revision;
end; $$;
revoke all on function public.commit_game(uuid,bigint,jsonb,jsonb,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.commit_game(uuid,bigint,jsonb,jsonb,text,jsonb,text) to service_role;

create function public.sync_profile_wallet() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  update public.player_profiles set wallet_id=new.wallet_id where user_id=new.user_id;
  return new;
end; $$;
revoke all on function public.sync_profile_wallet() from public,anon,authenticated;
grant execute on function public.sync_profile_wallet() to service_role;
create trigger profile_wallet_after_save after update of wallet_id on public.game_saves
for each row execute function public.sync_profile_wallet();
