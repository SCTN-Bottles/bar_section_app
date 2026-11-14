const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

async function main() {
  const booking = { id: "booking", section_id: "section", section_name: "A1", reservation_date: "2027-01-03", reservation_time: "21:30", booking_slot: "night", section_capacity: 12, additional_bands: 2, deposit_amount: 25, customer_email: "guest@example.test" };
  const payment = { booking_id: booking.id, amount_paid_at_checkout: 65, paid_at: null, paid_confirmation_email_sent_at: null };
  const venue = { name: "Test venue", address: "1 Test St", city: "Chicago", state: "IL" };
  let archived = false;
  let failEmail = false;
  let recordingError = false;
  let sessionPaid = true;
  const sent = [];
  const db = {
    async rpc(name) {
      assert.equal(name, "record_verified_reservation_payment");
      if (recordingError) return { error: { message: "Payment mismatch." } };
      payment.paid_at ||= "2026-11-07T01:00:00Z";
      return { error: null };
    },
    from(table) {
      let patch;
      function row() {
        if (table === "reservation_attempts") return booking;
        if (table === "reservation_payments") return payment;
        if (table === "sections") return { venue_id: "venue" };
        if (table === "venues") return venue;
        throw new Error(`Unexpected table ${table}`);
      }
      const query = {
        select() { return query; }, eq() { return query; }, is() { return query; },
        update(value) { patch = value; return query; },
        async single() { return { data: row() }; },
        async maybeSingle() { return { data: row() }; },
        then(resolve, reject) { if (patch && row()) Object.assign(row(), patch); return Promise.resolve({ error: null }).then(resolve, reject); },
      }; return query;
    },
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, "../src/lib/server/reservation-payments.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    exports, URL, AbortSignal,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://example.test", SUPABASE_SERVICE_ROLE_KEY: "test", STRIPE_SECRET_KEY: "test", RESEND_API_KEY: "test" } },
    require(name) {
      if (name === "@/lib/additional-bands") {
        const helper = { exports: {} };
        vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, "../src/lib/additional-bands.ts"), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: helper.exports });
        return helper.exports;
      }
      if (name === "server-only") return {};
      if (name === "@/lib/booking-time") return { formatBookingTime: () => "9:30 PM" };
      if (name === "@supabase/supabase-js") return { createClient: () => ({ schema: () => db }) };
      if (name === "stripe") return class { constructor() { return { checkout: { sessions: { retrieve: async () => ({ id: "session", metadata: { reservation_id: booking.id }, payment_status: sessionPaid ? "paid" : "unpaid", currency: "usd", amount_total: 6500 }) } } }; } };
      return require(name);
    },
    async fetch(_url, options) {
      assert.ok(payment.paid_at, "Payment must be saved before an email is sent");
      if (failEmail) return { ok: false };
      sent.push({ body: JSON.parse(options.body), key: options.headers["Idempotency-Key"] });
      return { ok: true };
    },
  });
  await assert.rejects(exports.sendPaidReservationEmail(booking.id), /must be verified/);
  sessionPaid = false;
  assert.equal(await exports.reconcileCheckout("session", true), false);
  assert.equal(sent.length, 0);
  sessionPaid = true;
  recordingError = true;
  await assert.rejects(exports.reconcileCheckout("session", true), /Payment mismatch/);
  assert.equal(sent.length, 0);
  recordingError = false;
  assert.equal(await exports.reconcileCheckout("session", true), true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].body.to[0], booking.customer_email);
  assert.match(sent[0].body.text, /contact venue management for band pickup instructions/);
  assert.match(sent[0].body.text, /contact venue management for entry instructions/);
  assert.match(sent[0].body.text, /Deposit paid: \$25.00/);
  assert.match(sent[0].body.text, /Section capacity: 12/);
  assert.match(sent[0].body.text, /Additional bands: 2 × \$20 = \$40/);
  assert.match(sent[0].body.text, /Total guest allowance: 14/);
  assert.match(sent[0].body.text, /Total paid: \$65.00/);
  assert.equal(sent[0].key, "reservation-booking-paid");
  assert.ok(payment.paid_confirmation_email_sent_at);
  await exports.reconcileCheckout("session", true);
  assert.equal(sent.length, 1, "Webhook retries and page refreshes must not resend a tracked email");
  payment.paid_confirmation_email_sent_at = null;
  failEmail = true;
  assert.equal(await exports.reconcileCheckout("session"), true, "Email failure must not hide a successful payment on the return page");
  await assert.rejects(exports.reconcileCheckout("session", true), /delivery failed/, "Webhook must retry an unsent email");
  assert.equal(payment.paid_confirmation_email_sent_at, null);
  failEmail = false;
  archived = true;
  await exports.reconcileCheckout("session", true);
  assert.equal(sent.length, 2, "Late webhooks can find archived bookings and payments");
  assert.ok(payment.paid_confirmation_email_sent_at);
  assert.match(sent[1].body.text, /contact venue management for band pickup instructions/);
  assert.match(sent[1].body.text, /contact venue management for entry instructions/);
  console.log("PASS: payment-first confirmation, hard-coded content, duplicate protection, delivery retries, and archived bookings");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
