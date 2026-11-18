
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";

import ActionButton from "@/components/ui/ActionButton";
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
      <Card padding={6} elevation="low">
        <Heading level={1} className="text-2xl font-semibold">{paid ? "Payment successful" : "Payment confirmation unavailable"}</Heading>
        <Text as="p" type="inherit" color="inherit" role="status" className="mt-4">{paid ? "Your payment has been received. Your reservation is confirmed and your section is secured." : "We could not confirm your payment yet. Refresh this page to check again, or contact the venue if Stripe shows a successful payment. Please do not pay again."}</Text>
        {!paid && sessionId && <Link href={`/pay?submitted=1&session_id=${encodeURIComponent(sessionId)}`} className="mt-6 inline-block underline">Check payment status again</Link>}
        <ActionButton href="/" variant="primary" label="Back to home" className="mt-6 w-full" />
      </Card>
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
  return <main className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-16">
    <Card padding={6} elevation="low">
      <Heading level={1} className="section-heading">Reservation payment</Heading>
      {deadline && token ? <>
        <Text as="p" type="inherit" color="inherit" className="mt-4">Enter the reservation number from your email to pay your deposit and any additional bands.</Text>
        <Text as="p" type="inherit" color="inherit" className="sctn-inset mt-4 px-4 py-3 text-sm">Payment is due by {new Date(deadline).toUTCString()}.</Text>
        <PaymentForm token={token} />
      </> : <Text as="p" type="inherit" color="inherit" className="mt-4 text-neutral-500">This payment link is unavailable, expired, or already paid. Please contact the venue.</Text>}
    </Card>
  </main>;
}
