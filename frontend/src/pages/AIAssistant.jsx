import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import ReactMarkdown from 'react-markdown'

const CUSTOMER_SUGGESTIONS = [
  'What food is available in Tashkent today?',
  'What are the best deals right now?',
  'Tell me about Uzbek street food',
  'How does Tejam work?',
]

const SHOP_SUGGESTIONS = [
  'How should I price my surplus samsa?',
  'Tips for reducing food waste in my bakery',
  'What discount percentage attracts most customers?',
  'What are my pending orders?',
]

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-white rounded-2xl rounded-tl-sm shadow-sm w-fit">
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  )
}

function MessageContent({ content }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>,
        li: ({ children }) => <li className="text-sm">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        code: ({ children }) => <code className="bg-black/10 px-1 rounded text-xs font-mono">{children}</code>,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

export default function AIAssistant() {
  const { user } = useAuth()
  const isShop = user?.role === 'shop'

  const initialMessage = {
    role: 'assistant',
    content: isShop
      ? `Hello ${user?.name}! I'm Tejam's AI assistant. I can help you write food descriptions, suggest prices, check your listings and orders, and give tips on reducing food waste. What would you like help with today?`
      : `Hello ${user?.name}! I'm Tejam's AI assistant. I can help you find the best food deals in Uzbekistan, tell you about local cuisine, and answer questions about how Tejam works. What can I help you with?`,
  }

  const [messages, setMessages] = useState([initialMessage])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    const messageText = text || input.trim()
    if (!messageText) return

    setInput('')
    const updatedMessages = [...messages, { role: 'user', content: messageText }]
    setMessages(updatedMessages)
    setLoading(true)

    // Build history excluding the initial greeting (index 0)
    const history = updatedMessages.slice(1, -1)

    try {
      const res = await api.post('/ai/chat', {
        message: messageText,
        history,
      })
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }])
    } catch (err) {
      const status = err.response?.status
      const errMsg = err.response?.data?.error ||
        (status === 429
          ? 'AI quota exceeded. Please try again in a few minutes.'
          : 'Sorry, I encountered an error. Please try again.')
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg, isError: true }])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage()
  }

  const handleClear = () => {
    setMessages([initialMessage])
    setInput('')
  }

  const suggestions = isShop ? SHOP_SUGGESTIONS : CUSTOMER_SUGGESTIONS

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-primary-700 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xl">✨</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Assistant</h1>
          <p className="text-sm text-gray-500">
            Powered by Gemini 2.0 · {isShop ? 'Shop mode' : 'Customer mode'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-pulse" />
            <span className="text-xs text-gray-500">Online</span>
          </div>
          {messages.length > 1 && (
            <button
              onClick={handleClear}
              className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear chat
            </button>
          )}
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pb-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 bg-primary-700 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                <span className="text-white text-xs">✨</span>
              </div>
            )}
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary-700 text-white rounded-tr-sm'
                  : msg.isError
                  ? 'bg-red-50 text-red-700 border border-red-200 rounded-tl-sm'
                  : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-sm'
              }`}
            >
              {msg.role === 'assistant' && !msg.isError
                ? <MessageContent content={msg.content} />
                : msg.content.split('\n').map((line, li, arr) => (
                    <span key={li}>{line}{li < arr.length - 1 && <br />}</span>
                  ))
              }
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 ml-2 mt-1">
                <span className="text-primary-700 font-semibold text-xs">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 bg-primary-700 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1">
              <span className="text-white text-xs">✨</span>
            </div>
            <TypingIndicator />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="py-3">
          <p className="text-xs text-gray-400 mb-2 font-medium">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                disabled={loading}
                className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full hover:bg-gray-50 hover:border-primary-300 hover:text-primary-600 transition-colors disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-3 border-t border-gray-200">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={isShop ? 'Ask about pricing, your listings, orders…' : 'Ask about deals, food, or how Tejam works…'}
          className="input-field flex-1"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn-primary px-4 flex-shrink-0"
        >
          {loading ? (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </form>

      <p className="text-center text-xs text-gray-400 mt-2">
        Powered by Google Gemini · gemini-2.0-flash
      </p>
    </div>
  )
}
