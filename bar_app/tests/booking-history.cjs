const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, dependencies = {}) {
  const exports = {};
  const source = fs.readFileSync(path.resolve(__dirname, "../src", file), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, URL, Response, require: (name) => dependencies[name] ?? require(name) });
  return exports;
}

async function main() {
  const filters = load("lib/booking-history.ts");
  assert.equal(filters.parseHistoryFilters(new URLSearchParams()).page, 1);
  assert.equal(filters.parseHistoryFilters(new URLSearchParams("month=12&year=2026&page=2")).month, 12);
  for (const invalid of ["month=13", "month=-1", "year=abc", "page=0", "page=1.5", "page=1000000"]) {
    assert.throws(() => filters.parseHistoryFilters(new URLSearchParams(invalid)), /Invalid history/);
  }
  let user = { id: "manager" };
  let assigned = true;
  let archiveCalls = 0;
  let failArchive = false;
  const queries = [];
  const db = {
    from(table) {
      const operations = [];
      const query = {
        select(...args) { operations.push(["select", ...args]); return query; },
        eq(...args) { operations.push(["eq", ...args]); return query; },
        order(...args) { operations.push(["order", ...args]); return query; },
        range(...args) { operations.push(["range", ...args]); return query; },
        async maybeSingle() { return { data: assigned ? { venue_id: "venue" } : null }; },
        then(resolve, reject) {
          queries.push({ table, operations });
          return Promise.resolve({ data: [{ booking_id: "archived-booking", section_name: "Historical section" }], count: 12 }).then(resolve, reject);
        },
      };
      return query;
    },
    async rpc(name, args) {
      assert.equal(name, "get_booking_history_years"); assert.equal(args.p_venue_id, "venue");
      return { data: [{ year: 2026 }] };
    },
  };
  const route = load("app/api/reservations/history/route.ts", {
    "@supabase/supabase-js": { createClient: () => ({ auth: { getUser: async () => ({ data: { user } }) }, schema: () => db }) },
    "@/lib/booking-history": filters,
    "@/lib/server/reservation-payments": {
      requiredEnv: () => "test",
      errorResponse: (error) => Response.json({ error: error.message }, { status: 400 }),
      adminClient: () => ({ schema: () => ({ rpc: (name, args) => {
        assert.equal(args.p_venue_id, "venue");
        if (name === "archive_past_bookings") {
          archiveCalls++;
          return Promise.resolve({ error: failArchive ? { message: "failure" } : null });
        }
        if (name === "get_booking_history_years") return Promise.resolve({ data: [{ year: 2026 }] });
        assert.equal(name, "get_booking_history");
        const query = db.from("logs_bookings");
        query.eq("venue_id", args.p_venue_id);
        if (args.p_month) query.eq("reservation_month", args.p_month);
        if (args.p_year) query.eq("reservation_year", args.p_year);
        return query;
      } }) }),
    },
  });
  const request = (query = "") => new Request(`https://example.test/api/reservations/history?venueId=venue&${query}`, { headers: { authorization: "Bearer test" } });
  user = null;
  assert.equal((await route.GET(request())).status, 401);
  user = { id: "manager" }; assigned = false;
  assert.equal((await route.GET(request())).status, 403);
  assert.equal(archiveCalls, 0, "Unauthorized requests cannot archive or read private data");
  assigned = true;
  const response = await route.GET(request("year=2026&month=11&page=2"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const data = await response.json();
  assert.equal(data.total, 12); assert.equal(data.page, 2); assert.deepEqual(data.years, [2026]);
  assert.equal(data.reservations[0].booking_id, "archived-booking");
  assert.ok(queries[0].operations.some((op) => op[0] === "eq" && op[1] === "venue_id" && op[2] === "venue"));
  assert.ok(queries[0].operations.some((op) => op[1] === "reservation_month" && op[2] === 11));
  assert.ok(queries[0].operations.some((op) => op[1] === "reservation_year" && op[2] === 2026));
  assert.ok(queries[0].operations.some((op) => op[0] === "range" && op[1] === 10 && op[2] === 19));
  const clamped = await (await route.GET(request("page=99"))).json();
  assert.equal(clamped.page, 2, "Out of range pages recover to the last page");
  failArchive = true;
  const failed = await route.GET(request());
  assert.equal(failed.status, 400);
  assert.match((await failed.json()).error, /Could not update booking history/);
  console.log("PASS: history authorization, filters, archive refresh, database pagination, stable page bounds, and error handling");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
