'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, Bot, Loader2, Minimize2, Maximize2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { aiAPI } from '@/lib/api'
import toast from 'react-hot-toast'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function Chatbot() {
  const whatsappNumber = '905301235825'
  const whatsappDisplayNumber = '0530 123 58 25'
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    'Merhaba, Mikrokurs hakkında bilgi almak istiyorum.'
  )}`
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Merhaba! 👋 Ben SınavBot, Mikrokurs asistanınızım. Size sınav hazırlığı ve denemeler konusunda yardımcı olabilirim.',
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus()
    }
  }, [isOpen, isMinimized])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)
    setIsTyping(true)

    try {
      // Build conversation history
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      console.log('Sending message to chatbot:', inputMessage)
      console.log('Conversation history:', conversationHistory)
      console.log('API Base URL:', process.env.NEXT_PUBLIC_API_URL)
      console.log('Window location:', typeof window !== 'undefined' ? window.location.origin : 'SSR')

      const response = await aiAPI.chatbot(inputMessage, conversationHistory)

      console.log('Chatbot response:', response.data)

      setIsTyping(false)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error: any) {
      setIsTyping(false)
      console.error('Chatbot error:', error)
      if (error.response) {
        console.error('Error details:', error.response.data)
        console.error('Error status:', error.response.status)
      } else if (error.request) {
        console.error('No response received:', error.request)
      } else {
        console.error('Error message:', error.message)
      }

      let errorMsg = 'Üzgünüm, şu an mesajınızı işleyemedim. 😔'

      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMsg = 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin. ⏱️'
      } else if (error.code === 'ERR_NETWORK' || !error.response) {
        errorMsg = 'Chatbot servisi şu an kullanılamıyor. Backend bağlantısı kontrol ediliyor... 🔧'
      } else if (error.response?.status === 401) {
        errorMsg = 'Chatbot\'u kullanmak için giriş yapmanız gerekiyor. Lütfen giriş yapın veya kayıt olun. 🔐'
      } else if (error.response?.status === 404) {
        errorMsg = 'Chatbot API endpoint\'i bulunamadı. Lütfen yöneticinizle iletişime geçin. ⚠️'
      } else if (error.response?.status === 500) {
        errorMsg = 'Sunucu hatası. AI servisi şu an aktif değil olabilir. Lütfen daha sonra tekrar deneyin. 🤖'
      } else if (error.response?.status === 503) {
        errorMsg = 'Chatbot servisi şu an aktif değil. Lütfen daha sonra tekrar deneyin. 🔧'
      } else if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail
      }

      // Don't show toast if it's a network error - just show in chat
      if (error.code !== 'ERR_NETWORK') {
        toast.error(errorMsg)
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorMsg,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const whatsappButton = (
    <a
      href={whatsappHref}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-3 rounded-full bg-emerald-500/95 px-3 py-3 text-white shadow-2xl shadow-emerald-900/30 transition-all duration-300 hover:-translate-y-1 hover:bg-emerald-500"
      aria-label={`WhatsApp ile iletişim kur: ${whatsappDisplayNumber}`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/18">
        <MessageCircle className="h-5 w-5" />
      </span>
      <div className="hidden pr-2 sm:block">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/75">
          WhatsApp Hattı
        </p>
        <p className="text-sm font-semibold">{whatsappDisplayNumber}</p>
      </div>
    </a>
  )

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {whatsappButton}
        <button
          onClick={() => setIsOpen(true)}
          aria-label="SınavBot'u aç"
          className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-2xl transition-all duration-300 hover:scale-110 hover:from-blue-700 hover:to-purple-700 hover:shadow-blue-500/50"
        >
          <Bot className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" />
          <div className="absolute -top-1 -right-1 h-4 w-4 animate-pulse rounded-full border-2 border-white bg-green-400"></div>
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {whatsappButton}
      <div
        className={`${isMinimized ? 'h-16 w-80' : 'h-[600px] w-96'} flex flex-col rounded-3xl border border-gray-200 bg-white shadow-2xl transition-all duration-300`}
      >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-t-3xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-blue-600" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
          </div>
          <div className="text-white">
            <h3 className="font-bold">SınavBot</h3>
            <p className="text-xs text-white/80">Mikrokurs Asistanı</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            aria-label={isMinimized ? "SınavBot penceresini büyüt" : "SınavBot penceresini küçült"}
            className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all duration-300"
          >
            {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="SınavBot'u kapat"
            className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all duration-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in-bottom`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                    {message.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start animate-slide-in-bottom">
                <div className="bg-white text-gray-800 rounded-2xl px-4 py-3 border border-gray-200 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                      <span className="text-xs text-gray-500">SınavBot yazıyor...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 bg-white rounded-b-3xl">
            <div className="flex items-center space-x-2">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Mesajınızı yazın..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="flex-1 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500/20 px-4 py-3"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl px-6 shadow-lg hover:shadow-blue-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  )
}
