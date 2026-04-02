import Stripe from "stripe";
import type { Express, Request, Response } from "express";
import { z } from "zod";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

const PRICE_MAP: Record<string, { amount: number; name: string }> = {
  starter: { amount: 0, name: "Zyra Starter" },
  professional: { amount: 9900, name: "Zyra Professional" },
  enterprise: { amount: 49900, name: "Zyra Enterprise" },
};

const PAID_PLANS = ["professional", "enterprise"];

const checkoutSchema = z.object({
  plan: z.enum(["starter", "professional", "enterprise"]),
});

function getStripe(): Stripe | null {
  if (!STRIPE_SECRET_KEY) return null;
  return new Stripe(STRIPE_SECRET_KEY);
}

function getCanonicalBaseUrl(req: Request): string {
  const replitDomain = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (replitDomain) {
    return `https://${replitDomain}`;
  }
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host || "localhost:5000";
  return `${proto}://${host}`;
}

export function isStripeConfigured(): boolean {
  return !!STRIPE_SECRET_KEY;
}

export function isPaidPlan(plan: string): boolean {
  return PAID_PLANS.includes(plan);
}

export function registerStripeRoutes(app: Express, requireAuth: (req: Request, res: Response, next: () => void) => void) {
  app.get("/api/stripe/status", requireAuth, (_req: Request, res: Response) => {
    return res.json({ configured: !!STRIPE_SECRET_KEY });
  });

  app.post("/api/stripe/create-checkout-session", requireAuth, async (req: Request, res: Response) => {
    try {
      const stripe = getStripe();
      if (!stripe) {
        return res.status(503).json({ message: "Stripe is not configured. Add STRIPE_SECRET_KEY to enable payments." });
      }

      const parsed = checkoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid plan. Choose: starter, professional, or enterprise." });
      }

      const { plan } = parsed.data;
      const priceInfo = PRICE_MAP[plan];

      if (priceInfo.amount === 0) {
        return res.status(400).json({ message: "Starter plan is free. No checkout required." });
      }

      const baseUrl = getCanonicalBaseUrl(req);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: priceInfo.name,
                description: `Zyra ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan — monthly subscription`,
              },
              unit_amount: priceInfo.amount,
              recurring: { interval: "month" },
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId: req.session.userId || "",
          orgId: req.session.organizationId || "",
          plan,
        },
        success_url: `${baseUrl}/billing?session_id={CHECKOUT_SESSION_ID}&status=success`,
        cancel_url: `${baseUrl}/billing?status=cancelled`,
      });

      return res.json({ url: session.url });
    } catch (err: any) {
      console.error("Stripe checkout error:", err.message);
      return res.status(500).json({ message: "Failed to create checkout session." });
    }
  });

  app.get("/api/stripe/session/:sessionId", requireAuth, async (req: Request, res: Response) => {
    try {
      const stripe = getStripe();
      if (!stripe) {
        return res.status(503).json({ message: "Stripe is not configured." });
      }

      const sessionId = req.params.sessionId;
      if (!sessionId || !sessionId.startsWith("cs_")) {
        return res.status(400).json({ message: "Invalid session ID format." });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      const requestOrgId = req.session.organizationId || "";
      if (session.metadata?.orgId && session.metadata.orgId !== requestOrgId) {
        return res.status(403).json({ message: "Access denied." });
      }

      return res.json({
        status: session.status,
        paymentStatus: session.payment_status,
        plan: session.metadata?.plan,
      });
    } catch (err: any) {
      console.error("Stripe session retrieval error:", err.message);
      return res.status(500).json({ message: "Failed to retrieve session." });
    }
  });
}
