import { adminClient, reconcileCheckout, refreshReservationPayment, requiredEnv, stripeClient } from "@/lib/server/reservation-payments";

export async function POST(request: Request) {
  const stripe = stripeClient();
  let event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), request.headers.get("stripe-signature") || "", requiredEnv("STRIPE_WEBHOOK_SECRET"));
  } catch { return new Response("Invalid webhook signature", { status: 400 }); }
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded" && event.type !== "checkout.session.expired") return Response.json({ received: true });
  const session = await stripe.checkout.sessions.retrieve(event.data.object.id);
  const id = session.metadata?.reservation_id;
  if (!id) return Response.json({ received: true });
  const db = adminClient().schema("sctn-dev");
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    try { await reconcileCheckout(session.id); }
    catch { return new Response("Retry payment verification", { status: 500 }); }
  }
  if (event.type === "checkout.session.expired") {
    const { data: payment, error } = await db.from("reservation_payments").select("booking_id,stripe_session_id,paid_at,payment_deadline").eq("booking_id", id).single();
    if (error || !payment) return new Response("Retry expiration", { status: 500 });
    if (payment.stripe_session_id !== session.id) return new Response("Payment mismatch", { status: 400 });
    try { await refreshReservationPayment(payment); }
    catch { return new Response("Retry expiration", { status: 500 }); }
  }
  return Response.json({ received: true });
}
