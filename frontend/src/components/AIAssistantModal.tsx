'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ExternalLink,
  Bot,
  User,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedActions?: string[];
  linksToScreens?: Array<{ label: string; href: string }>;
}

export default function AIAssistantModal() {
  const {
    isAIAssistantOpen,
    setIsAIAssistantOpen,
    t,
    profile,
    currentLanguage,
    speakText,
    isSpeaking,
    stopSpeaking,
  } = useApp();

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize initial greeting in selected language
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'msg-init',
          sender: 'assistant',
          text: currentLanguage === 'pa'
            ? 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ! ਮੈਂ ਤੁਹਾਡਾ ਕ੍ਰਿਸ਼ਕ ਦ੍ਰਿਸ਼ਟੀ ਖੇਤੀਬਾੜੀ ਏਆਈ ਸਹਾਇਕ ਹਾਂ। ਮੌਸਮ, ਮੰਡੀ ਭਾਅ ਜਾਂ ਫ਼ਸਲ ਦੇ ਰੋਗਾਂ ਬਾਰੇ ਕੋਈ ਵੀ ਸਵਾਲ ਪੁੱਛੋ।'
            : currentLanguage === 'mr'
            ? 'नमस्कार शेतकरी बंधू! मी आपला कृषक दृष्टी कृषी सहाय्यक आहे. हवामान, कांदा बाजार भाव किंवा पीक रोगांविषयी विचारा.'
            : currentLanguage === 'en'
            ? 'Hello! I am your KrishakDrishti agricultural AI assistant. Ask me about weather risks, APMC mandi rates, or crop pathology.'
            : 'नमस्ते किसान भाई! मैं आपका कृषक दृष्टि कृषि सहायक हूं। आप मुझसे वर्तमान मौसम, ताजा मंडी भाव या फसल की बीमारी के बारे में पूछ सकते हैं।',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedActions: [
            'How is the weather forecast for wheat?',
            'What is today’s wheat and onion mandi rate?',
            'Signs of yellow stripe rust on leaves',
          ],
        },
      ]);
    }
  }, [currentLanguage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isAIAssistantOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await api.chatWithAssistant(text, profile?.id, currentLanguage);
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: res.suggestedActions,
        linksToScreens: res.linksToScreens,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: 'Assistant service temporarily unavailable. Please retry or check backend connection.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Voice Speech Recognition (STT)
  const toggleSpeechRecognition = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Edge.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = currentLanguage === 'pa' ? 'pa-IN' : currentLanguage === 'mr' ? 'mr-IN' : currentLanguage === 'en' ? 'en-IN' : 'hi-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: any) => {
        const spoken = event.results[0][0].transcript;
        setInputMessage(spoken);
        handleSend(spoken);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognition.start();
    } catch (err) {
      setIsRecording(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-agri-surface rounded-2xl border border-agri-border shadow-2xl w-full max-w-lg h-[620px] max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-agri-green text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700/50 flex items-center justify-center">
              <Bot className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">{t.assistant.title}</h3>
              <p className="text-[11px] text-green-200">Multilingual Agronomy Intelligence (Gemini AI)</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isSpeaking ? (
              <button
                onClick={stopSpeaking}
                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white"
                title="Stop Speech Playback"
              >
                <VolumeX className="w-4 h-4 text-amber-300 animate-pulse" />
              </button>
            ) : null}
            <button
              onClick={() => setIsAIAssistantOpen(false)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F9FAF6]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-agri-green text-white rounded-br-xs shadow-xs'
                    : 'bg-white text-agri-text-primary border border-agri-border rounded-bl-xs shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between space-x-3 mb-1">
                  <span className="text-[10px] font-bold opacity-75">
                    {msg.sender === 'user' ? (profile?.fullName || 'Farmer') : 'KrishakDrishti AI'}
                  </span>
                  <div className="flex items-center space-x-1">
                    <span className="text-[9px] opacity-60">{msg.timestamp}</span>
                    {msg.sender === 'assistant' && (
                      <button
                        onClick={() => speakText(msg.text)}
                        className="text-agri-green hover:text-agri-green-hover ml-1 p-0.5 rounded"
                        title="Read aloud"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Direct screen links */}
                {msg.linksToScreens && msg.linksToScreens.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-agri-border/60 flex flex-wrap gap-1.5">
                    {msg.linksToScreens.map((link, idx) => (
                      <Link
                        key={idx}
                        href={link.href}
                        onClick={() => setIsAIAssistantOpen(false)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-agri-green-light text-agri-green text-[11px] font-semibold hover:bg-emerald-100 transition-colors"
                      >
                        <span>{link.label}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Suggested action chips */}
              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 max-w-[88%]">
                  {msg.suggestedActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(action)}
                      className="px-2.5 py-1 rounded-full text-[11px] bg-white border border-agri-border text-agri-green hover:bg-agri-green hover:text-white transition-colors text-left"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-2 text-xs text-agri-text-muted p-2">
              <div className="w-2 h-2 rounded-full bg-agri-green animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-agri-green animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-2 h-2 rounded-full bg-agri-green animate-bounce [animation-delay:0.4s]"></div>
              <span>Analyzing agronomic context...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-agri-border bg-agri-surface">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`p-2.5 rounded-xl border transition-colors ${
                isRecording
                  ? 'bg-red-50 text-red-600 border-red-300 animate-pulse'
                  : 'bg-agri-bg text-agri-text-secondary border-agri-border hover:bg-agri-surface'
              }`}
              title={isRecording ? 'Listening... Click to stop' : 'Speak your question (STT)'}
            >
              {isRecording ? <MicOff className="w-4 h-4 text-red-600" /> : <Mic className="w-4 h-4 text-agri-green" />}
            </button>

            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={t.assistant.placeholder}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-agri-border text-xs sm:text-sm focus:outline-hidden focus:ring-1 focus:ring-agri-green bg-agri-bg"
            />

            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="p-2.5 rounded-xl bg-agri-green text-white hover:bg-agri-green-hover disabled:opacity-50 transition-colors shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-2 text-[10px] text-agri-text-muted flex items-center justify-between px-1">
            <span>Powered by Gemini AI Agricultural Intelligence</span>
            <span className="text-amber-800 font-medium">Verify chemicals with KVK</span>
          </div>
        </div>
      </div>
    </div>
  );
}
