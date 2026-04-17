'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, TrendingUp, BookOpen } from 'lucide-react'
import { copilot, learning } from '@/lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface PopularQuestion {
  question: string
  count: number
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm Zyra AI. Ask me about security scans, threats, or how to use Zyra." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [popular, setPopular] = useState<PopularQuestion[]>([])
  const [showGuide, setShowGuide] = useState(false)
  const [guide, setGuide] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOpen])

  // Load popular questions when opened
  useEffect(() => {
    if (isOpen && popular.length === 0) {
      learning.getPopular().then(res => {
        if (res?.popular) setPopular(res.popular.slice(0, 5))
      }).catch(() => {})
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const response = await copilot.chat(input)
      const answer = response.answer || "I'm here to help!"
      
      setMessages(prev => [...prev, { role: 'assistant', content: answer }])
      
      // Log question for learning
      learning.logQuestion(input, true, response.action).catch(() => {})
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't process that. Try again." }])
    } finally {
      setLoading(false)
    }
  }

  const handlePopularClick = (q: string) => {
    setInput(q)
  }

  const loadAutoGuide = async () => {
    setShowGuide(true)
    try {
      const res = await learning.getAutoGuide()
      setGuide(res.guide)
    } catch (e) {
      setGuide(null)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 p-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-full shadow-lg transition-all hover:scale-110"
        aria-label="Open chat"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-80 md:w-96 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[500px]">
          {/* Header */}
          <div className="bg-slate-900 p-4 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="w-6 h-6 text-cyan-400" />
              <span className="font-semibold text-white">Zyra AI</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadAutoGuide}
                className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors"
                title="View auto-generated guide"
              >
                <BookOpen className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Auto Guide Panel */}
          {showGuide && (
            <div className="p-4 border-b border-slate-700 bg-slate-900/50 max-h-48 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-cyan-400">Your Personalized Guide</h4>
                <button onClick={() => setShowGuide(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {guide?.sections?.map((s: any, i: number) => (
                <div key={i} className="mb-2">
                  <h5 className="text-xs font-medium text-white">{s.title}</h5>
                  <p className="text-xs text-slate-400">{s.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Popular Questions */}
          {popular.length > 0 && messages.length <= 1 && (
            <div className="p-3 border-b border-slate-700 bg-slate-900/30">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                <TrendingUp className="w-3 h-3" />
                <span>Popular questions</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {popular.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handlePopularClick(p.question)}
                    className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
                  >
                    {p.question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] p-3 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-cyan-500 text-slate-900'
                      : 'bg-slate-700 text-slate-100'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-700 p-3 rounded-lg text-sm text-slate-400 animate-pulse">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-slate-700 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 rounded-lg transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}