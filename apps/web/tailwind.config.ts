import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Zyra Dark Theme
        background: '#0a0a0f',
        surface: '#12121a',
        surfaceElevated: '#1a1a24',
        border: '#2a2a3a',
        
        // Neon Accents
        primary: '#06b6d4',      // Cyan
        primaryGlow: '#22d3ee',
        secondary: '#a855f7',    // Purple  
        secondaryGlow: '#c084fc',
        
        // Risk Colors
        riskCritical: '#ef4444',
        riskHigh: '#f97316',
        riskMedium: '#eab308',
        riskLow: '#22c55e',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(6, 182, 212, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(6, 182, 212, 0.6)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },
    },
  },
  plugins: [],
}

export default config