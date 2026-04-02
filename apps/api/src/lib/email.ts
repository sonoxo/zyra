// Email service - stub for development, replace with SendGrid/Resend in production

interface EmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { to, subject, html } = options

  // In development, just log
  if (process.env.NODE_ENV !== 'production') {
    console.log('📧 Email sent:')
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log(`Body: ${html.slice(0, 100)}...`)
    return true
  }

  // In production, use provider
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Zyra <noreply@zyra.host>',
          to,
          subject,
          html,
        }),
      })
      return res.ok
    } catch (error) {
      console.error('Resend error:', error)
      return false
    }
  }

  if (process.env.SENDGRID_API_KEY) {
    // Use SendGrid (implementation similar)
    console.error('SendGrid not implemented yet')
    return false
  }

  console.error('No email provider configured')
  return false
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL || 'https://zyra.host'}/auth/reset?token=${token}`
  
  return sendEmail({
    to,
    subject: 'Reset your Zyra password',
    html: `
      <h1>Password Reset</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link expires in 1 hour.</p>
    `,
  })
}

export async function sendWelcomeEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: 'Welcome to Zyra!',
    html: `
      <h1>Welcome, ${name}!</h1>
      <p>Your Zyra account has been created successfully.</p>
      <p>Get started by adding your first asset and running a security scan.</p>
      <a href="https://zyra.host/dashboard">Go to Dashboard</a>
    `,
  })
}

export async function sendNotificationEmail(to: string, title: string, message: string) {
  return sendEmail({
    to,
    subject: `[Zyra] ${title}`,
    html: `
      <h1>${title}</h1>
      <p>${message}</p>
      <a href="https://zyra.host/dashboard">View in Dashboard</a>
    `,
  })
}
