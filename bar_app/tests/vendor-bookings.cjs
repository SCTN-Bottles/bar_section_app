const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.resolve(__dirname, "../src/lib/vendor-bookings.ts"), "utf8");
const queries = [];
let failed = false;
const reservation = (id, date = "2026-11-10", status = "confirmed") => ({
  id, section_id: id, record_type: "reservation", reservation_date: date,
  reservation_time: "21:00:00", booking_slot: "night", status,
});
const live = Array.from({ length: 200 }, (_, i) => reservation(`booking-${String(i).padStart(3, "0")}`));
live.push({ ...reservation("manual"), record_type: "schedule", status: "sold" });
live.push({ ...reservation("duplicate"), section_id: "booking-000", record_type: "schedule", status: "sold" });
live.push(reservation("cancelled", "2026-11-11", "cancelled"));
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
  exports: exportsObject,
  Date: class extends Date {
    constructor(...args) { super(...(args.length ? args : ["2026-11-10T18:00:00Z"])); }
  },
  require: (name) => {
    assert.equal(name, "@/lib/supabase");
    return { supabase: { schema: (schema) => {
      assert.equal(schema, "sctn-dev");
      return { from: (table) => {
        assert.equal(table, "bookings", "View Bookings must never query archived logs");
        const operations = [];
        const query = {};
        for (const method of ["select", "eq", "or", "gte", "lte", "order"]) {
          query[method] = (...args) => { operations.push([method, ...args]); return query; };
        }
        query.range = async (start, end) => {
          operations.push(["range", start, end]);
          queries.push({ table, operations });
          return failed ? { error: { message: "Database failure" } } : { data: live.slice(start, end + 1) };
        };
        return query;
      } };
    } } };
  },
});

async function main() {
  const { bookingToday, validBookingDates, loadVendorBookings } = exportsObject;
  assert.equal(bookingToday(new Date("2026-11-11T03:00:00Z")), "2026-11-10", "Today uses Chicago time rather than UTC");
  assert.ok(validBookingDates("2026-11-10", "2026-11-10"));
  assert.ok(validBookingDates("2028-02-29", "2028-03-01"));
  for (const [start, end] of [["", ""], ["2027-02-29", "2027-03-01"], ["2026-11-11", "2026-11-10"], ["invalid", "2026-11-10"], ["2026-11-09", "2026-11-10"], ["2026-11-09", "2026-11-09"]]) {
    assert.equal(validBookingDates(start, end), false);
    await assert.rejects(loadVendorBookings("venue", start, end), /Choose a valid/);
  }
  assert.equal(queries.length, 0, "Invalid ranges must not issue a query");
  const bookings = await loadVendorBookings("venue", "2026-11-10", "2026-11-11");
  assert.equal(queries.length, 2, "Read all pages of current bookings only");
  assert.equal(bookings.length, 202, "Hide sold slots with active reservations");
  assert.equal(bookings[0].id, "booking-000");
  assert.ok(bookings.some((booking) => booking.id === "manual"));
  assert.ok(bookings.some((booking) => booking.status === "cancelled"));
  assert.ok(!bookings.some((booking) => booking.id === "duplicate"));
  for (const { operations } of queries) {
    assert.ok(operations.some(([method, column, value]) => method === "eq" && column === "sections.venue_id" && value === "venue"));
    assert.ok(operations.some(([method, column, value]) => method === "gte" && column === "reservation_date" && value === "2026-11-10"));
    assert.ok(operations.some(([method, column, value]) => method === "lte" && column === "reservation_date" && value === "2026-11-11"));
    assert.ok(operations.some(([method, value]) => method === "or" && value === "record_type.eq.reservation,and(record_type.eq.schedule,status.eq.sold)"));
    assert.ok(operations.some(([method, value]) => method === "select" && value.includes("sections!inner(venue_id)")));
  }
  failed = true;
  await assert.rejects(loadVendorBookings("venue", "2026-11-10", "2026-11-10"), /could not be loaded/);
  console.log("PASS: today/future validation, Chicago date boundaries, venue scoping, date filters, pagination, no archive queries, sold sections, deduplication, and load errors");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
