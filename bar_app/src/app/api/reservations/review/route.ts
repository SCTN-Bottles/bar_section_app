import { createClient } from "@supabase/supabase-js";
import { errorResponse, requiredEnv, sendReservationEmail, sendReservationReleaseEmail } from "@/lib/server/reservation-payments";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const client = createClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
      global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
    });
    const { data: { user } } = await client.auth.getUser(authorization.replace(/^Bearer /, ""));
    if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
    const { id, status } = await request.json();
    if (!["confirmed", "cancelled"].includes(status)) throw new Error("Invalid decision.");
    const { data: booking } = await client.schema("sctn-dev").from("bookings").select("id,status").eq("id", id).eq("record_type", "reservation").single();
    if (!booking) return Response.json({ error: "Reservation unavailable." }, { status: 403 });
    if (booking.status === "pending") {
      const { data, error } = await client.schema("sctn-dev").from("bookings")
        .update({ status }).eq("id", id).eq("status", "pending").select("id");
      if (error || !data?.length) throw new Error("Reservation has already been reviewed. Refresh and try again.");
    } else if (booking.status !== status) {
      throw new Error("Reservation has already been reviewed.");
    }
    if (status === "confirmed") {
      try {
        await sendReservationEmail(id, true);
      } catch (error) {
        return Response.json({ approved: true, warning: error instanceof Error ? error.message : "Email failed. Retry sending the approval email." });
      }
    } else {
      try {
        await sendReservationReleaseEmail(id, "declined");
      } catch {
        return Response.json({ success: true, warning: "Reservation declined. The customer email is queued for retry." });
      }
    }
    return Response.json({ success: true });
  } catch (error) { return errorResponse(error); }
}


