import { createClient } from "@supabase/supabase-js";
import { adminClient, errorResponse, requiredEnv, sendReservationEmail, sendReservationReleaseEmail } from "@/lib/server/reservation-payments";

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
    // The service-only RPC verifies the authenticated manager's venue assignment
    // and transitions the attempt and its inventory row together under row locks.
    const { error } = await adminClient().schema("sctn-dev").rpc("review_section_reservation", {
      p_id: id, p_status: status, p_manager_id: user.id,
    });
    if (error) throw new Error(error.message || "Reservation could not be reviewed. Refresh and try again.");
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


