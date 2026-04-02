import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_demo', {
    apiVersion: '2023-10-16'
});
const PLANS = {
    FREE: { name: 'Free', price: 0 },
    PRO: { name: 'Pro', price: 9900, priceId: 'price_pro' },
    ENTERPRISE: { name: 'Enterprise', price: 39900, priceId: 'price_enterprise' }
};
const payments = [];
export default async function paymentRoutes(fastify) {
    // GET /api/payments/plans
    fastify.get('/plans', async (req, reply) => {
        return reply.send({ success: true, data: PLANS });
    });
    // POST /api/payments/create-checkout-session
    fastify.post('/create-checkout-session', async (req, reply) => {
        const { userId, plan } = req.body;
        const planInfo = PLANS[plan];
        if (!planInfo || planInfo.price === 0) {
            return reply.status(400).send({ success: false, error: 'Invalid plan' });
        }
        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                        price_data: {
                            currency: 'usd',
                            product_data: { name: `Zyra ${planInfo.name}` },
                            unit_amount: planInfo.price,
                        },
                        quantity: 1,
                    }],
                mode: 'payment',
                success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL}/pricing`,
                metadata: { userId, plan }
            });
            return reply.send({ success: true, data: { sessionId: session.id, url: session.url } });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: 'Failed to create checkout session' });
        }
    });
    // POST /api/payments/webhook
    fastify.post('/webhook', {
        config: {
            rawBody: true
        }
    }, async (req, reply) => {
        const sig = req.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
        // Verify webhook (skip for demo)
        try {
            const event = req.body;
            if (event.type === 'checkout.session.completed') {
                const session = event.data.object;
                const { userId, plan } = session.metadata || {};
                // Create payment record
                const payment = {
                    id: `pay_${Date.now()}`,
                    userId,
                    stripePaymentId: session.payment_intent,
                    amount: session.amount_total,
                    currency: session.currency,
                    status: 'COMPLETED',
                    description: `Zyra ${plan} plan`,
                    createdAt: new Date()
                };
                payments.push(payment);
            }
            return reply.send({ received: true });
        }
        catch (error) {
            return reply.status(400).send({ error: 'Webhook error' });
        }
    });
    // GET /api/payments/user/:userId
    fastify.get('/user/:userId', async (req, reply) => {
        const { userId } = req.params;
        const userPayments = payments.filter(p => p.userId === userId);
        return reply.send({ success: true, data: userPayments });
    });
    // POST /api/payments/create-customer
    fastify.post('/create-customer', async (req, reply) => {
        const { userId, email, name } = req.body;
        try {
            const customer = await stripe.customers.create({
                email,
                name,
                metadata: { userId }
            });
            return reply.send({ success: true, data: { customerId: customer.id } });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: 'Failed to create customer' });
        }
    });
}
