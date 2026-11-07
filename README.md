
## Reservation email and payment setup

Add these server-only settings to `bar_app/.env.local` and the deployment environment:

- `SUPABASE_SERVICE_ROLE_KEY` — Supabase project's private server key.
- `RESEND_API_KEY` — Resend sending API key.
- `RESEND_FROM_EMAIL` — verified sender, or `SCTN <onboarding@resend.dev>` for Resend account-owner testing.
- `APP_URL` — website origin reachable by email recipients. Local testing defaults configured here use `http://localhost:3000`.
- `STRIPE_SECRET_KEY` — Stripe test key while testing.
- `STRIPE_WEBHOOK_SECRET` — signing secret for `/api/stripe/webhook`.

Configure Stripe to deliver `checkout.session.completed` and `checkout.session.expired` events to that webhook. Local testing requires Stripe CLI forwarding or an HTTPS tunnel. Restart Next.js after changing environment variables.

`confirmation_email_sent_at` tracks the initial submission acknowledgement. `payment_email_sent_at` tracks the approval email containing the payment link. These timestamps mean the email provider accepted the send request, not that the guest opened or received the email. `email_started_at` records the first approval-email preparation attempt; `payment_deadline` is set to 24 hours after that attempt. Both are stored before sending so delivery retries preserve the original payment window. This means the deadline currently starts before successful email delivery, and `email_started_at` is an audit timestamp rather than a delivery timestamp.

The vendor Pending reservations tab includes requests awaiting review and approved reservations awaiting payment. It refreshes every 15 seconds and on window focus. Paid reservations are hidden after Stripe verification saves `reservation_payments.paid_at`; booking and payment records are retained. Expired unpaid reservations are cancelled and their date/slot hold is released. The vendor refresh also reconciles missed Stripe events, closing any open expired checkout before releasing the section. If Stripe cannot be checked, the reservation stays visible and held until a successful retry. Denied requests release their hold immediately. Public section maps refresh every 30 seconds and on focus to show released availability.

Emails go to the reservation's customer email. Resend's default test sender can deliver only to the Resend account email. Verify a sending domain to deliver to other guests.

Approval emails include a private link and a reservation number. Payment access requires both, approval, and an unexpired deadline. Stripe collects the database deposit amount in USD. Payment links last 24 hours from the first approval email attempt. Retrying delivery preserves that deadline. Existing Checkout sessions can be resumed until the deadline. Creating a new Stripe Checkout session requires at least 30 minutes remaining.

The database expiry job runs every minute for unpaid reservations without a Stripe session. Reservations with a Stripe session are released by the signed Stripe expiration webhook. Successful payment is recorded only after Stripe verification. Configure the webhook before enabling checkout.

Database migrations and SQL tests currently live under the repository's ignored `supabase/` directory. Keep those migration files with your deployment records.

