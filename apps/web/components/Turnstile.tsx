"use client"

import { useEffect, useRef, useState } from "react"

interface TurnstileProps {
  siteKey: string
  onSuccess: (token: string) => void
  theme?: "light" | "dark" | "auto"
}

declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, options: any) => string
      reset: (widgetId?: string) => void
      remove: (widgetId: string) => void
    }
  }
}

export function Turnstile({ siteKey, onSuccess, theme = "dark" }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [widgetId, setWidgetId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load Turnstile script
    const script = document.createElement("script")
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
    script.async = true
    script.defer = true
    document.body.appendChild(script)

    script.onload = () => {
      if (containerRef.current && window.turnstile) {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: onSuccess,
          theme: theme,
          "expired-callback": () => {
            setError("CAPTCHA expired. Please try again.")
          },
          "error-callback": () => {
            setError("CAPTCHA error. Please try again.")
          },
        })
        setWidgetId(id)
      }
    }

    return () => {
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId)
      }
      document.body.removeChild(script)
    }
  }, [siteKey, theme, onSuccess, widgetId])

  if (error) {
    return (
      <div className="text-red-400 text-sm text-center p-2">
        {error}
      </div>
    )
  }

  return <div ref={containerRef} className="turnstile-container" />
}

// Hook to manage Turnstile token
export function useTurnstileToken(siteKey: string) {
  const [token, setToken] = useState<string>("")

  const handleSuccess = (newToken: string) => {
    setToken(newToken)
  }

  return {
    token,
    TurnstileComponent: () => (
      <Turnstile siteKey={siteKey} onSuccess={handleSuccess} />
    ),
    resetToken: () => setToken(""),
  }
}