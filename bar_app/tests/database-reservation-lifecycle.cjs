// Set PGLITE_PATH to an installed @electric-sql/pglite directory.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PGlite } = require(process.env.PGLITE_PATH || "@electric-sql/pglite");

async function main() {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema realtime; create schema reservation_internal; create schema "sctn-dev";
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.user',true),'')::uuid$$;
      create function realtime.send(jsonb,text,text,boolean) returns void language sql as $$select$$;
      create table "sctn-dev".venues(id uuid primary key,name text,slug text,is_active boolean default true,booking_slots text[] default array['day','night'],booking_start_time time default '20:00');
      create table "sctn-dev".sections(id uuid primary key,venue_id uuid references "sctn-dev".venues,name text,area text,description text,capacity int,minimum_spend numeric,deposit_amount numeric,status text default 'available',image_url text,is_active boolean default true);
      create table "sctn-dev".venue_managers(venue_id uuid,user_id uuid);
      create table "sctn-dev".bookings(
        id uuid primary key default gen_random_uuid(),section_id uuid not null references "sctn-dev".sections,
        customer_name text,customer_email text,reservation_date date not null,guest_count int not null check(guest_count>0),status text not null default 'pending',
        drink_sign_text text,minimum_spend_amount numeric not null,deposit_amount numeric not null default 0,
        created_at timestamptz not null default now(),updated_at timestamptz not null default now(),reservation_time time not null default '20:00',
        booking_slot text not null default 'night',record_type text not null default 'reservation',section_name text,section_description text,beverages jsonb not null default '[]',
        constraint bookings_status_matches_record_type check((record_type='schedule' and status in ('available','sold')) or (record_type='reservation' and status in ('pending','confirmed','cancelled','completed'))),
        constraint bookings_record_details_check check((record_type='reservation' and customer_name is not null and customer_email is not null) or (record_type='schedule' and customer_name is null and customer_email is null)));
      create table "sctn-dev".logs_bookings(like "sctn-dev".bookings including all);
      create unique index bookings_unique_schedule on "sctn-dev".bookings(section_id,reservation_date,booking_slot) where record_type='schedule';
      create table "sctn-dev".reservation_payments(booking_id uuid primary key constraint reservation_payments_booking_id_fkey references "sctn-dev".bookings,
        token text unique not null default gen_random_uuid()::text,payment_email_sent_at timestamptz,confirmation_email_sent_at timestamptz,
        payment_deadline timestamptz,stripe_session_id text unique,paid_at timestamptz,paid_confirmation_email_sent_at timestamptz,amount_paid_at_checkout numeric);
      create table "sctn-dev".reservation_release_emails(booking_id uuid primary key,reason text,recipient text,section_name text,reservation_date date,queued_at timestamptz default now(),sent_at timestamptz);
      create table "sctn-dev".drink_schedule(venue_id uuid,reservation_date date);
      alter table "sctn-dev".bookings enable row level security;
      create policy manager on "sctn-dev".bookings for select to authenticated using(exists(select 1 from "sctn-dev".sections s join "sctn-dev".venue_managers vm on vm.venue_id=s.venue_id where s.id=section_id and vm.user_id=auth.uid()));
      grant usage on schema "sctn-dev",auth to authenticated,service_role,anon;
      grant all on all tables in schema "sctn-dev" to service_role;
      grant select on "sctn-dev".bookings,"sctn-dev".sections,"sctn-dev".venues,"sctn-dev".venue_managers,"sctn-dev".drink_schedule to authenticated;
      grant insert,update,delete on "sctn-dev".bookings to authenticated;
    `);
    const migration = path.resolve(__dirname, "../../supabase/migrations/20261111024155_single_row_reservation_lifecycle.sql");
    await db.exec(`begin; ${fs.readFileSync(migration, "utf8")} commit;`);
    // Install the real availability trigger; notifications are stubbed above.
    await db.exec(`create trigger availability after insert or update or delete on "sctn-dev".bookings for each row execute function "sctn-dev".signal_reservation_update();`);
    const venue = "11111111-1111-4111-8111-111111111111";
    const section = "22222222-2222-4222-8222-222222222222";
    const manager = "33333333-3333-4333-8333-333333333333";
    const attempt1 = "44444444-4444-4444-8444-444444444444";
    const attempt2 = "55555555-5555-4555-8555-555555555555";
    const attempt3 = "66666666-6666-4666-8666-666666666666";
    const attempt4 = "77777777-7777-4777-8777-777777777777";
    const date = (await db.query(`select ((now() at time zone 'America/Chicago')::date+1)::text as date`)).rows[0].date;
    await db.query(`insert into "sctn-dev".venues(id,name) values($1,'Test')`, [venue]);
    await db.query(`insert into "sctn-dev".sections(id,venue_id,name,area,capacity) values($1,$2,'A1','indoor',12)`, [section,venue]);
    await db.query(`insert into "sctn-dev".venue_managers values($1,$2)`, [venue,manager]);
    await db.query(`select set_config('test.user',$1,false)`, [manager]);
    const settings = [{ section_id: section,reservation_date: date,booking_slot: "night",reservation_time: "21:00",section_name: "A1",section_description: "Section",section_capacity: 12,status: "available",minimum_spend_amount: 100,deposit_amount: 25 }];
    const save = (values = settings) => db.query(`select * from "sctn-dev".save_section_schedule($1)`, [JSON.stringify(values)]);
    await db.exec("set role authenticated");
    await save();
    await db.exec("reset role");
    const inventory = async () => (await db.query(`select * from "sctn-dev".bookings where section_id=$1`, [section])).rows[0];
    const initial = await inventory();
    const claim = (id, email) => db.query(`select "sctn-dev".submit_reservation($1,$2,$3,$4,'night','Guest',$5,'Birthday','[]')`, [id,venue,section,date,email]);
    await db.exec("set role anon");
    await assert.rejects(claim(attempt1,"guest@example.test"), /permission denied/);
    assert.equal((await db.query(`select * from "sctn-dev".get_reservation_sections($1,$2,'night')`, [venue,date])).rows[0].status,"available");
    await db.exec("set role service_role");
    const competing = await Promise.allSettled([claim(attempt1,"first@example.test"),claim(attempt2,"second@example.test")]);
    assert.equal(competing.filter((item) => item.status === "fulfilled").length,1,"Only one competing request can claim a section");
    assert.match(competing.find((item) => item.status === "rejected").reason.message,/just been reserved/);
    assert.equal((await inventory()).id,initial.id,"Submission updates the existing inventory row");
    assert.equal((await inventory()).section_capacity,12);
    await claim(attempt1,"first@example.test");
    assert.equal((await db.query(`select count(*)::int n from "sctn-dev".reservation_attempts`)).rows[0].n,1,"Identical retries are idempotent");
    const review = (id,status,user=manager) => db.query(`select "sctn-dev".review_section_reservation($1,$2,$3)`,[id,status,user]);
    await assert.rejects(review(attempt1,"confirmed",attempt4),/unavailable/);
    await db.exec("reset role; set role authenticated");
    await assert.rejects(db.query(`update "sctn-dev".bookings set status='available'`),/permission denied/);
    await assert.rejects(save([{...settings[0],status:"sold"}]),/locked/);
    await save();
    await assert.rejects(db.query(`select "sctn-dev".delete_schedule_day($1,$2)`,[venue,date]),/active reservation/);
    await db.exec("reset role; set role service_role");
    await review(attempt1,"cancelled");
    const released = await inventory();
    assert.equal(released.status,"available");
    for (const field of ["customer_name","customer_email","drink_sign_text","beverages","reservation_id"]) assert.equal(released[field],null,`${field} clears on release`);
    assert.equal(released.section_capacity,12);
    assert.equal((await db.query(`select recipient from "sctn-dev".reservation_release_emails where booking_id=$1`,[attempt1])).rows[0].recipient,"first@example.test");
    await claim(attempt2,"second@example.test");
    await review(attempt1,"cancelled");
    assert.equal((await inventory()).reservation_id,attempt2,"Retrying an old denial cannot clear a new guest");
    await review(attempt2,"confirmed");
    await db.query(`update "sctn-dev".reservation_payments set payment_deadline=now()-interval '1 minute',stripe_session_id='old-session' where booking_id=$1`,[attempt2]);
    assert.equal((await db.query(`select "sctn-dev".release_expired_reservation($1,'wrong-session') released`,[attempt2])).rows[0].released,false);
    assert.equal((await db.query(`select "sctn-dev".release_expired_reservation($1,'old-session') released`,[attempt2])).rows[0].released,true);
    assert.equal((await inventory()).status,"available");
    await claim(attempt3,"third@example.test");
    const token = async (id) => (await db.query(`select token from "sctn-dev".reservation_payments where booking_id=$1`,[id])).rows[0].token;
    assert.notEqual(await token(attempt2),await token(attempt3),"Every attempt gets a separate private payment link");
    await db.query(`select "sctn-dev".release_expired_reservation($1,'old-session')`,[attempt2]);
    assert.equal((await inventory()).reservation_id,attempt3);
    await assert.rejects(db.query(`select "sctn-dev".record_verified_reservation_payment($1,'old-session',2500,'usd')`,[attempt2]),/contact the venue/);
    await review(attempt3,"confirmed");
    await db.query(`update "sctn-dev".reservation_payments set payment_deadline=now()+interval '1 hour',stripe_session_id='new-session' where booking_id=$1`,[attempt3]);
    await assert.rejects(db.query(`select "sctn-dev".record_verified_reservation_payment($1,'new-session',1,'usd')`,[attempt3]),/Payment mismatch/);
    await db.query(`select "sctn-dev".record_verified_reservation_payment($1,'new-session',2500,'usd')`,[attempt3]);
    const paidAt = (await db.query(`select paid_at from "sctn-dev".reservation_payments where booking_id=$1`,[attempt3])).rows[0].paid_at;
    await db.query(`select "sctn-dev".record_verified_reservation_payment($1,'new-session',2500,'usd')`,[attempt3]);
    assert.equal((await inventory()).status,"sold");
    assert.equal(String((await db.query(`select paid_at from "sctn-dev".reservation_payments where booking_id=$1`,[attempt3])).rows[0].paid_at),String(paidAt));
    await assert.rejects(claim(attempt4,"fourth@example.test"),/just been reserved/);
    assert.equal((await db.query(`select count(*)::int n from "sctn-dev".bookings`)).rows[0].n,1,"All attempts reuse one row");
    await db.exec("reset role");
    await db.query(`update "sctn-dev".bookings set reservation_date=(now() at time zone 'America/Chicago')::date-1`);
    await db.query(`select "sctn-dev".archive_past_bookings($1)`,[venue]);
    await db.exec("set role service_role");
    await db.query(`select "sctn-dev".record_verified_reservation_payment($1,'new-session',2500,'usd')`,[attempt3]);
    assert.equal((await db.query(`select status from "sctn-dev".logs_bookings`)).rows[0].status,"sold");
    const history = await db.query(`select * from "sctn-dev".get_booking_history($1)`,[venue]);
    assert.equal(history.rows[0].booking_id,attempt3);
    assert.equal(history.rows[0].section_capacity,12,"History retains section capacity only");
    await db.exec("reset role; set role authenticated");
    await db.query(`select set_config('test.user',$1,false)`,[attempt4]);
    assert.equal((await db.query(`select * from "sctn-dev".reservation_attempts`)).rows.length,0,"Other managers cannot read guests");
    console.log("PASS: migration, one-row inventory, capacity-only schema, competing claims, retry safety, venue authorization, denial cleanup, expiration cleanup, email snapshots, stale-payment rejection, sold state, and archival payment retries");
  } finally { await db.close(); }
}
main().catch((error) => { console.error(error.message, error.where || "", error.position ? `SQL position ${error.position}: ${error.query?.slice(Number(error.position)-180,Number(error.position)+180)}` : ""); process.exitCode=1; });
