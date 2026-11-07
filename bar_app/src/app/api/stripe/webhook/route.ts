import { adminClient, requiredEnv, stripeClient } from "@/lib/server/reservation-payments";

export async function POST(request: Request) {
  const stripe = stripeClient();
  let event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), request.headers.get("stripe-signature") || "", requiredEnv("STRIPE_WEBHOOK_SECRET"));
  } catch { return new Response("Invalid webhook signature", { status: 400 }); }
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.expired") return Response.json({ received: true });
  const session = await stripe.checkout.sessions.retrieve(event.data.object.id);
  const id = session.metadata?.reservation_id;
  if (!id) return Response.json({ received: true });
  const db = adminClient().schema("sctn-dev");
  if (event.type === "checkout.session.completed" && session.payment_status === "paid") {
    const { data: booking } = await db.from("bookings").select("deposit_amount").eq("id", id).single();
    if (!booking || session.currency !== "usd" || session.amount_total !== Math.round(Number(booking.deposit_amount) * 100)) return new Response("Payment mismatch", { status: 400 });
    const { error } = await db.from("reservation_payments").update({ paid_at: new Date().toISOString(), stripe_session_id: session.id }).eq("booking_id", id);
    if (error) return new Response("Retry payment update", { status: 500 });
  }
  if (event.type === "checkout.session.expired") {
    const { data: payment, error } = await db.from("reservation_payments").select("paid_at,payment_deadline").eq("booking_id", id).single();
    if (error) return new Response("Retry expiration", { status: 500 });
    if (!payment.paid_at && Date.parse(payment.payment_deadline) <= Date.now()) {
      const { error: updateError } = await db.from("bookings").update({ status: "cancelled" }).eq("id", id).eq("status", "confirmed");
      if (updateError) return new Response("Retry expiration", { status: 500 });
    }
  }
  return Response.json({ received: true });
}
