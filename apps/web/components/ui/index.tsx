'use client'

import { ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  glow?: boolean
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  glow = false,
  className = '',
  ...props 
}: ButtonProps) {
  const baseStyles = `
    inline-flex items-center justify-center font-semibold rounded-xl 
    transition-all duration-200 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background
    disabled:opacity-50 disabled:cursor-not-allowed
  `
  
  const variants = {
    primary: `
      bg-primary text-background hover:bg-primaryGlow
      focus:ring-primary
      ${glow ? 'shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)]' : ''}
    `,
    secondary: `
      bg-surfaceElevated text-white border border-border
      hover:border-primary hover:text-primary
      focus:ring-primary
    `,
    danger: `
      bg-riskCritical text-white hover:bg-red-600
      focus:ring-riskCritical
    `,
    ghost: `
      bg-transparent text-slate-400 hover:text-white hover:bg-surfaceElevated
      focus:ring-primary
    `,
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

interface CardProps {
  children: ReactNode
  className?: string
  glow?: boolean
}

export function Card({ children, className = '', glow = false }: CardProps) {
  return (
    <div className={`
      bg-surface rounded-2xl border border-border p-6
      transition-all duration-200 ease-in-out
      hover:border-primary/30
      ${glow ? 'hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]' : ''}
      ${className}
    `}>
      {children}
    </div>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-400 mb-2">
          {label}
        </label>
      )}
      <input
        className={`
          w-full bg-surfaceElevated border border-border rounded-xl px-4 py-3
          text-white placeholder-slate-500
          transition-all duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
          hover:border-slate-600
          ${error ? 'border-riskCritical focus:ring-riskCritical/50' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-riskCritical">{error}</p>
      )}
    </div>
  )
}

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger'
  children: ReactNode
}

export function Badge({ variant = 'default', children }: BadgeProps) {
  const variants = {
    default: 'bg-slate-700 text-slate-300',
    success: 'bg-green-500/20 text-green-400 border border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
  }
  
  return (
    <span className={`
      inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium
      ${variants[variant]}
    `}>
      {children}
    </span>
  )
}

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <div className="animate-fade-in">
      {children}
    </div>
  )
}