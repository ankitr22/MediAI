import { useState, useRef, useEffect } from 'react'
import api from '../api'
import ReactMarkdown from 'react-markdown'
import { Send, Bot, User, Loader2, BookOpen, Trash2 } from 'lucide-react'

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      role: 'model',
      content: "Hello! I'm your AI medical assistant, trained on the **Gale Encyclopedia of Medicine (2nd Edition)**. Ask me any medical question and I'll provide evidence-based answers.\n\n*Remember: Always consult a qualified doctor for personal medical advice.*"
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showContext, setShowContext] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const question = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setLoading(true)

    try {
      const history = messages
        .filter(m => m.role !== 'model' || messages.indexOf(m) > 0)
        .map(m => ({ role: m.role, parts: [m.content] }))

      const res = await api.post('/rag/chat', { question, history })
      setMessages(prev => [...prev, {
        role: 'model',
        content: res.data.answer,
        context: res.data.context_used
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'model',
        content: 'Sorry, I encountered an error. Please try again.',
        isError: true
      }])
    } finally {
      setLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([{
      role: 'model',
      content: "Hello! I'm your AI medical assistant, trained on the **Gale Encyclopedia of Medicine (2nd Edition)**. Ask me any medical question and I'll provide evidence-based answers.\n\n*Remember: Always consult a qualified doctor for personal medical advice.*"
    }])
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <BookOpen size={20} className="text-blue-700" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Medical Encyclopedia Chat</h2>
            <p className="text-xs text-gray-500">Powered by Gale Encyclopedia of Medicine · Gemini AI</p>
          </div>
        </div>
        <button onClick={clearChat} className="flex items-center gap-2 text-gray-500 hover:text-red-500 text-sm transition-colors">
          <Trash2 size={16} />
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-blue-600' : 'bg-emerald-500'
            }`}>
              {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
            </div>
            <div className={`max-w-2xl ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-sm'
                  : msg.isError
                  ? 'bg-red-50 text-red-700 border border-red-200 rounded-tl-sm'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
              }`}>
                {msg.role === 'model' ? (
                  <ReactMarkdown className="prose prose-sm max-w-none">{msg.content}</ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
              {msg.context && (
                <button
                  onClick={() => setShowContext(showContext === i ? null : i)}
                  className="text-xs text-blue-500 hover:text-blue-700 underline"
                >
                  {showContext === i ? 'Hide' : 'View'} source context
                </button>
              )}
              {showContext === i && msg.context && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-gray-600 max-w-2xl">
                  <p className="font-semibold text-amber-700 mb-1">Source from Encyclopedia:</p>
                  {msg.context}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <Loader2 size={16} className="animate-spin text-gray-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={sendMessage} className="flex gap-3">
          <input
            className="input flex-1"
            placeholder="Ask a medical question... (e.g. What are symptoms of diabetes?)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="btn-primary px-5" disabled={loading || !input.trim()}>
            <Send size={18} />
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2 text-center">
          For informational purposes only. Not a substitute for professional medical advice.
        </p>
      </div>
    </div>
  )
}
