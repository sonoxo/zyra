import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Zyra - AI-Native Cybersecurity',
  description: 'Enterprise-grade AI security platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
