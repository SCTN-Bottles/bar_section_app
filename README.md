
## Reservation email and payment setup

Add these server-only settings to `bar_app/.env.local` and the deployment environment:

- `SUPABASE_SERVICE_ROLE_KEY` — Supabase project's private server key.
- `RESEND_API_KEY` — Resend sending API key.
- `RESEND_FROM_EMAIL` — verified sender, or `SCTN <onboarding@resend.dev>` for Resend account-owner testing.
- `APP_URL` — website origin reachable by email recipients. Local testing defaults configured here use `http://localhost:3000`.
- `STRIPE_SECRET_KEY` — Stripe test key while testing.
- `STRIPE_WEBHOOK_SECRET` — signing secret for `/api/stripe/webhook`.
- `CRON_SECRET` — a private random value for the reservation expiry and email retry endpoint.

Configure Stripe to deliver `checkout.session.completed` and `checkout.session.expired` events to that webhook. Local testing requires Stripe CLI forwarding or an HTTPS tunnel. Restart Next.js after changing environment variables.

`confirmation_email_sent_at` tracks the initial submission acknowledgement. `payment_email_sent_at` tracks the approval email containing the payment link. `paid_confirmation_email_sent_at` tracks the final confirmation sent after a verified deposit payment. These timestamps record acceptance by the email provider. `email_started_at` records the first approval-email preparation attempt. `payment_deadline` is set when the approval flow starts preparing checkout, and email retries preserve it.

After Stripe verifies a payment, the server records it before sending the final confirmation. The email includes venue/section, reservation number, date/time, guest count, paid deposit, and the venue address when available. Band pickup and entry text is hard-coded in `sendPaidReservationEmail` for now; it directs guests to contact venue management until exact instructions are supplied. No arrival-instructions editor or additional venue fields are added. Webhook retries repeat failed delivery with a stable Resend idempotency key; tracked successful emails are not resent. An email failure does not change the payment success shown on the return page. Do not run live email delivery tests without an intended recipient.

The vendor Pending reservations tab includes requests awaiting review and approved reservations awaiting payment. It refreshes every 15 seconds and on window focus. Paid reservations are hidden after Stripe verification saves `reservation_payments.paid_at`; booking and payment records are retained. Expired unpaid reservations are cancelled and their date/slot hold is released. The vendor refresh also reconciles missed Stripe events, closing any open expired checkout before releasing the section. If Stripe cannot be checked, the reservation stays visible and held until a successful retry. Denied requests release their hold immediately. Public section maps refresh every 30 seconds and on focus to show released availability.

Emails go to the reservation's customer email. Resend's default test sender can deliver only to the Resend account email. Verify a sending domain to deliver to other guests.

Approval emails include a private link and a reservation number. Payment access requires both, approval, and an unexpired deadline. Approval creates and saves the Stripe Checkout session before sending the email. The payment link and Stripe session share the same one-hour deadline, even when the guest never opens the link. A payment Stripe already accepted is reconciled before releasing the section. Links emailed before this change keep their original deadlines and checkout behavior.

The database expiry job runs every minute for unpaid reservations without a Stripe session. The signed Stripe expiration webhook also releases expired sessions. Both expiration and vendor decline queue a customer email in the same transaction as cancellation. The section map refreshes on the release event and respects any manual sold setting or other active hold.

For backup reconciliation and email delivery, schedule a request every minute to `GET /api/reservations/expire` on the running app with `Authorization: Bearer <CRON_SECRET>`. The worker closes overdue sessions for older links and retries queued emails with the same Resend idempotency key. The decline route and Stripe webhook attempt immediate delivery.

`sctn-dev.logs_bookings` has exactly the same columns, types, defaults and checks as `bookings`, with the original booking ID. Every past booking is moved, including schedules, available sections, denials and unpaid requests. `bookings` retains today's and future dates, using `America/Chicago` as the date boundary. Section definitions remain in `sections` so venue access and section relationships are preserved.

`archive_past_bookings(venue_id)` copies bookings and their reservation payment tracking records to `logs_bookings` and `logs_reservation_payments`, then removes the live copies in the same transaction. Selected beverages are stored in the booking's `beverages` field and archived with the booking. Verified Stripe payments record `amount_paid_at_checkout` alongside `paid_at`. The archive function locks booking/payment rows to coordinate with payment verification. A database cron job calls it every five minutes; opening history also refreshes the venue archive. Repeated runs do not duplicate records. Payment webhooks and email tracking can find archived records, including payments completing after a date rolls over.

The vendor history page reads past paid reservations and manually sold sections from the logs through a venue-scoped, server-only history RPC. Unpaid/denied requests and available sections are retained in the logs but excluded from that sold-history view. A paid reservation takes precedence over a sold schedule for the same section/date/slot. Vendor reads of raw booking logs are restricted to their assigned venue; archived payment tokens remain server-only. Month/year filters and pagination run in the database.

The booking-history migration and rollback SQL tests are tracked under `supabase/`. Older migrations and other local Supabase files remain ignored; keep those older migration files with your deployment records.

