const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(relativePath, dependencies, globals = {}) {
  const filename = path.resolve(__dirname, "../src", relativePath);
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, process: { env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.test", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test", SUPABASE_SERVICE_ROLE_KEY: "test", STRIPE_SECRET_KEY: "test",
    STRIPE_WEBHOOK_SECRET: "test", RESEND_API_KEY: "test", APP_URL: "https://example.test",
  } }, require: (name) => name in dependencies ? dependencies[name] : name === "@/lib/additional-bands" ? load("lib/additional-bands.ts", {}) : require(name), URL, Response, ...globals });
  return exports;
}

async function main() {
  let session = { id: "cs_test", metadata: { reservation_id: "booking" }, payment_status: "paid", currency: "usd", amount_total: 2500 };
  let booking = { deposit_amount: 25, status: "confirmed" };
  let payment = { stripe_session_id: "cs_test", paid_at: null };
  let updates = 0;
  let releases = 0;
  let stripeExpirations = 0;
  let failExpiration = false;
  const db = { async rpc(name, args) {
    if (name === "release_expired_reservation") {
      assert.equal(args.p_id, "booking");
      assert.equal(args.p_session_id, payment.stripe_session_id);
      if (payment.paid_at || booking.status !== "confirmed") return { data: false };
      releases++;
      booking.status = "cancelled";
      return { data: true };
    }
    assert.equal(name, "record_verified_reservation_payment");
    if (payment.stripe_session_id !== args.p_session_id) return { error: { message: "Reservation payment not found." } };
    if (args.p_currency !== "usd" || args.p_amount !== booking.deposit_amount * 100) return { error: { message: "Payment mismatch." } };
    if (!["confirmed", "sold"].includes(booking.status)) return { error: { message: "Please contact the venue to confirm your paid reservation." } };
    if (!payment.paid_at) { payment.paid_at = new Date().toISOString(); updates++; }
    return { error: null };
  }, from(table) {
    let patch;
    const query = {
      select() { return query; }, eq() { return query; }, is() { return query; },
      update(value) { patch = value; return query; },
      async single() { return { data: table === "reservation_attempts" ? booking : payment }; },
      async maybeSingle() { return { data: table === "reservation_attempts" ? booking : payment }; },
      then(resolve, reject) {
        if (patch && table === "reservation_payments") { updates++; Object.assign(payment, patch); }
        if (patch && table === "bookings") { releases++; Object.assign(booking, patch); }
        return Promise.resolve({ error: null }).then(resolve, reject);
      },
    };
    return query;
  } };
  const { reconcileCheckout, refreshReservationPayment } = load("lib/server/reservation-payments.ts", {
    "server-only": {},
    "@/lib/booking-time": { formatBookingTime: () => "9:30 PM" },
    "@supabase/supabase-js": { createClient: () => ({ schema: () => db }) },
    stripe: class { constructor() { return { checkout: { sessions: {
      retrieve: async () => session,
      expire: async () => { if (failExpiration) throw new Error("Stripe unavailable"); stripeExpirations++; session.status = "expired"; return session; },
    } } }; } },
  });
  assert.equal(await reconcileCheckout("cs_test"), true);
  assert.ok(payment.paid_at);
  assert.equal(updates, 1);
  assert.equal(await reconcileCheckout("cs_test"), true);
  assert.equal(updates, 1, "refresh and webhook must not overwrite payment time");
  payment.paid_at = null;
  session.payment_status = "unpaid";
  assert.equal(await reconcileCheckout("cs_test"), false);
  assert.equal(payment.paid_at, null);
  session.payment_status = "paid";
  session.amount_total = 1;
  await assert.rejects(reconcileCheckout("cs_test"), /Payment mismatch/);
  session.amount_total = 2500;
  session.currency = "eur";
  await assert.rejects(reconcileCheckout("cs_test"), /Payment mismatch/);
  session.currency = "usd";
  payment.stripe_session_id = "another_session";
  await assert.rejects(reconcileCheckout("cs_test"), /not found/);
  payment.stripe_session_id = session.id;
  booking.status = "cancelled";
  await assert.rejects(reconcileCheckout("cs_test"), /contact the venue/);
  assert.equal(updates, 1, "unverified payments must never be recorded");
  booking.status = "confirmed";
  const overdue = { booking_id: "booking", stripe_session_id: session.id, paid_at: null, payment_deadline: new Date(Date.now() - 1000).toISOString() };
  assert.equal(await refreshReservationPayment(overdue), "paid", "missed payment webhook is recovered before releasing inventory");
  assert.equal(releases, 0);
  assert.equal(await refreshReservationPayment({ ...overdue, paid_at: payment.paid_at }), "paid");
  payment.paid_at = null;
  session.payment_status = "unpaid";
  session.status = "open";
  assert.equal(await refreshReservationPayment({ ...overdue, payment_deadline: new Date(Date.now() + 60000).toISOString() }), "unpaid");
  assert.equal(stripeExpirations, 0, "approval alone must not expire checkout or remove a reservation");
  failExpiration = true;
  await assert.rejects(refreshReservationPayment(overdue), /Stripe unavailable/);
  assert.equal(releases, 0, "a failed Stripe check must not release a potentially paid section");
  failExpiration = false;
  assert.equal(await refreshReservationPayment(overdue), "expired");
  assert.equal(stripeExpirations, 1);
  assert.equal(booking.status, "cancelled");
  assert.equal(releases, 1);
  booking.status = "confirmed";
  session.status = "complete";
  assert.equal(await refreshReservationPayment(overdue), "unpaid", "processing payments must remain held");
  assert.equal(releases, 1);
  assert.equal(await refreshReservationPayment({ ...overdue, stripe_session_id: null, payment_deadline: null }), "unpaid");
  payment.stripe_session_id = null;
  assert.equal(await refreshReservationPayment({ ...overdue, stripe_session_id: null }), "expired");
  assert.equal(releases, 2, "expired reservations without a Stripe session also release their section");
  booking.status = "confirmed";
  payment.stripe_session_id = session.id;
  session.status = "expired";
  assert.equal(await refreshReservationPayment(overdue), "expired");
  assert.equal(booking.status, "cancelled", "Stripe auto-expiration releases an unpaid section");
  assert.equal(stripeExpirations, 1, "an automatically expired session needs no manual closure");

  const approvalBooking = { id: "approved", status: "confirmed", deposit_amount: 25 };
  const approvalPayment = { token: "private", payment_deadline: null, stripe_session_id: null };
  const approvalDb = { from(table) {
    const row = table === "reservation_attempts" ? approvalBooking : approvalPayment;
    let patch;
    const query = {
      select() { return query; }, eq() { return query; }, is() { return query; }, gt() { return query; },
      update(value) { patch = value; return query; },
      async single() { return { data: { ...row } }; },
      async maybeSingle() { Object.assign(row, patch); return { data: { ...row } }; },
      then(resolve, reject) { return query.maybeSingle().then(resolve, reject); },
    };
    return query;
  } };
  let checkoutCreates = 0;
  let emailAttempts = 0;
  const approvalTime = Date.now();
  class ApprovalDate extends Date {
    constructor(...args) { super(...(args.length ? args : [approvalTime])); }
    static now() { return approvalTime; }
  }
  const checkout = { id: "cs_approved", status: "open", url: "https://checkout.stripe.test" };
  const approval = load("lib/server/reservation-payments.ts", {
    "server-only": {},
    "@/lib/booking-time": {},
    "@supabase/supabase-js": { createClient: () => ({ schema: () => approvalDb }) },
    stripe: class { constructor() { return { checkout: { sessions: {
      create: async (params) => {
        checkoutCreates++;
        assert.equal(params.expires_at * 1000, Date.parse(approvalPayment.payment_deadline));
        assert.equal(params.expires_at - Math.floor(approvalTime / 1000), 3600);
        return checkout;
      },
      retrieve: async () => checkout,
    } } }; } },
  }, { Date: ApprovalDate, fetch: async (_url, options) => {
    emailAttempts++;
    assert.equal(approvalPayment.stripe_session_id, checkout.id, "save checkout before sending the approval email");
    assert.match(JSON.parse(options.body).text, /\/pay\?token=private/);
    return { ok: emailAttempts > 1 };
  } });
  await assert.rejects(approval.sendReservationEmail("approved", true), /Email delivery failed/);
  const approvalDeadline = approvalPayment.payment_deadline;
  await approval.sendReservationEmail("approved", true);
  assert.ok(approvalPayment.payment_email_sent_at);
  assert.equal(approvalPayment.payment_deadline, approvalDeadline, "email retries preserve the original deadline");
  assert.equal(await approval.prepareCheckout("approved"), checkout.url);
  assert.equal(checkoutCreates, 1, "opening the payment link reuses the approval checkout");

  let assigned = false;
  let adminReads = 0;
  const listBookings = [{ id: "pending", status: "pending" }, { id: "approved", status: "confirmed" }, { id: "paid", status: "confirmed" }, { id: "expired", status: "confirmed" }];
  const listPayments = listBookings.map((row) => ({ booking_id: row.id, paid_at: row.id === "paid" ? "2026-01-01" : null, payment_deadline: null }));
  const vendorDb = { from() {
    const query = { select() { return query; }, eq() { return query; }, in() { return query; }, order() { return query; },
      async maybeSingle() { return { data: assigned ? { venue_id: "venue" } : null }; },
      then(resolve, reject) { return Promise.resolve({ data: listBookings }).then(resolve, reject); },
    }; return query;
  } };
  const pendingRoute = load("app/api/reservations/pending/route.ts", {
    "@supabase/supabase-js": { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: "manager" } } }) }, schema: () => vendorDb }) },
    "@/lib/server/reservation-payments": {
      requiredEnv: () => "test",
      errorResponse: (error) => Response.json({ error: error.message }, { status: 400 }),
      adminClient: () => { adminReads++; return { schema: () => ({ from: () => ({ select: () => ({ in: async () => ({ data: listPayments }) }) }) }) }; },
      refreshReservationPayment: async (row) => row.booking_id === "expired" ? "expired" : "unpaid",
      sendReservationReleaseEmail: async () => {},
    },
  });
  const request = () => new Request("https://example.test/api/reservations/pending?venueId=venue", { headers: { authorization: "Bearer test" } });
  assert.equal((await pendingRoute.GET(request())).status, 403);
  assert.equal(adminReads, 0, "unauthorized vendors must never reach private payment data");
  assigned = true;
  const pendingList = await (await pendingRoute.GET(request())).json();
  assert.deepEqual(pendingList.requests.map((row) => row.id), ["pending", "approved"], "approval stays visible; paid and expired reservations leave the queue");

  let savedSettings;
  const scheduleDb = {
    from(table) {
      const query = {
        select() { return query; },
        eq() { return query; },
        in() { return query; },
        async single() { return { data: { booking_slots: ["day", "night"], booking_start_time: "20:00" } }; },
        then(resolve, reject) {
          const data = table === "bookings"
            ? [{ section_id: "section", reservation_date: "2027-01-03", booking_slot: "night",reservation_time:"21:00",section_name:"A",section_description:"Section",section_capacity:10,minimum_spend_amount:100,deposit_amount:25,status:"pending",reservation_id:"attempt" }] : [];
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
    async rpc(_name, { p_settings }) { savedSettings = p_settings; return { data: p_settings }; },
  };
  const schedule = load("lib/booking-schedule.ts", {
    "@/lib/sections": { getSections: async () => [{ id: "section", name: "A", description: "Section", capacity: 10, deposit: 25, minimumSpend: 100, status: "available" }] },
    "@/lib/supabase": { supabase: { schema: () => scheduleDb } },
  });
  const { sections } = await schedule.loadBookingSchedule("venue", "test-bar", ["2027-01-03", "2027-01-04"]);
  assert.equal(sections.find((row) => row.date === "2027-01-03" && row.slot === "night").reservationStatus, "pending");
  assert.equal(sections.filter((row) => !row.reservationStatus).length, 3, "other dates and slots remain available");
  await schedule.saveBookingSchedule(sections);
  assert.ok(savedSettings.every((row) => row.status === "available"), "reservation holds must not overwrite manual availability when saving unrelated edits");

  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const Confirmation = load("components/checkout/ReservationConfirmation.tsx", {
    "next/link": ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children),
    "@/lib/booking-time": { formatBookingTime: () => "9:30 PM" },
  }).default;
  const receipt = { id: "booking", venueName: "Test bar", sectionName: "Section A", date: "January 3, 2027", time: "21:30", capacity: 10, additional_bands: 2, customerEmail: "guest@example.test", minimumSpend: 100, deposit: 25, drinkSignText: "Happy birthday", beverages: [] };
  const html = renderToStaticMarkup(React.createElement(Confirmation, { receipt }));
  assert.match(html, /Section summary/);
  assert.match(html, /Section A/);
  assert.match(html, /A confirmation email has been sent/);
  assert.match(html, /management confirms your section/);
  assert.match(html, /href="\/"/);
  assert.doesNotMatch(html, /<form/);
  assert.match(html, /Section capacity/);
  assert.match(html, /2 × \$20 = \$40/);
  assert.match(html, /Up to 12 guests/);
  assert.match(html, /\$65/);
  const CheckoutForm = load("components/checkout/DemoCheckoutForm.tsx", {}).default;
  const form = renderToStaticMarkup(React.createElement(CheckoutForm, {onComplete:async()=>{}}));
  assert.doesNotMatch(form, /Number of guests|name="guests"/);
  const warning = renderToStaticMarkup(React.createElement(Confirmation, { receipt: { ...receipt, emailWarning: "Email delivery failed." } }));
  assert.match(warning, /could not confirm email delivery/);
  assert.doesNotMatch(warning, /A confirmation email has been sent/);
  console.log("PASS: payment recording/idempotency, pending-list authorization/filtering, deadline release, Stripe failure protection, date/slot isolation, and confirmation rendering");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
