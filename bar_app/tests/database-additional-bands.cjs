// Runs the real migration and SQL scenarios in embedded PostgreSQL without live writes.
const fs = require("node:fs");
const path = require("node:path");
const { PGlite } = require(process.env.PGLITE_PATH || "@electric-sql/pglite");
async function main() {
  const db = new PGlite();
  const root = path.resolve(__dirname, "../..");
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema "sctn-dev"; create schema reservation_internal;
      create table "sctn-dev".venues(id uuid primary key,name text,slug text,city text,state text,is_active boolean default true,booking_slots text[] default array['night']);
      create table "sctn-dev".sections(id uuid primary key,venue_id uuid references "sctn-dev".venues(id),name text,area text,description text,capacity integer,minimum_spend numeric,deposit_amount numeric,is_active boolean default true);
      create table "sctn-dev".bookings(id uuid primary key default gen_random_uuid(),section_id uuid,customer_name text,customer_email text,reservation_date date,section_capacity integer,status text default 'available',drink_sign_text text,minimum_spend_amount numeric,deposit_amount numeric default 0,created_at timestamptz default now(),updated_at timestamptz default now(),reservation_time time default '20:00',booking_slot text default 'night',record_type text default 'schedule',section_name text,section_description text,beverages jsonb,reservation_id uuid);
      create table "sctn-dev".logs_bookings(like "sctn-dev".bookings including all);
      create table "sctn-dev".reservation_attempts(like "sctn-dev".bookings including all);
      alter table "sctn-dev".reservation_attempts add column booking_id uuid;
      create table "sctn-dev".reservation_payments(booking_id uuid primary key,stripe_session_id text,paid_at timestamptz,amount_paid_at_checkout numeric);
      create table "sctn-dev".reservation_release_emails(booking_id uuid primary key,reason text,recipient text,section_name text,reservation_date date);
      -- Old signatures are replaced by the migration; their bodies are irrelevant to this fixture.
      create function "sctn-dev".submit_reservation(uuid,uuid,uuid,date,text,text,text,text,jsonb) returns uuid language sql as $$ select $1 $$;
      create function "sctn-dev".get_booking_history(uuid,integer,integer) returns integer language sql as $$ select 0 $$;
      create function "sctn-dev".archive_past_bookings(p_venue_id uuid default null) returns integer language plpgsql as $$
      declare moved integer; begin
        insert into "sctn-dev".logs_bookings select b.* from "sctn-dev".bookings b join "sctn-dev".sections s on s.id=b.section_id where s.venue_id=p_venue_id and b.reservation_date<(now() at time zone 'America/Chicago')::date;
        delete from "sctn-dev".bookings b using "sctn-dev".sections s where s.id=b.section_id and s.venue_id=p_venue_id and b.reservation_date<(now() at time zone 'America/Chicago')::date;
        get diagnostics moved=row_count; return moved; end $$;
    `);
    const migration = fs.readdirSync(path.join(root, "supabase/migrations")).find((name) => name.endsWith("_additional_reservation_bands.sql"));
    await db.exec(fs.readFileSync(path.join(root, "supabase/migrations", migration), "utf8"));
    await db.exec(fs.readFileSync(path.join(root, "supabase/tests/additional_bands.sql"), "utf8"));
    const { rows } = await db.query('select count(*)::integer as count from "sctn-dev".venues');
    if (rows[0].count !== 0) throw new Error("Fixtures did not roll back");
    console.log("PASS: bands migration, constraints, defaults, retries, release/reuse, full payment verification, archiving/history, and RPC grants");
  } finally { await db.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
