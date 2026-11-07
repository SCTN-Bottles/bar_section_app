set local lock_timeout='5s';

alter table "sctn-dev".reservation_payments add column paid_confirmation_email_sent_at timestamptz;

-- Match the live booking columns exactly, including their defaults and checks.
alter table "sctn-dev".logs_bookings rename to logs_bookings_previous;
create temp table legacy_log_payment_times on commit drop as
  select booking_id,paid_at from "sctn-dev".logs_bookings_previous where paid_at is not null;
create table "sctn-dev".logs_bookings (like "sctn-dev".bookings including defaults including constraints);
alter table "sctn-dev".logs_bookings add primary key(id);
alter table "sctn-dev".logs_bookings add foreign key(section_id) references "sctn-dev".sections(id) on delete restrict;
insert into "sctn-dev".logs_bookings select (jsonb_populate_record(null::"sctn-dev".bookings,booking_snapshot)).*
from "sctn-dev".logs_bookings_previous;
drop table "sctn-dev".logs_bookings_previous;
create index logs_bookings_section_date_idx on "sctn-dev".logs_bookings(section_id,reservation_date desc,id desc);
create index bookings_archive_date_idx on "sctn-dev".bookings(reservation_date);
alter table "sctn-dev".logs_bookings enable row level security;
revoke all on "sctn-dev".logs_bookings from public,anon,authenticated;
grant select on "sctn-dev".logs_bookings to authenticated;
grant all on "sctn-dev".logs_bookings to service_role;
create policy "Managers read booking logs" on "sctn-dev".logs_bookings for select to authenticated using (
  exists(select 1 from "sctn-dev".sections s join "sctn-dev".venue_managers vm on vm.venue_id=s.venue_id
    where s.id=section_id and vm.user_id=(select auth.uid()))
);

-- Preserve dependent rows rather than discarding financial and drink records.
create table "sctn-dev".logs_reservation_payments (like "sctn-dev".reservation_payments including defaults including constraints);
alter table "sctn-dev".logs_reservation_payments add primary key(booking_id);
alter table "sctn-dev".logs_reservation_payments add foreign key(booking_id) references "sctn-dev".logs_bookings(id) on delete restrict;
create unique index logs_reservation_payments_token_idx on "sctn-dev".logs_reservation_payments(token);
create unique index logs_reservation_payments_session_idx on "sctn-dev".logs_reservation_payments(stripe_session_id);
insert into "sctn-dev".logs_reservation_payments(booking_id,paid_at)
select l.booking_id,l.paid_at from legacy_log_payment_times l
where not exists(select 1 from "sctn-dev".reservation_payments p where p.booking_id=l.booking_id);
create table "sctn-dev".logs_booking_payments (like "sctn-dev".booking_payments including defaults including constraints);
alter table "sctn-dev".logs_booking_payments add primary key(id);
alter table "sctn-dev".logs_booking_payments add foreign key(booking_id) references "sctn-dev".logs_bookings(id) on delete restrict;
create index logs_booking_payments_booking_idx on "sctn-dev".logs_booking_payments(booking_id);
create table "sctn-dev".logs_booking_drinks (like "sctn-dev".booking_drinks including defaults including constraints);
alter table "sctn-dev".logs_booking_drinks add primary key(id);
alter table "sctn-dev".logs_booking_drinks add foreign key(booking_id) references "sctn-dev".logs_bookings(id) on delete restrict;
create index logs_booking_drinks_booking_idx on "sctn-dev".logs_booking_drinks(booking_id);
alter table "sctn-dev".logs_reservation_payments enable row level security;
alter table "sctn-dev".logs_booking_payments enable row level security;
alter table "sctn-dev".logs_booking_drinks enable row level security;
revoke all on "sctn-dev".logs_reservation_payments,"sctn-dev".logs_booking_payments,"sctn-dev".logs_booking_drinks from public,anon,authenticated;
grant all on "sctn-dev".logs_reservation_payments,"sctn-dev".logs_booking_payments,"sctn-dev".logs_booking_drinks to service_role;

drop function "sctn-dev".archive_sold_bookings(uuid);
create function "sctn-dev".archive_past_bookings(p_venue_id uuid default null)
returns integer language plpgsql security invoker set search_path='' as $$
declare ids uuid[]; moved integer;
begin
  -- Same lock order as payment reconciliation: booking first, dependent rows next.
  select array_agg(id) into ids from (
    select b.id from "sctn-dev".bookings b join "sctn-dev".sections s on s.id=b.section_id
    where b.reservation_date<(now() at time zone 'America/Chicago')::date
      and (p_venue_id is null or s.venue_id=p_venue_id)
    order by b.id for update of b
  ) candidates;
  if ids is null then return 0; end if;
  perform 1 from "sctn-dev".reservation_payments where booking_id=any(ids) for update;
  perform 1 from "sctn-dev".booking_payments where booking_id=any(ids) for update;
  perform 1 from "sctn-dev".booking_drinks where booking_id=any(ids) for update;
  insert into "sctn-dev".logs_bookings select b.* from "sctn-dev".bookings b where b.id=any(ids)
    on conflict(id) do update set
      customer_name=excluded.customer_name,customer_email=excluded.customer_email,status=excluded.status,
      drink_sign_text=excluded.drink_sign_text,beverages=excluded.beverages,guest_count=excluded.guest_count,
      minimum_spend_amount=excluded.minimum_spend_amount,deposit_amount=excluded.deposit_amount,
      section_name=excluded.section_name,section_description=excluded.section_description,
      updated_at=excluded.updated_at,reservation_time=excluded.reservation_time;
  insert into "sctn-dev".logs_reservation_payments select p.* from "sctn-dev".reservation_payments p where booking_id=any(ids);
  insert into "sctn-dev".logs_booking_payments select p.* from "sctn-dev".booking_payments p where booking_id=any(ids);
  insert into "sctn-dev".logs_booking_drinks select d.* from "sctn-dev".booking_drinks d where booking_id=any(ids);
  delete from "sctn-dev".reservation_payments where booking_id=any(ids);
  delete from "sctn-dev".booking_payments where booking_id=any(ids);
  delete from "sctn-dev".booking_drinks where booking_id=any(ids);
  delete from "sctn-dev".bookings where id=any(ids);
  get diagnostics moved=row_count;
  return moved;
end $$;
revoke all on function "sctn-dev".archive_past_bookings(uuid) from public,anon,authenticated;
grant execute on function "sctn-dev".archive_past_bookings(uuid) to service_role;

-- The history RPC enriches logs without adding columns to the mirror table.
create function "sctn-dev".get_booking_history(p_venue_id uuid,p_year integer default null,p_month integer default null)
returns table(booking_id uuid,reservation_date date,reservation_time time,booking_slot text,record_type text,
  section_name text,section_area text,customer_name text,customer_email text,guest_count integer,
  deposit_amount numeric,minimum_spend_amount numeric,drink_sign_text text,paid_at timestamptz)
language sql stable security invoker set search_path='' as $$
  select b.id,b.reservation_date,b.reservation_time,b.booking_slot,b.record_type,coalesce(b.section_name,s.name),s.area,
    b.customer_name,b.customer_email,b.guest_count,b.deposit_amount,b.minimum_spend_amount,b.drink_sign_text,p.paid_at
  from "sctn-dev".logs_bookings b join "sctn-dev".sections s on s.id=b.section_id
  left join "sctn-dev".logs_reservation_payments p on p.booking_id=b.id
  where s.venue_id=p_venue_id and (p_year is null or extract(year from b.reservation_date)=p_year)
    and (p_month is null or extract(month from b.reservation_date)=p_month)
    and ((b.record_type='reservation' and b.status in ('confirmed','completed') and p.paid_at is not null)
      or (b.record_type='schedule' and b.status='sold' and not exists(
        select 1 from "sctn-dev".logs_bookings r join "sctn-dev".logs_reservation_payments rp on rp.booking_id=r.id
        where r.section_id=b.section_id and r.reservation_date=b.reservation_date and r.booking_slot=b.booking_slot
          and r.record_type='reservation' and r.status in ('confirmed','completed') and rp.paid_at is not null)));
$$;
revoke all on function "sctn-dev".get_booking_history(uuid,integer,integer) from public,anon,authenticated;
grant execute on function "sctn-dev".get_booking_history(uuid,integer,integer) to service_role;
create or replace function "sctn-dev".get_booking_history_years(p_venue_id uuid)
returns table(year integer) language sql stable security invoker set search_path='' as $$
  select distinct extract(year from reservation_date)::integer from "sctn-dev".get_booking_history(p_venue_id) order by 1 desc;
$$;
revoke all on function "sctn-dev".get_booking_history_years(uuid) from public,anon,authenticated;
grant execute on function "sctn-dev".get_booking_history_years(uuid) to service_role;

create function "sctn-dev".record_verified_reservation_payment(p_id uuid,p_session_id text,p_amount bigint,p_currency text)
returns void language plpgsql security invoker set search_path='' as $$
declare b "sctn-dev".bookings%rowtype; p "sctn-dev".reservation_payments%rowtype; archived boolean:=false;
begin
  select * into b from "sctn-dev".bookings where id=p_id for update;
  if not found then
    select * into b from "sctn-dev".logs_bookings where id=p_id for update;
    archived:=true;
  end if;
  if b.id is null or b.record_type<>'reservation' then raise exception 'Reservation payment not found.'; end if;
  if archived then select * into p from "sctn-dev".logs_reservation_payments where booking_id=p_id for update;
  else select * into p from "sctn-dev".reservation_payments where booking_id=p_id for update; end if;
  if p.booking_id is null or p.stripe_session_id is distinct from p_session_id then raise exception 'Reservation payment not found.'; end if;
  if p_currency is distinct from 'usd' or p_amount is distinct from round(b.deposit_amount*100)::bigint then raise exception 'Payment mismatch.'; end if;
  if b.status not in ('confirmed','completed') then raise exception 'Please contact the venue to confirm your paid reservation.'; end if;
  if archived then update "sctn-dev".logs_reservation_payments set paid_at=coalesce(paid_at,now()) where booking_id=p_id;
  else update "sctn-dev".reservation_payments set paid_at=coalesce(paid_at,now()) where booking_id=p_id; end if;
end $$;
revoke all on function "sctn-dev".record_verified_reservation_payment(uuid,text,bigint,text) from public,anon,authenticated;
grant execute on function "sctn-dev".record_verified_reservation_payment(uuid,text,bigint,text) to service_role;

-- Keep active bookings current without requiring anyone to open history.
select cron.schedule('archive-past-bookings','*/5 * * * *','select "sctn-dev".archive_past_bookings()');
select "sctn-dev".archive_past_bookings();
notify pgrst,'reload schema';
