set local lock_timeout = '5s';

-- Independent snapshots intentionally have no foreign keys to live booking data.
create table "sctn-dev".logs_bookings (
  booking_id uuid primary key,
  venue_id uuid not null,
  section_id uuid not null,
  reservation_date date not null,
  reservation_year integer generated always as (extract(year from reservation_date)::integer) stored,
  reservation_month integer generated always as (extract(month from reservation_date)::integer) stored,
  reservation_time time not null,
  booking_slot text not null check (booking_slot in ('day','night')),
  record_type text not null check (record_type in ('reservation','schedule')),
  status text not null,
  section_name text not null,
  section_area text not null,
  section_description text not null,
  customer_name text,
  customer_email text,
  guest_count integer not null,
  minimum_spend_amount numeric not null,
  deposit_amount numeric not null,
  drink_sign_text text,
  beverages jsonb not null default '[]' check (jsonb_typeof(beverages) = 'array'),
  paid_at timestamptz,
  booking_created_at timestamptz not null,
  booking_snapshot jsonb not null,
  section_snapshot jsonb not null,
  archived_at timestamptz not null default now(),
  unique (venue_id,section_id,reservation_date,booking_slot)
);
create index logs_bookings_venue_date_idx on "sctn-dev".logs_bookings
  (venue_id,reservation_date desc,reservation_time desc,booking_id desc);
create index logs_bookings_venue_year_month_idx on "sctn-dev".logs_bookings
  (venue_id,reservation_year,reservation_month);
alter table "sctn-dev".logs_bookings enable row level security;
revoke all on "sctn-dev".logs_bookings from public,anon,authenticated;
grant select on "sctn-dev".logs_bookings to authenticated;
grant all on "sctn-dev".logs_bookings to service_role;
create policy "Managers can read their venue booking logs" on "sctn-dev".logs_bookings
for select to authenticated using (
  venue_id in (select vm.venue_id from "sctn-dev".venue_managers vm where vm.user_id=(select auth.uid()))
);

-- Call before a future cleanup job deletes live bookings and their child records.
-- This function only copies; it never deletes live records or starts a job.
create function "sctn-dev".archive_sold_bookings(p_venue_id uuid default null)
returns integer language plpgsql security invoker set search_path='' as $$
declare archived_count integer;
begin
  insert into "sctn-dev".logs_bookings (
    booking_id,venue_id,section_id,reservation_date,reservation_time,booking_slot,record_type,status,
    section_name,section_area,section_description,customer_name,customer_email,guest_count,
    minimum_spend_amount,deposit_amount,drink_sign_text,beverages,paid_at,booking_created_at,
    booking_snapshot,section_snapshot
  )
  select distinct on (s.venue_id,b.section_id,b.reservation_date,b.booking_slot)
    b.id,s.venue_id,b.section_id,b.reservation_date,b.reservation_time,b.booking_slot,b.record_type,b.status,
    coalesce(b.section_name,s.name),s.area,coalesce(b.section_description,s.description),
    b.customer_name,b.customer_email,b.guest_count,b.minimum_spend_amount,b.deposit_amount,
    b.drink_sign_text,b.beverages,p.paid_at,b.created_at,to_jsonb(b),to_jsonb(s)
  from "sctn-dev".bookings b
  join "sctn-dev".sections s on s.id=b.section_id
  left join "sctn-dev".reservation_payments p on p.booking_id=b.id
  where (p_venue_id is null or s.venue_id=p_venue_id)
    and b.reservation_date < (now() at time zone 'America/Chicago')::date
    and ((b.record_type='reservation' and b.status in ('confirmed','completed') and p.paid_at is not null)
      or (b.record_type='schedule' and b.status='sold'))
  order by s.venue_id,b.section_id,b.reservation_date,b.booking_slot,
    case when b.record_type='reservation' then 0 else 1 end,b.created_at desc,b.id
  on conflict (venue_id,section_id,reservation_date,booking_slot) do update set
    booking_id=excluded.booking_id,record_type=excluded.record_type,status=excluded.status,
    reservation_time=excluded.reservation_time,section_name=excluded.section_name,
    section_area=excluded.section_area,section_description=excluded.section_description,
    customer_name=excluded.customer_name,customer_email=excluded.customer_email,
    guest_count=excluded.guest_count,minimum_spend_amount=excluded.minimum_spend_amount,
    deposit_amount=excluded.deposit_amount,drink_sign_text=excluded.drink_sign_text,
    beverages=excluded.beverages,paid_at=excluded.paid_at,booking_created_at=excluded.booking_created_at,
    booking_snapshot=excluded.booking_snapshot,section_snapshot=excluded.section_snapshot,archived_at=now()
  where "sctn-dev".logs_bookings.record_type='schedule' and excluded.record_type='reservation';
  get diagnostics archived_count = row_count;
  return archived_count;
end $$;
revoke all on function "sctn-dev".archive_sold_bookings(uuid) from public,anon,authenticated;
grant execute on function "sctn-dev".archive_sold_bookings(uuid) to service_role;

create function "sctn-dev".get_booking_history_years(p_venue_id uuid)
returns table (year integer) language sql stable security invoker set search_path='' as $$
  select distinct extract(year from reservation_date)::integer as year
  from "sctn-dev".logs_bookings where venue_id=p_venue_id order by year desc;
$$;
revoke all on function "sctn-dev".get_booking_history_years(uuid) from public,anon;
grant execute on function "sctn-dev".get_booking_history_years(uuid) to authenticated,service_role;

select "sctn-dev".archive_sold_bookings();
notify pgrst, 'reload schema';
