import { adminClient, errorResponse, requiredEnv, prepareCheckout } from "@/lib/server/reservation-payments";

export async function POST(request: Request) {
  try {
    requiredEnv("STRIPE_WEBHOOK_SECRET");
    const { token, reservationNumber } = await request.json();
    if (typeof token !== "string" || typeof reservationNumber !== "string") throw new Error("Enter your reservation number.");
    const db = adminClient().schema("sctn-dev");
    const { data: payment } = await db.from("reservation_payments").select("*").eq("token", token).eq("booking_id", reservationNumber.trim()).single();
    if (!payment || !payment.payment_email_sent_at || !payment.payment_deadline) throw new Error("Invalid payment link or reservation number.");
    const { data: booking } = await db.from("reservation_attempts").select("*").eq("id", payment.booking_id).single();
    if (!booking || booking.status !== "confirmed" || payment.paid_at) throw new Error("This reservation is unavailable or already paid.");
    if (Date.parse(payment.payment_deadline) <= Date.now()) throw new Error("This payment link has expired.");
    return Response.json({ url: await prepareCheckout(booking.id) });
  } catch (error) { return errorResponse(error); }
}


