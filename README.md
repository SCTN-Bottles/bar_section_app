
## Reservation email and payment setup

Add these server-only settings to `bar_app/.env.local` and the deployment environment:

- `SUPABASE_SERVICE_ROLE_KEY` — Supabase project's private server key.
- `RESEND_API_KEY` — Resend sending API key.
- `RESEND_FROM_EMAIL` — verified sender, or `SCTN <onboarding@resend.dev>` for Resend account-owner testing.
- `APP_URL` — website origin reachable by email recipients. Local testing defaults configured here use `http://localhost:3000`.
- `STRIPE_SECRET_KEY` — Stripe test key while testing.
- `STRIPE_WEBHOOK_SECRET` — signing secret for `/api/stripe/webhook`.

Configure Stripe to deliver `checkout.session.completed` and `checkout.session.expired` events to that webhook. Local testing requires Stripe CLI forwarding or an HTTPS tunnel. Restart Next.js after changing environment variables.

Emails go to the reservation's customer email. Resend's default test sender can deliver only to the Resend account email. Verify a sending domain to deliver to other guests.

Approval emails include a private link and a reservation number. Payment access requires both, approval, and an unexpired deadline. Stripe collects the database deposit amount in USD. Payment links last 24 hours from the first approval email attempt. Retrying delivery preserves that deadline. Existing Checkout sessions can be resumed until the deadline. Creating a new Stripe Checkout session requires at least 30 minutes remaining.

The database expiry job runs every minute for unpaid reservations without a Stripe session. Reservations with a Stripe session are released by the signed Stripe expiration webhook. Successful payment is recorded only after Stripe verification. Configure the webhook before enabling checkout.

Database migrations and SQL tests currently live under the repository's ignored `supabase/` directory. Keep those migration files with your deployment records.

