import { adminClient } from "@/lib/server/reservation-payments";
import PaymentForm from "./PaymentForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reservation payment", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function PaymentPage({ searchParams }: { searchParams: Promise<{ token?: string; submitted?: string }> }) {
  const { token, submitted } = await searchParams;
  if (submitted) return <main className="mx-auto max-w-xl px-6 py-16"><h1 className="text-2xl font-semibold">Checkout submitted</h1><p className="mt-4">Your payment is being verified with Stripe.</p></main>;
  let deadline: string | null = null;
  try {
    if (token) {
      const db = adminClient().schema("sctn-dev");
      const { data: payment } = await db.from("reservation_payments").select("booking_id,email_sent_at,payment_deadline,paid_at").eq("token", token).single();
      // This dynamic server page evaluates expiration for each request.
      // eslint-disable-next-line react-hooks/purity
      if (payment?.email_sent_at && !payment.paid_at && Date.parse(payment.payment_deadline) > Date.now()) {
        const { data: booking } = await db.from("bookings").select("status").eq("id", payment.booking_id).single();
        if (booking?.status === "confirmed") deadline = payment.payment_deadline;
      }
    }
  } catch { /* Show a neutral unavailable state without exposing server configuration. */ }
  return <main className="mx-auto max-w-xl px-6 py-16">
    <h1 className="text-2xl font-semibold">Reservation payment</h1>
    {deadline && token ? <>
      <p className="mt-4">Enter the reservation number from your email to pay your deposit.</p>
      <p className="mt-2">Payment is due by {new Date(deadline).toUTCString()}.</p>
      <PaymentForm token={token} />
    </> : <p className="mt-4">This payment link is unavailable, expired, or already paid. Please contact the venue.</p>}
  </main>;
}
