"use client"

import { ReactNode } from "react"
import { AuthProvider } from "../context/AuthContext"
import { HelpProvider } from "@/lib/help"
import { OnboardingTour } from "@/components/OnboardingTour"
import { ChatWidget } from "@/components/ChatWidget"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <HelpProvider>
        {children}
        <OnboardingTour />
        <ChatWidget />
      </HelpProvider>
    </AuthProvider>
  )
}
