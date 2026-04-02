import { NextResponse } from 'next/server'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://zyra.host'

export async function POST(req: Request) {
  try {
    const { priceId, userId } = await req.json()
    
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'subscription',
        'payment_method_types[]': 'card',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'success_url': `${FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': `${FRONTEND_URL}/pricing`,
        'metadata[userId]': userId || '',
      }),
    })

    const session = await response.json()

    if (session.error) {
      return NextResponse.json({ success: false, error: session.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: { url: session.url } })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
