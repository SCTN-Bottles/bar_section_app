import "server-only";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { formatBookingTime } from "@/lib/booking-time";

export function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Server configuration requires ${name}.`);
  return value;
}

export function adminClient() {
  return createClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function stripeClient() {
  return new Stripe(requiredEnv("STRIPE_SECRET_KEY"));
}

export function siteUrl() {
  return new URL(requiredEnv("APP_URL")).origin;
}

export async function sendReservationEmail(id: string, approved: boolean) {
  const db = adminClient().schema("sctn-dev");
  const { data: booking, error } = await db.from("bookings").select("*").eq("id", id).eq("record_type", "reservation").single();
  if (error || !booking) throw new Error("Reservation not found.");
  if (approved && booking.status !== "confirmed") throw new Error("Reservation must be approved first.");
  const { data: payment, error: paymentError } = await db.from("reservation_payments").select("*").eq("booking_id", id).single();
  if (paymentError || !payment) throw new Error("Email record not found.");
  if (approved ? payment.payment_email_sent_at : payment.confirmation_email_sent_at) return;
  const apiKey = requiredEnv("RESEND_API_KEY");
  if (approved && !payment.payment_deadline) {
    const started = new Date();
    const { error: updateError } = await db.from("reservation_payments").update({
      email_started_at: payment.email_started_at ?? started.toISOString(),
      payment_deadline: new Date(Math.floor(started.getTime() / 1000) * 1000 + 60 * 60_000).toISOString(),
    }).eq("booking_id", id).is("payment_deadline", null);
    if (updateError) throw new Error("Could not prepare approval email.");
  }
  if (approved) await prepareCheckout(id);
  const link = approved ? `${siteUrl()}/pay?token=${encodeURIComponent(payment.token)}` : "";
  const text = approved
    ? `Your reservation for ${booking.section_name} on ${booking.reservation_date} has been approved.\nReservation number: ${id}\nYou have 1 hour from approval to pay your deposit and secure your section.\nOpen ${link} and enter your reservation number to view your deadline and pay.\nYour section will be released if payment is not received by the deadline.`
    : `Your reservation for ${booking.section_name} on ${booking.reservation_date} has been submitted and is being reviewed.\nReservation number: ${id}\nIf approved, you will receive an email with a private payment link and one hour to pay.`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `reservation-${id}-${approved ? "approved" : "review"}` },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "SCTN <onboarding@resend.dev>",
      to: [booking.customer_email],
      subject: approved ? "Your reservation is approved — payment required" : "Your reservation is being reviewed",
      text,
    }),
  });
  if (!response.ok) throw new Error("Email delivery failed. Check the sender domain and recipient permissions in Resend.");
  const sentAt = new Date();
  const { error: saveError } = await db.from("reservation_payments").update(
    approved ? { payment_email_sent_at: sentAt.toISOString() } : { confirmation_email_sent_at: sentAt.toISOString() },
  ).eq("booking_id", id).is(approved ? "payment_email_sent_at" : "confirmation_email_sent_at", null);
  if (saveError) throw new Error("Email sent, but delivery tracking failed. Retry safely.");
}

export function errorResponse(error: unknown) {
  return Response.json({ error: error instanceof Error ? error.message : "Request failed." }, { status: 400 });
}

export async function prepareCheckout(id: string) {
  requiredEnv("STRIPE_WEBHOOK_SECRET");
  const db = adminClient().schema("sctn-dev");
  const { data: payment } = await db.from("reservation_payments").select("*").eq("booking_id", id).single();
  const { data: booking } = await db.from("bookings").select("*").eq("id", id).single();
  if (!payment || !booking || booking.status !== "confirmed" || payment.paid_at) throw new Error("Reservation is unavailable.");
  if (!payment.payment_deadline || Date.parse(payment.payment_deadline) <= Date.now()) throw new Error("Payment deadline has expired.");
  const token = payment.token;
  const stripe = stripeClient();
  if (payment.stripe_session_id) {
    const session = await stripe.checkout.sessions.retrieve(payment.stripe_session_id);
    if (session.status !== "open" || !session.url) throw new Error("This checkout is completed or expired.");
    return session.url;
  }
  const expires = Math.ceil(Date.parse(payment.payment_deadline) / 1000);
  // Only previously emailed links can still need a Checkout session late in their window.
  const stripeExpires = payment.payment_email_sent_at
    ? Math.max(expires, Math.ceil(Date.now() / 1000) + 1805)
    : expires;
  const amount = Math.round(Number(booking.deposit_amount) * 100);
  if (!Number.isSafeInteger(amount) || amount < 50) throw new Error("Please contact the venue to arrange this deposit.");
  const session = await stripe.checkout.sessions.create({
    mode: "payment", allowed_payment_method_types: ["card"], expires_at: stripeExpires,
    customer_email: booking.customer_email, client_reference_id: booking.id,
    metadata: { reservation_id: booking.id },
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: amount, product_data: { name: "Section reservation deposit" } } }],
    success_url: `${siteUrl()}/pay?submitted=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/pay?token=${encodeURIComponent(token)}`,
  }, { idempotencyKey: `reservation-deposit-${booking.id}` });
  const { data: saved, error } = await db.from("reservation_payments").update({ stripe_session_id: session.id })
    .eq("booking_id", booking.id).gt("payment_deadline", new Date().toISOString()).select("booking_id").maybeSingle();
  if (error) throw new Error("Could not save checkout. Please retry.");
  if (!saved) {
    await stripe.checkout.sessions.expire(session.id);
    throw new Error("Payment deadline has expired.");
  }
  return session.url;
}

// Both the signed webhook and the return page reconcile the same verified session.
// Conditional writes make concurrent deliveries and page refreshes safe.
export async function reconcileCheckout(sessionId: string, requireConfirmationEmail = false) {
  const session = await stripeClient().checkout.sessions.retrieve(sessionId);
  const id = session.metadata?.reservation_id;
  if (!id) throw new Error("Reservation payment not found.");
  const db = adminClient().schema("sctn-dev");
  if (session.payment_status !== "paid") return false;
  const { error } = await db.rpc("record_verified_reservation_payment", {
    p_id: id, p_session_id: session.id, p_amount: session.amount_total, p_currency: session.currency,
  });
  if (error) throw new Error(error.message || "Could not record payment. Please retry.");
  try {
    await sendPaidReservationEmail(id);
  } catch (error) {
    // The webhook retries delivery. The return page must still acknowledge a saved payment.
    if (requireConfirmationEmail) throw error;
  }
  return true;
}

export async function getReservationPaymentContext(id: string) {
  const db = adminClient().schema("sctn-dev");
  for (const [bookingsTable, paymentsTable] of [["bookings", "reservation_payments"], ["logs_bookings", "logs_reservation_payments"]]) {
    const { data: booking, error } = await db.from(bookingsTable).select("*").eq("id", id).eq("record_type", "reservation").maybeSingle();
    if (error) throw new Error("Could not load reservation.");
    if (!booking) continue;
    const { data: payment, error: paymentError } = await db.from(paymentsTable).select("*").eq("booking_id", id).maybeSingle();
    if (paymentError) throw new Error("Could not load payment.");
    // Archiving can commit between the two reads. Try the archived pair in that case.
    if (!payment) continue;
    return { booking, payment };
  }
  throw new Error("Reservation payment not found.");
}

export async function sendPaidReservationEmail(id: string) {
  const { booking, payment } = await getReservationPaymentContext(id);
  if (!payment.paid_at) throw new Error("Payment must be verified before sending confirmation.");
  if (payment.paid_confirmation_email_sent_at) return;
  const db = adminClient().schema("sctn-dev");
  const { data: section, error: sectionError } = await db.from("sections").select("venue_id").eq("id", booking.section_id).single();
  if (sectionError || !section) throw new Error("Could not load venue for confirmation.");
  const { data: venue, error: venueError } = await db.from("venues")
    .select("name,address,city,state")
    .eq("id", section.venue_id).single();
  if (venueError || !venue) throw new Error("Could not load venue confirmation details.");
  const text = [
    `Your payment has been received and your section reservation at ${venue.name} is confirmed.`,
    `Reservation number: ${id}`,
    `Section: ${booking.section_name || "Reserved section"}`,
    `Date: ${booking.reservation_date}`,
    `Time: ${formatBookingTime(booking.reservation_time)} (${booking.booking_slot})`,
    `Guests: ${booking.guest_count}`,
    `Deposit paid: $${Number(payment.amount_paid_at_checkout ?? booking.deposit_amount).toFixed(2)}`,
    venue.address ? `Venue address: ${[venue.address, venue.city, venue.state].filter(Boolean).join(", ")}` : "",
    "",
    "Band pickup",
    "Please contact venue management for band pickup instructions.",
    "",
    "Where to enter",
    "Please contact venue management for entry instructions.",
    "",
    "Keep this confirmation and your reservation number for check-in.",
  ].join("\n");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${requiredEnv("RESEND_API_KEY")}`, "Content-Type": "application/json", "Idempotency-Key": `reservation-${id}-paid` },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "SCTN <onboarding@resend.dev>",
      to: [booking.customer_email], subject: "Payment received — your section is confirmed", text,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Payment received, but confirmation email delivery failed. Delivery will be retried.");
  const sentAt = new Date().toISOString();
  // Update both locations to tolerate a concurrent archive move without losing delivery tracking.
  for (const table of ["reservation_payments", "logs_reservation_payments"]) {
    const { error } = await db.from(table).update({ paid_confirmation_email_sent_at: sentAt })
      .eq("booking_id", id).is("paid_confirmation_email_sent_at", null);
    if (error) throw new Error("Confirmation sent, but tracking failed. Retry safely.");
  }
}

export type ReservationPaymentState = {
  booking_id: string;
  stripe_session_id: string | null;
  paid_at: string | null;
  payment_deadline: string | null;
};

export async function sendReservationReleaseEmail(id: string, reason?: "declined" | "expired") {
  const db = adminClient().schema("sctn-dev");
  let query = db.from("reservation_release_emails")
    .select("reason,recipient,section_name,reservation_date")
    .eq("booking_id", id).is("sent_at", null);
  if (reason) query = query.eq("reason", reason);
  const { data: email, error } = await query.maybeSingle();
  if (error) throw new Error("Could not load reservation release email.");
  if (!email) return;

  const expired = email.reason === "expired";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requiredEnv("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `reservation-${id}-${email.reason}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "SCTN <onboarding@resend.dev>",
      to: [email.recipient],
      subject: expired ? "Your section payment link expired" : "Your section reservation was declined",
      text: [
        expired
          ? `The payment deadline for ${email.section_name} on ${email.reservation_date} passed before payment was received.`
          : `The venue declined your request for ${email.section_name} on ${email.reservation_date}.`,
        "Your reservation has been released. You can browse available sections and submit a new request.",
        `Reservation number: ${id}`,
      ].join("\n\n"),
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Could not send reservation release email.");
  const { error: saveError } = await db.from("reservation_release_emails")
    .update({ sent_at: new Date().toISOString() }).eq("booking_id", id).is("sent_at", null);
  if (saveError) throw new Error("Could not record reservation release email.");
}

export async function refreshReservationPayment(payment: ReservationPaymentState): Promise<"paid" | "expired" | "unpaid"> {
  if (payment.paid_at) return "paid";
  const expired = Boolean(payment.payment_deadline && Date.parse(payment.payment_deadline) <= Date.now());
  if (payment.stripe_session_id) {
    const stripe = stripeClient();
    let session = await stripe.checkout.sessions.retrieve(payment.stripe_session_id);
    if (session.metadata?.reservation_id !== payment.booking_id) throw new Error("Payment mismatch.");
    if (session.payment_status === "paid") {
      await reconcileCheckout(session.id);
      return "paid";
    }
    if (!expired) return "unpaid";
    // Close checkout before releasing inventory, so a guest cannot still pay for it.
    // If payment wins the race, Stripe refuses expiration and a later refresh reconciles it.
    if (session.status === "open") session = await stripe.checkout.sessions.expire(session.id);
    if (session.status !== "expired" || session.payment_status === "paid") return "unpaid";
  }
  if (!expired) return "unpaid";
  const db = adminClient().schema("sctn-dev");
  const { data: released, error } = await db.rpc("release_expired_reservation", {
    p_id: payment.booking_id,
    p_session_id: payment.stripe_session_id,
  });
  if (error) throw new Error("Could not release expired reservation.");
  return released ? "expired" : "unpaid";
}
