import Link from "next/link";
import { adminClient, reconcileCheckout } from "@/lib/server/reservation-payments";
import PaymentForm from "./PaymentForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reservation payment", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function PaymentPage({ searchParams }: { searchParams: Promise<{ token?: string; submitted?: string; session_id?: string }> }) {
  const { token, submitted, session_id: sessionId } = await searchParams;
  if (submitted || sessionId) {
    let paid = false;
    try {
      if (sessionId) paid = await reconcileCheckout(sessionId);
    }
    catch { /* Never claim success without server verification and a saved payment. */ }
    return <main className="mx-auto max-w-xl px-6 py-16">
      <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-6">
        <h1 className="text-2xl font-semibold">{paid ? "Payment successful" : "Payment confirmation unavailable"}</h1>
        <p role="status" className="mt-4">{paid ? "Your deposit has been received. Your reservation is confirmed and your section is secured." : "We could not confirm your payment yet. Refresh this page to check again, or contact the venue if Stripe shows a successful payment. Please do not pay again."}</p>
        {!paid && sessionId && <Link href={`/pay?submitted=1&session_id=${encodeURIComponent(sessionId)}`} className="mt-6 inline-block underline">Check payment status again</Link>}
        <Link href="/" className="mt-6 block rounded-md bg-primary px-5 py-3 text-center font-medium text-on-primary hover:bg-accent">Back to home</Link>
      </div>
    </main>;
  }
  let deadline: string | null = null;
  try {
    if (token) {
      const db = adminClient().schema("sctn-dev");
      const { data: payment } = await db.from("reservation_payments").select("booking_id,payment_email_sent_at,payment_deadline,paid_at").eq("token", token).single();
      // This dynamic server page evaluates expiration for each request.
      // eslint-disable-next-line react-hooks/purity
      if (payment?.payment_email_sent_at && !payment.paid_at && Date.parse(payment.payment_deadline) > Date.now()) {
        const { data: booking } = await db.from("reservation_attempts").select("status").eq("id", payment.booking_id).single();
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
