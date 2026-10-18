'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Bot,
  User,
  Sprout,
  Tractor,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useApp } from '../../context/AppContext';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedActions?: string[];
  linksToScreens?: { label: string; href: string }[];
}

export default function AIAssistantPage() {
  const { t, currentLanguage, langMeta, profile, speakText, stopSpeaking, isSpeaking } = useApp();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: `राम राम / सत श्री अकाल! मैं कृषक दृष्टि एआई मित्र हूँ। आपके पंजीकृत खेत "Green Horizon Acreage" (Ludhiana) के संदर्भ में मैं मौसम, मंडी भाव, खाद प्रबंधन और फसल स्वास्थ्य पर सलाह दे सकता हूँ। आप क्या जानना चाहते हैं?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: [
        'गेहूं में पीले रतुआ (Yellow Rust) के लक्षण व उपचार',
        'क्या कल बारिश से पहले यूरिया डालना सही है?',
        'लुधियाना और खन्ना मंडी में गेहूं का मॉडल भाव',
        'खेत की मिट्टी में NPK खाद की मात्रा कैसे जांचें?',
      ],
      linksToScreens: [
        { label: 'View Weather Forecast', href: '/weather' },
        { label: 'Check Mandi Prices', href: '/mandi' },
      ],
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFieldContext, setSelectedFieldContext] = useState<string>('field-101');
  const [fields, setFields] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Load fields for context selector
  useEffect(() => {
    api.getFields(undefined, profile?.id).then((res) => {
      setFields(res.fields || []);
      if (res.fields && res.fields.length > 0) {
        setSelectedFieldContext(res.fields[0].id);
      }
    }).catch(() => {});
  }, [profile?.id]);

  // Speech Recognition (STT)
  const toggleRecording = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = langMeta.bcp47;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsRecording(false);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognition.start();
    } catch (err) {
      console.warn('Speech Recognition error:', err);
      setIsRecording(false);
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const activeField = fields.find((f) => f.id === selectedFieldContext);
      const contextualQuery = activeField
        ? `[Field Context: ${activeField.name}, Crop: ${activeField.cropName}, Stage: ${activeField.growthStage}] ${text}`
        : text;

      const res = await api.chatWithAssistant(
        contextualQuery,
        profile?.id || 'usr-farmer-001',
        currentLanguage
      );

      const botMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: res.suggestedActions,
        linksToScreens: res.linksToScreens,
      };

      setMessages((prev) => [...prev, botMsg]);

      // Automatically speak the response if farmer previously requested
      speakText(res.reply);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: 'क्षमा करें, संदेश का उत्तर देने में समस्या आई। कृपया पुनः प्रयास करें। (Backend assistant response error)',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'msg-welcome-new',
        sender: 'assistant',
        text: 'बातचीत रीसेट कर दी गई है। आप कृषि से संबंधित कोई भी नया प्रश्न पूछ सकते हैं।',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto h-[calc(100vh-8.5rem)] flex flex-col">
      {/* Top Header & Context Bar */}
      <div className="bg-agri-surface border border-agri-border rounded-xl p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-agri-green text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h1 className="font-bold text-base text-agri-text-primary leading-tight">
              {t.nav.aiAssistant || 'KrishakDrishti AI Assistant (कृषि एआई मित्र)'}
            </h1>
            <p className="text-[11px] text-agri-text-muted">
              Powered by Gemini AI • Grounded in your live soil sensors, weather, and Mandi feeds
            </p>
          </div>
        </div>

        {/* Field Context Selector & Clear Button */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-agri-text-muted font-medium hidden md:inline">Field Context:</span>
            <select
              value={selectedFieldContext}
              onChange={(e) => setSelectedFieldContext(e.target.value)}
              className="px-2.5 py-1.5 border border-agri-border rounded-lg text-xs bg-agri-bg text-agri-text-primary outline-none focus:ring-1 focus:ring-agri-green"
            >
              <option value="">All Farm Holdings</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.cropName})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleClearChat}
            className="p-1.5 rounded-lg border border-agri-border text-agri-text-muted hover:text-agri-text-primary hover:bg-agri-bg transition-colors"
            title="Clear Chat History"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 bg-agri-surface border border-agri-border rounded-2xl p-4 md:p-6 overflow-y-auto space-y-4 shadow-inner">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs ${
                  isUser
                    ? 'bg-agri-green text-white'
                    : 'bg-emerald-100 text-agri-green border border-emerald-200'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 text-xs leading-relaxed space-y-2 shadow-2xs ${
                  isUser
                    ? 'bg-agri-green text-white rounded-tr-none'
                    : 'bg-[#FAFBF8] border border-agri-border text-agri-text-primary rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-line font-normal">{msg.text}</div>

                {/* Direct Action Chips */}
                {!isUser && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="pt-2 border-t border-agri-border space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-agri-text-muted">
                      Suggested Next Inquiries:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestedActions.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(action)}
                          className="px-2.5 py-1 rounded-md bg-white border border-agri-border hover:border-agri-green text-[11px] text-agri-text-secondary hover:text-agri-green transition-colors text-left"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Screen Navigation Links */}
                {!isUser && msg.linksToScreens && msg.linksToScreens.length > 0 && (
                  <div className="pt-1.5 flex flex-wrap gap-2">
                    {msg.linksToScreens.map((link, i) => (
                      <Link
                        key={i}
                        href={link.href}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200 hover:bg-emerald-100 transition-colors"
                      >
                        <span>{link.label}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    ))}
                  </div>
                )}

                {/* Footer time & audio trigger */}
                <div
                  className={`flex items-center justify-between text-[10px] pt-1 ${
                    isUser ? 'text-green-200' : 'text-agri-text-muted'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {!isUser && (
                    <button
                      onClick={() => (isSpeaking ? stopSpeaking() : speakText(msg.text))}
                      className="hover:text-agri-green flex items-center space-x-1"
                      title="Read aloud"
                    >
                      {isSpeaking ? <VolumeX className="w-3 h-3 text-red-500" /> : <Volume2 className="w-3 h-3" />}
                      <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-agri-green border border-emerald-200 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-[#FAFBF8] border border-agri-border rounded-2xl rounded-tl-none p-3.5 text-xs text-agri-text-muted flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-agri-green animate-ping"></span>
              <span>Analyzing agronomic context and market records...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scientific Safety Notice */}
      <div className="text-[11px] text-agri-text-muted text-center px-4 flex items-center justify-center space-x-1.5 shrink-0">
        <ShieldCheck className="w-3.5 h-3.5 text-agri-green" />
        <span>
          Advisories are grounded in ICAR / KVK scientific protocols. Always verify chemical spraying rates with your local agricultural officer.
        </span>
      </div>

      {/* Input Bar */}
      <div className="bg-agri-surface border border-agri-border rounded-2xl p-2.5 shadow-md shrink-0 flex items-center space-x-2">
        {/* Voice Input STT */}
        <button
          onClick={toggleRecording}
          className={`p-2.5 rounded-xl transition-colors ${
            isRecording
              ? 'bg-red-500 text-white animate-pulse'
              : 'text-agri-text-secondary hover:bg-agri-bg hover:text-agri-green'
          }`}
          title={isRecording ? 'Listening... click to stop' : 'Speak your question (Voice Input)'}
        >
          {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Text Input */}
        <input
          type="text"
          placeholder={
            isRecording
              ? 'Listening to your voice... bolte rahiye...'
              : 'फसल, मौसम या मंडी भाव के बारे में पूछें... (Type question)...'
          }
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendMessage();
          }}
          disabled={isLoading}
          className="flex-1 bg-transparent text-xs text-agri-text-primary placeholder:text-agri-text-muted outline-none px-2"
        />

        {/* Send Button */}
        <button
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || isLoading}
          className="p-2.5 rounded-xl bg-agri-green text-white hover:bg-agri-green-hover transition-colors disabled:opacity-40 disabled:hover:bg-agri-green shadow-xs"
          title="Send Question"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
