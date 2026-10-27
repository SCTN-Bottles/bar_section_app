// Optional local verification using an embedded Postgres, without touching the remote DB.
const fs = require("node:fs");
const path = require("node:path");
const { PGlite } = require(process.env.PGLITE_PATH || "@electric-sql/pglite");

async function main() {
  const db = new PGlite();
  try {
    // Minimal existing-schema fixture. The migration and assertions below are the real files.
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema "sctn-dev";
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,"sctn-dev" to anon,authenticated;
      create table "sctn-dev".venues (id uuid primary key, is_active boolean not null default true, booking_slots text[] not null default array['night'], booking_start_time time not null default '20:00');
      create table "sctn-dev".sections (id uuid primary key,venue_id uuid references "sctn-dev".venues(id),is_active boolean not null default true,name text,area text,description text,capacity integer,minimum_spend numeric,deposit_amount numeric,status text,image_url text);
      create table "sctn-dev".venue_managers (venue_id uuid references "sctn-dev".venues(id),user_id uuid,primary key(venue_id,user_id));
      create table "sctn-dev".bookings (id uuid primary key default gen_random_uuid(),record_type text not null default 'reservation',section_id uuid references "sctn-dev".sections(id),reservation_date date,booking_slot text default 'night',reservation_time time default '20:00',section_name text,section_description text,guest_count integer,status text default 'pending',minimum_spend_amount numeric,deposit_amount numeric,customer_name text,customer_email text);
      create unique index bookings_unique_schedule on "sctn-dev".bookings(section_id,reservation_date,booking_slot) where record_type='schedule';
      insert into "sctn-dev".venues(id) values('00000000-0000-4000-8000-000000000001');
      insert into "sctn-dev".sections values ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001',true,'Default section','indoor','Description',10,100,25,'available',null);
      insert into "sctn-dev".venue_managers values ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003');
      grant select on "sctn-dev".venues,"sctn-dev".sections to anon,authenticated;
      grant select on "sctn-dev".venue_managers to authenticated;
      grant select,insert,update,delete on "sctn-dev".bookings to authenticated;
      alter table "sctn-dev".venue_managers enable row level security;
      create policy self on "sctn-dev".venue_managers for select to authenticated using(user_id=(select auth.uid()));
      alter table "sctn-dev".bookings enable row level security;
      create policy manager on "sctn-dev".bookings for all to authenticated using(exists(select 1 from "sctn-dev".sections s join "sctn-dev".venue_managers vm on s.venue_id=vm.venue_id where s.id=section_id and vm.user_id=(select auth.uid()))) with check(exists(select 1 from "sctn-dev".sections s join "sctn-dev".venue_managers vm on s.venue_id=vm.venue_id where s.id=section_id and vm.user_id=(select auth.uid())));
    `);
    const root = path.resolve(__dirname, "../..");
    const migration = fs.readdirSync(path.join(root, "supabase/migrations")).find((file) => file.endsWith("_daily_drink_menus_and_reservation_catalog.sql"));
    await db.exec(fs.readFileSync(path.join(root, "supabase/migrations", migration), "utf8"));
    const rename = fs.readdirSync(path.join(root, "supabase/migrations")).find((file) => file.endsWith("_rename_daily_drink_menus_to_drink_schedule.sql"));
    await db.exec(fs.readFileSync(path.join(root, "supabase/migrations", rename), "utf8"));
    await db.exec(fs.readFileSync(path.join(root, "supabase/tests/daily_drink_menus.sql"), "utf8"));
    const { rows } = await db.query('select count(*)::int as count from "sctn-dev".drink_schedule');
    if (rows[0].count !== 0) throw new Error("Tests must roll back fixture changes");
    console.log("PASS: migration SQL, menu upserts, empty menus, validation, atomic writes, manager RLS, anonymous reads, reservation overrides, availability, and customer privacy");
  } finally { await db.close(); }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
