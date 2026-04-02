import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16'
});
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://zyra.host';
export default async function stripeRoutes(fastify) {
    // POST /api/stripe/create-checkout-session
    fastify.post('/create-checkout-session', async (req, reply) => {
        const { priceId, userId, successUrl, cancelUrl } = req.body;
        try {
            const session = await stripe.checkout.sessions.create({
                mode: 'subscription',
                payment_method_types: ['card'],
                line_items: [{
                        price: priceId,
                        quantity: 1,
                    }],
                success_url: successUrl || `${FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: cancelUrl || `${FRONTEND_URL}/pricing`,
                metadata: { userId }
            });
            return reply.send({ success: true, data: { sessionId: session.id, url: session.url } });
        }
        catch (error) {
            console.error('Stripe error:', error.message);
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
    // POST /api/stripe/create-portal-session
    fastify.post('/create-portal-session', async (req, reply) => {
        const { customerId, returnUrl } = req.body;
        try {
            const session = await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: returnUrl || FRONTEND_URL
            });
            return reply.send({ success: true, data: { url: session.url } });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
    // POST /api/stripe/webhook
    fastify.post('/webhook', async (req, reply) => {
        const sig = req.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
        try {
            const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
            switch (event.type) {
                case 'checkout.session.completed':
                    // Handle successful payment
                    console.log('Payment successful:', event.data.object);
                    break;
                case 'customer.subscription.updated':
                case 'customer.subscription.deleted':
                    // Handle subscription changes
                    console.log('Subscription changed:', event.data.object);
                    break;
            }
            return reply.send({ received: true });
        }
        catch (err) {
            console.error('Webhook error:', err.message);
            return reply.status(400).send({ error: 'Webhook error' });
        }
    });
}
