# Zyra CL1 no-billing policy

The CL1 branch disables Stripe checkout/session requests and Resend outbound mail at runtime. The app must not report that an email was delivered when delivery did not occur. Existing subscriptions and user data are **not** altered or canceled. Password-reset, invitation and account verification email flows require a self-hosted mail solution and end-to-end tests before production migration.

## Mac local PostgreSQL + app

The repository already has a local PostgreSQL development script:

```bash
npm run dev:local
```

This uses Homebrew to install/start local PostgreSQL when absent, applies Drizzle schema, then starts the dev server. It is for development only; back up existing data and review its local database credential and network binding before production use. Node packages and PostgreSQL are open-source software. Mac hardware, storage, internet and electricity are not free.

Do not configure `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY` or `RESEND_API_KEY`. Do not assume that removing env keys cancels existing Stripe subscriptions, Replit deployments or other accounts. Disable paid services in their provider billing consoles **after** verifying replacement services.

Outstanding: audit Replit/cloud deployment workflows, replace actual email delivery with a self-hosted system, verify all auth flows, review hosted model dependencies and perform a backed-up data migration if a managed database is in use. No production DNS/deployment has been changed by this PR.
