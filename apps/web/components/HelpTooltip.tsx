'use client'

import { useState, type ReactNode } from 'react'
import { HELP_CONTENT, useHelp } from '@/lib/help'

interface HelpTooltipProps {
  children: ReactNode
  helpKey: string
}

export function HelpTooltip({ children, helpKey }: HelpTooltipProps) {
  const [show, setShow] = useState(false)
  const { showHelp } = useHelp()

  const content = HELP_CONTENT[helpKey]

  if (!content) return <>{children}</>

  return (
    <div 
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <button
        onClick={() => showHelp(helpKey)}
        className="ml-1 w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center hover:bg-cyan-500/40 transition-colors"
        aria-label={`Learn about ${content.title}`}
      >
        ?
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
          <h4 className="text-sm font-semibold text-cyan-400">{content.title}</h4>
          <p className="text-xs text-slate-300 mt-1">{content.content}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-slate-700" />
        </div>
      )}
    </div>
  )
}