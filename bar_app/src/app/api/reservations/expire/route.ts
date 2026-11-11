import { timingSafeEqual } from "node:crypto";
import { adminClient, refreshReservationPayment, sendReservationReleaseEmail } from "@/lib/server/reservation-payments";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = adminClient().schema("sctn-dev");
  const now = new Date().toISOString();
  const due = await Promise.all([
    db.from("reservation_payments").select("booking_id,stripe_session_id,paid_at,payment_deadline,reservation_attempts!inner(status)")
      .eq("reservation_attempts.status", "confirmed").is("paid_at", null).lte("payment_deadline", now).order("payment_deadline").limit(25),
  ]);
  let failures = 0;
  for (const batch of due) {
    if (batch.error) failures++;
    for (const payment of batch.data ?? []) {
      try {
        await refreshReservationPayment(payment);
      } catch {
        failures++;
      }
    }
  }

  const { data: emails, error } = await db.from("reservation_release_emails")
    .select("booking_id").is("sent_at", null).order("queued_at").limit(25);
  if (error) failures++;
  for (const email of emails ?? []) {
    try {
      await sendReservationReleaseEmail(email.booking_id);
    } catch {
      failures++;
    }
  }
  return Response.json({ failures }, { status: failures ? 503 : 200, headers: { "Cache-Control": "no-store" } });
}
