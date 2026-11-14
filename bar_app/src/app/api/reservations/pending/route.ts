import { createClient } from "@supabase/supabase-js";
import { adminClient, errorResponse, refreshReservationPayment, requiredEnv, sendReservationReleaseEmail } from "@/lib/server/reservation-payments";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const client = createClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
      global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
    });
    const { data: { user } } = await client.auth.getUser(authorization.replace(/^Bearer /, ""));
    if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
    const venueId = new URL(request.url).searchParams.get("venueId");
    if (!venueId) throw new Error("Choose a venue.");
    const db = client.schema("sctn-dev");
    const { data: assignment, error: assignmentError } = await db.from("venue_managers")
      .select("venue_id").eq("user_id", user.id).eq("venue_id", venueId).maybeSingle();
    if (assignmentError || !assignment) return Response.json({ error: "Venue access unavailable." }, { status: 403 });
    // Read bookings under the vendor's RLS. Payment tokens remain server-only.
    const { data: bookings, error } = await db.from("reservation_attempts")
      .select("id,customer_name,customer_email,section_name,reservation_date,reservation_time,booking_slot,section_capacity,additional_bands,deposit_amount,minimum_spend_amount,drink_sign_text,status,beverages,sections!inner(venue_id)")
      .eq("sections.venue_id", venueId).eq("record_type", "reservation")
      .in("status", ["pending", "confirmed"]).order("created_at");
    if (error) throw new Error("Could not load reservations.");
    if (!bookings?.length) return Response.json({ requests: [] }, { headers: { "Cache-Control": "no-store" } });
    const { data: payments, error: paymentError } = await adminClient().schema("sctn-dev").from("reservation_payments")
      .select("booking_id,stripe_session_id,paid_at,payment_deadline").in("booking_id", bookings.map((booking) => booking.id));
    if (paymentError) throw new Error("Could not load payment status.");
    const byBooking = new Map((payments ?? []).map((payment) => [payment.booking_id, payment]));
    let warning = false;
    const visible = await Promise.all(bookings.map(async (booking) => {
      const payment = byBooking.get(booking.id);
      if (payment?.paid_at) return null;
      if (booking.status === "confirmed" && payment) {
        try {
          const state = await refreshReservationPayment(payment);
          if (state === "expired") {
            await sendReservationReleaseEmail(booking.id, "expired").catch(() => undefined);
          }
          if (state === "paid" || state === "expired") return null;
        } catch {
          // Keep the reservation visible and held while Stripe cannot be checked.
          warning = true;
        }
      }
      return { ...booking, payment_deadline: payment?.payment_deadline ?? null };
    }));
    return Response.json({ requests: visible.filter(Boolean), warning: warning ? "Some payment statuses could not be checked. These reservations are still held; we will retry shortly." : undefined }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
