import { createClient } from "@supabase/supabase-js";
import { parseHistoryFilters } from "@/lib/booking-history";
import { adminClient, errorResponse, requiredEnv } from "@/lib/server/reservation-payments";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const client = createClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
      global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
    });
    const { data: { user } } = await client.auth.getUser(authorization.replace(/^Bearer /, ""));
    if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
    const params = new URL(request.url).searchParams;
    const venueId = params.get("venueId");
    if (!venueId) throw new Error("Choose a venue.");
    const filters = parseHistoryFilters(params);
    const db = client.schema("sctn-dev");
    const { data: assignment, error: assignmentError } = await db.from("venue_managers")
      .select("venue_id").eq("user_id", user.id).eq("venue_id", venueId).maybeSingle();
    if (assignmentError || !assignment) return Response.json({ error: "Venue access unavailable." }, { status: 403 });
    const archive = adminClient().schema("sctn-dev");
    // Service-only RPCs are scoped to the venue assignment verified above.
    const { error: archiveError } = await archive.rpc("archive_past_bookings", { p_venue_id: venueId });
    if (archiveError) throw new Error("Could not update booking history. Please retry.");
    function queryPage(page: number) {
      const query = archive.rpc("get_booking_history", {
        p_venue_id: venueId, p_year: filters.year, p_month: filters.month,
      }, { count: "exact" });
      return query.order("reservation_date", { ascending: false }).order("reservation_time", { ascending: false })
        .order("booking_id", { ascending: false }).range((page - 1) * 10, page * 10 - 1);
    }
    const [initial, years] = await Promise.all([
      queryPage(filters.page), archive.rpc("get_booking_history_years", { p_venue_id: venueId }),
    ]);
    if (initial.error || years.error) throw new Error("Could not load booking history. Please retry.");
    const total = initial.count ?? 0;
    const page = Math.min(filters.page, Math.max(1, Math.ceil(total / 10)));
    const result = page === filters.page ? initial : await queryPage(page);
    if (result.error) throw new Error("Could not load booking history. Please retry.");
    return Response.json({ reservations: result.data ?? [], total, page, years: (years.data ?? []).map((row: { year: number }) => row.year) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
