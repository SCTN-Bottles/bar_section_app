-- Run inside a transaction and roll back all test fixtures.
create function pg_temp.assert_history(ok boolean,message text) returns void
language plpgsql as $$ begin if ok is distinct from true then raise exception '%',message; end if; end $$;
select pg_temp.assert_history(
  (select jsonb_agg(jsonb_build_array(column_name,data_type,is_nullable,column_default) order by ordinal_position)
    from information_schema.columns where table_schema='sctn-dev' and table_name='bookings')
  = (select jsonb_agg(jsonb_build_array(column_name,data_type,is_nullable,column_default) order by ordinal_position)
    from information_schema.columns where table_schema='sctn-dev' and table_name='logs_bookings'),
  'Log columns, types, defaults and nullability must exactly match bookings');
create temp table history_fixture as select gen_random_uuid() as venue,gen_random_uuid() as other_venue,
  gen_random_uuid() as section,gen_random_uuid() as other_section,
  (select user_id from "sctn-dev".venue_managers limit 1) as manager,
  (now() at time zone 'America/Chicago')::date as today;
grant select on history_fixture to authenticated,service_role;
insert into "sctn-dev".venues(id,name,slug,city,state)
select venue,'Archive test','archive-test-'||venue,'Chicago','IL' from history_fixture
union all select other_venue,'Other test','archive-test-'||other_venue,'Chicago','IL' from history_fixture;
insert into "sctn-dev".sections(id,venue_id,name,area,description,capacity,minimum_spend,deposit_amount)
select section,venue,'Test section','indoor','Test description',10,100,25 from history_fixture
union all select other_section,other_venue,'Other section','indoor','Other description',10,100,25 from history_fixture;
insert into "sctn-dev".venue_managers(venue_id,user_id) select venue,manager from history_fixture;
insert into "sctn-dev".bookings(section_id,reservation_date,booking_slot,record_type,status,guest_count,minimum_spend_amount,deposit_amount,section_name,section_description)
select section,today-days,slot,'schedule',status,10,100,25,'Scheduled section','Scheduled description'
from history_fixture cross join (values (2,'night','sold'),(5,'day','sold'),(6,'night','available')) as v(days,slot,status)
union all select other_section,today-2,'night','schedule','sold',10,100,25,'Other sold section','Other description' from history_fixture;
insert into "sctn-dev".bookings(section_id,reservation_date,record_type,status,customer_name,customer_email,guest_count,minimum_spend_amount,deposit_amount,section_name,beverages)
select section,today-days,'reservation',status,'Test guest','history@example.test',8,100,25,'Booked section',
  '[{"id":"test-drink","name":"Sparkling","price":30,"quantity":2,"type":"bottle"}]'::jsonb
from history_fixture cross join (values (2,'confirmed'),(3,'confirmed'),(4,'cancelled'),(-2,'confirmed'),(0,'confirmed')) as v(days,status);
update "sctn-dev".reservation_payments p set paid_at=now(),stripe_session_id='test-'||b.id,
  paid_confirmation_email_sent_at=now() from "sctn-dev".bookings b,history_fixture f
where p.booking_id=b.id and b.section_id=f.section and b.reservation_date<>f.today-3;
update "sctn-dev".reservation_payments p set stripe_session_id='test-'||b.id from "sctn-dev".bookings b,history_fixture f
where p.booking_id=b.id and b.section_id=f.section and b.reservation_date=f.today-3;
insert into "sctn-dev".booking_drinks(booking_id,drink_name,drink_type,quantity,unit_price)
select b.id,'Sparkling','bottle',2,30 from "sctn-dev".bookings b,history_fixture f
where b.section_id=f.section and b.reservation_date=f.today-2 and b.record_type='reservation';
insert into "sctn-dev".booking_payments(booking_id,provider,amount,status)
select b.id,'stripe',25,'pending' from "sctn-dev".bookings b,history_fixture f
where b.section_id=f.section and b.reservation_date=f.today-2 and b.record_type='reservation';
create temp table expected_history as select b.* from "sctn-dev".bookings b,history_fixture f
where b.section_id=f.section and b.reservation_date<f.today;

set local role service_role;
select pg_temp.assert_history("sctn-dev".archive_past_bookings(venue)=6,'Move every past status and record type') from history_fixture;
reset role;
select pg_temp.assert_history(not exists(select 1 from expected_history e left join "sctn-dev".logs_bookings l on l.id=e.id where to_jsonb(l) is distinct from to_jsonb(e)),'Archived booking must be an exact copy');
select pg_temp.assert_history((select count(*) from "sctn-dev".bookings where section_id=f.section)=2,'Today and future bookings stay active') from history_fixture f;
select pg_temp.assert_history((select count(*) from "sctn-dev".logs_reservation_payments p join "sctn-dev".logs_bookings b on b.id=p.booking_id where b.section_id=f.section)=2,'Payment records must move with reservations') from history_fixture f;
select pg_temp.assert_history((select p.paid_confirmation_email_sent_at is not null from "sctn-dev".logs_reservation_payments p join "sctn-dev".logs_bookings b on b.id=p.booking_id where b.section_id=f.section and b.reservation_date=f.today-2),'Sent-email tracking must survive the move') from history_fixture f;
select pg_temp.assert_history((select count(*) from "sctn-dev".logs_booking_drinks d join "sctn-dev".logs_bookings b on b.id=d.booking_id where b.section_id=f.section)=1,'Drink records must survive') from history_fixture f;
select pg_temp.assert_history((select count(*) from "sctn-dev".logs_booking_payments p join "sctn-dev".logs_bookings b on b.id=p.booking_id where b.section_id=f.section)=1,'Legacy payment records must survive') from history_fixture f;
select pg_temp.assert_history("sctn-dev".archive_past_bookings(venue)=0,'Archive moves must be idempotent') from history_fixture;
select pg_temp.assert_history((select count(*) from "sctn-dev".get_booking_history(f.venue))=2,'History excludes unpaid, cancelled and available sections and duplicate sold schedules') from history_fixture f;

-- Verified late Stripe events can still record an archived payment.
select "sctn-dev".record_verified_reservation_payment(b.id,'test-'||b.id,2500,'usd')
from "sctn-dev".logs_bookings b,history_fixture f where b.section_id=f.section and b.reservation_date=f.today-3;
select pg_temp.assert_history((select count(*) from "sctn-dev".get_booking_history(f.venue))=3,'Late verified payment belongs in history') from history_fixture f;
select "sctn-dev".record_verified_reservation_payment(b.id,'test-'||b.id,2500,'usd')
from "sctn-dev".bookings b,history_fixture f where b.section_id=f.section and b.reservation_date=f.today;
do $$ declare b record; begin
  select l.* into b from "sctn-dev".logs_bookings l,history_fixture f where l.section_id=f.section and l.reservation_date=f.today-3;
  begin
    perform "sctn-dev".record_verified_reservation_payment(b.id,'wrong-session',2500,'usd');
    raise exception 'Accepted mismatched payment';
  exception when others then if sqlerrm='Accepted mismatched payment' then raise; end if; end;
  begin
    perform "sctn-dev".record_verified_reservation_payment(b.id,'test-'||b.id,1,'usd');
    raise exception 'Accepted wrong amount';
  exception when others then if sqlerrm='Accepted wrong amount' then raise; end if; end;
end $$;
select "sctn-dev".archive_past_bookings(other_venue) from history_fixture;
select set_config('request.jwt.claim.sub',manager::text,true) from history_fixture;
set local role authenticated;
select pg_temp.assert_history((select count(*) from "sctn-dev".logs_bookings where section_id in (f.section,f.other_section))=6,'Vendor RLS must exclude other venues') from history_fixture f;
select pg_temp.assert_history(not has_table_privilege('authenticated','"sctn-dev".logs_bookings','INSERT'),'Vendors cannot fabricate logs');
select pg_temp.assert_history(not has_table_privilege('authenticated','"sctn-dev".logs_reservation_payments','SELECT'),'Payment tokens stay private');
select pg_temp.assert_history(not has_function_privilege('authenticated','"sctn-dev".archive_past_bookings(uuid)','EXECUTE'),'Moving data is server-only');
select pg_temp.assert_history(not has_function_privilege('authenticated','"sctn-dev".record_verified_reservation_payment(uuid,text,bigint,text)','EXECUTE'),'Clients cannot mark a reservation paid');
reset role;
select pg_temp.assert_history(not has_table_privilege('anon','"sctn-dev".logs_bookings','SELECT'),'Anonymous users cannot read logs');
