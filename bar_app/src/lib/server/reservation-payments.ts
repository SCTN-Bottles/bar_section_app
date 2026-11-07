import "server-only";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

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
  if (approved ? payment.email_sent_at : payment.review_email_sent_at) return;
  const apiKey = requiredEnv("RESEND_API_KEY");
  let deadline = payment.payment_deadline;
  if (approved && !deadline) {
    const started = new Date();
    const { error: updateError } = await db.from("reservation_payments").update({
      email_started_at: started.toISOString(),
      payment_deadline: new Date(started.getTime() + 86400000).toISOString(),
    }).eq("booking_id", id).is("payment_deadline", null);
    if (updateError) throw new Error("Could not prepare payment deadline.");
    const { data } = await db.from("reservation_payments").select("payment_deadline").eq("booking_id", id).single();
    deadline = data?.payment_deadline;
  }
  if (approved && (!deadline || Date.parse(deadline) <= Date.now())) throw new Error("Payment deadline has expired.");
  if (approved && process.env.STRIPE_SECRET_KEY) await prepareCheckout(id);
  const link = approved ? `${siteUrl()}/pay?token=${encodeURIComponent(payment.token)}` : "";
  const text = approved
    ? `Your reservation for ${booking.section_name} on ${booking.reservation_date} has been approved.\nReservation number: ${id}\nPay your deposit within 24 hours, by ${new Date(deadline).toUTCString()}, to secure your section.\nOpen ${link} and enter your reservation number.\nYour section will be released if payment is not received by the deadline.`
    : `Your reservation for ${booking.section_name} on ${booking.reservation_date} has been submitted and is being reviewed.\nReservation number: ${id}\nIf approved, you will receive an email with a private payment link and a 24-hour payment deadline.`;
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
  const { error: saveError } = await db.from("reservation_payments").update(
    approved ? { email_sent_at: new Date().toISOString() } : { review_email_sent_at: new Date().toISOString() },
  ).eq("booking_id", id);
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
  const expires = Math.floor(Date.parse(payment.payment_deadline) / 1000);
  if (expires < Date.now() / 1000 + 1800) throw new Error("The payment window is closing. Please contact the venue.");
  const amount = Math.round(Number(booking.deposit_amount) * 100);
  if (!Number.isSafeInteger(amount) || amount < 50) throw new Error("Please contact the venue to arrange this deposit.");
  const session = await stripe.checkout.sessions.create({
    mode: "payment", allowed_payment_method_types: ["card"], expires_at: expires,
    customer_email: booking.customer_email, client_reference_id: booking.id,
    metadata: { reservation_id: booking.id },
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: amount, product_data: { name: "Section reservation deposit" } } }],
    success_url: `${siteUrl()}/pay?submitted=1`,
    cancel_url: `${siteUrl()}/pay?token=${encodeURIComponent(token)}`,
  }, { idempotencyKey: `reservation-deposit-${booking.id}` });
  const { error } = await db.from("reservation_payments").update({ stripe_session_id: session.id }).eq("booking_id", booking.id);
  if (error) throw new Error("Could not save checkout. Please retry.");
  return session.url;
}
