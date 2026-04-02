'use client'

interface StripeButtonProps {
  priceId: string
  userId?: string
  buttonText?: string
}

export default function StripeButton({ 
  priceId, 
  userId, 
  buttonText = 'Subscribe Now' 
}: StripeButtonProps) {
  const handleCheckout = async () => {
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId })
      })

      const data = await response.json()

      if (data.success && data.data?.url) {
        window.location.href = data.data.url
      } else {
        console.error('Checkout failed:', data.error)
        alert('Checkout failed. Please try again.')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Something went wrong. Please try again.')
    }
  }

  return (
    <button
      onClick={handleCheckout}
      className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg transition"
    >
      {buttonText}
    </button>
  )
}
