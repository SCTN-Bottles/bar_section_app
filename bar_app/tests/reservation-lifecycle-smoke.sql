-- Read/write verification against the deployed schema. Always rolls back;
-- it does not invoke email delivery or Stripe APIs.
begin;
do $$
declare v uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); manager uuid; inventory uuid;
  first_attempt uuid:=gen_random_uuid(); second_attempt uuid:=gen_random_uuid(); third_attempt uuid:=gen_random_uuid();
  d date:=(now() at time zone 'America/Chicago')::date+3; b "sctn-dev".bookings%rowtype; conflict_rejected boolean:=false;
begin
  select user_id into manager from "sctn-dev".venue_managers limit 1;
  if manager is null then raise exception 'A fixture manager is required'; end if;
  insert into "sctn-dev".venues(id,name,slug,city,state) values(v,'Lifecycle verification','verification-'||v,'Chicago','IL');
  insert into "sctn-dev".sections(id,venue_id,name,area,description,capacity,minimum_spend,deposit_amount)
    values(s,v,'Verification section','indoor','Verification',12,100,25);
  insert into "sctn-dev".venue_managers(venue_id,user_id) values(v,manager);
  perform set_config('request.jwt.claim.sub',manager::text,true);
  perform "sctn-dev".save_section_schedule(jsonb_build_array(jsonb_build_object('section_id',s,'reservation_date',d,'booking_slot','night',
    'reservation_time','21:00','section_name','Verification section','section_description','Verification','section_capacity',12,
    'status','available','minimum_spend_amount',100,'deposit_amount',25)));
  select id into inventory from "sctn-dev".bookings where section_id=s;
  perform "sctn-dev".submit_reservation(first_attempt,v,s,d,'night','First guest','first@example.test','Birthday','[]');
  begin
    perform "sctn-dev".submit_reservation(second_attempt,v,s,d,'night','Second guest','second@example.test','','[]');
  exception when others then
    if sqlerrm not like '%just been reserved%' then raise; end if;
    conflict_rejected:=true;
  end;
  if not conflict_rejected then raise exception 'Competing reservation was accepted'; end if;
  perform "sctn-dev".submit_reservation(first_attempt,v,s,d,'night','First guest','first@example.test','Birthday','[]');
  perform "sctn-dev".review_section_reservation(first_attempt,'cancelled',manager);
  select * into b from "sctn-dev".bookings where id=inventory;
  if b.status<>'available' or b.customer_name is not null or b.customer_email is not null or b.drink_sign_text is not null
    or b.beverages is not null or b.reservation_id is not null or b.section_capacity<>12 then raise exception 'Decline did not reset inventory'; end if;
  if not exists(select 1 from "sctn-dev".reservation_release_emails where booking_id=first_attempt and recipient='first@example.test' and reason='declined') then
    raise exception 'Decline email snapshot was lost'; end if;
  perform "sctn-dev".submit_reservation(second_attempt,v,s,d,'night','Second guest','second@example.test','','[]');
  perform "sctn-dev".review_section_reservation(second_attempt,'confirmed',manager);
  update "sctn-dev".reservation_payments set payment_deadline=now()-interval '1 minute' where booking_id=second_attempt;
  if not "sctn-dev".release_expired_reservation(second_attempt,null) then raise exception 'Expiration did not release inventory'; end if;
  select * into b from "sctn-dev".bookings where id=inventory;
  if b.status<>'available' or b.customer_name is not null or b.customer_email is not null or b.beverages is not null then raise exception 'Expiration did not clear guest details'; end if;
  perform "sctn-dev".submit_reservation(third_attempt,v,s,d,'night','Third guest','third@example.test','','[]');
  perform "sctn-dev".release_expired_reservation(second_attempt,null);
  select * into b from "sctn-dev".bookings where id=inventory;
  if b.reservation_id<>third_attempt or b.status<>'pending' then raise exception 'Old expiration affected the new guest'; end if;
  perform "sctn-dev".review_section_reservation(third_attempt,'confirmed',manager);
  update "sctn-dev".reservation_payments set stripe_session_id='verification-'||third_attempt where booking_id=third_attempt;
  perform "sctn-dev".record_verified_reservation_payment(third_attempt,'verification-'||third_attempt,2500,'usd');
  select * into b from "sctn-dev".bookings where id=inventory;
  if b.status<>'sold' or b.customer_email<>'third@example.test' or b.section_capacity<>12 then raise exception 'Verified payment did not sell the same section row'; end if;
  if (select count(*) from "sctn-dev".bookings where section_id=s)<>1 then raise exception 'Reservation created extra inventory rows'; end if;
  if has_function_privilege('anon','"sctn-dev".submit_reservation(uuid,uuid,uuid,date,text,text,text,text,jsonb)','execute')
    or has_table_privilege('anon','"sctn-dev".reservation_attempts','select') then raise exception 'Reservation privacy permissions are incorrect'; end if;
end $$;
select 'PASS: deployed reservation lifecycle, one-row inventory, capacity, resets, outbox snapshots, retries, sold state, and private permissions' as result;
rollback;
