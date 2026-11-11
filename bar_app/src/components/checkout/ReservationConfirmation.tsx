import Link from "next/link";
import { formatBookingTime } from "@/lib/booking-time";

export type ReservationReceipt = {
  id: string;
  venueName: string;
  sectionName: string;
  date: string;
  time: string;
  capacity: number;
  customerEmail: string;
  minimumSpend: number;
  deposit: number;
  drinkSignText: string;
  beverages: { id: string; name: string; quantity: number; price: number }[];
  emailWarning?: string;
};

export default function ReservationConfirmation({ receipt }: { receipt: ReservationReceipt }) {
  return <main className="mx-auto max-w-2xl px-6 py-16">
    <section className="rounded-xl border border-neutral-300 bg-neutral-50 p-6">
      <h1 className="text-3xl font-semibold">Reservation submitted</h1>
      <h2 className="mt-6 text-xl font-semibold">Section summary</h2>
      <dl className="mt-4 space-y-3">
        {[
          ["Venue", receipt.venueName], ["Section", receipt.sectionName],
          ["Date", receipt.date], ["Time", formatBookingTime(receipt.time)],
          ["Section capacity", String(receipt.capacity)], ["Minimum spend", `$${receipt.minimumSpend}`],
          ["Deposit due after approval", `$${receipt.deposit}`],
        ].map(([label, value]) => <div key={label} className="flex justify-between gap-4"><dt className="text-neutral-500">{label}</dt><dd className="text-right">{value}</dd></div>)}
      </dl>
      <div className="mt-5 border-t border-neutral-300 pt-4">
        <p className="text-neutral-500">Pre-ordered drinks</p>
        {receipt.beverages.length ? <ul className="mt-2 space-y-2">{receipt.beverages.map((drink) => <li key={drink.id} className="flex justify-between gap-4"><span>{drink.quantity} × {drink.name}</span><span>${drink.price * drink.quantity}</span></li>)}</ul> : <p className="mt-2">None selected</p>}
        <p className="mt-4 text-neutral-500">Drink sign message</p>
        <p className="mt-2 whitespace-pre-wrap [overflow-wrap:anywhere]">{receipt.drinkSignText || "No custom message"}</p>
      </div>
      <p className="mt-5 break-all text-sm text-neutral-500">Reservation number: {receipt.id}</p>
      <div className="mt-6 border-t border-neutral-300 pt-5">
        {receipt.emailWarning ? <p role="alert">Your reservation was submitted, but we could not confirm email delivery. {receipt.emailWarning}</p> : <p role="status" className="[overflow-wrap:anywhere]">A confirmation email has been sent to {receipt.customerEmail}.</p>}
        <p className="mt-3">If management confirms your section, you will receive a payment link via email to pay your deposit.</p>
        <Link href="/" className="mt-6 block rounded-md bg-primary px-5 py-3 text-center font-medium text-on-primary hover:bg-accent">Back to home</Link>
      </div>
    </section>
  </main>;
}
