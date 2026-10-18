'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Image as ImageIcon,
  CheckCheck,
  ShieldCheck,
  Bot,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';

interface WAMsg {
  id: string;
  fromMe: boolean;
  text?: string;
  imageUrl?: string;
  time: string;
}

export default function WhatsAppSimulatorModal() {
  const { isWhatsAppModalOpen, setIsWhatsAppModalOpen, profile } = useApp();

  const [messages, setMessages] = useState<WAMsg[]>([
    {
      id: 'wa-1',
      fromMe: false,
      text: '🌾 *कृषक दृष्टि WhatsApp कृषि सेवा (KrishakDrishti)*\n\nनमस्ते किसान भाई! आप यहां मौसम, मंडी भाव या फसल के रोग की फोटो भेजकर त्वरित सहायता प्राप्त कर सकते हैं।',
      time: '10:00 AM',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isWhatsAppModalOpen) return null;

  const sendMessage = async (textToSend?: string, hasImage: boolean = false, imageUrl?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text && !hasImage) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: WAMsg = {
      id: `wa-u-${Date.now()}`,
      fromMe: true,
      text: hasImage ? '📷 [Crop Leaf Photo Sent]' : text,
      imageUrl: hasImage ? (imageUrl || 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=600&q=80') : undefined,
      time: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await api.simulateWhatsApp({
        senderNumber: profile?.phoneNumber?.replace(/[^0-9]/g, '') || '919876543210',
        text,
        hasImage,
        imageUrl: userMsg.imageUrl,
      });

      const replyMsg: WAMsg = {
        id: `wa-bot-${Date.now()}`,
        fromMe: false,
        text: res.replySent || 'Message processed by KrishakDrishti agricultural intelligence.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, replyMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `wa-err-${Date.now()}`,
          fromMe: false,
          text: 'Webhook communication error. Please ensure backend is running.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-stone-300 shadow-2xl w-full max-w-md h-[580px] max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* WhatsApp Header */}
        <div className="p-3.5 bg-[#075E54] text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#128C7E] flex items-center justify-center font-bold text-sm text-white">
              KD
            </div>
            <div>
              <div className="flex items-center space-x-1.5 font-bold text-sm">
                <span>KrishakDrishti Verified</span>
                <ShieldCheck className="w-4 h-4 text-emerald-300 fill-emerald-300" />
              </div>
              <div className="text-[11px] text-emerald-200">Official Business Account • AI Online</div>
            </div>
          </div>
          <button
            onClick={() => setIsWhatsAppModalOpen(false)}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* WhatsApp Chat Area */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#EFEAE2]">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] p-3 rounded-lg text-xs leading-relaxed shadow-xs ${
                  m.fromMe ? 'bg-[#D9FDD3] text-stone-900 rounded-tr-none' : 'bg-white text-stone-900 rounded-tl-none'
                }`}
              >
                {m.imageUrl && (
                  <img
                    src={m.imageUrl}
                    alt="WhatsApp uploaded crop leaf"
                    className="w-full h-36 object-cover rounded-md mb-2 border border-stone-200"
                  />
                )}
                <div className="whitespace-pre-wrap">{m.text}</div>
                <div className="text-[9px] text-stone-500 flex items-center justify-end space-x-1 mt-1">
                  <span>{m.time}</span>
                  {m.fromMe && <CheckCheck className="w-3 h-3 text-[#53BDEB]" />}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-1 text-[11px] text-stone-500 bg-white/80 px-2 py-1 rounded w-fit">
              <Bot className="w-3 h-3 text-[#075E54] animate-spin" />
              <span>KrishakDrishti AI is typing...</span>
            </div>
          )}
        </div>

        {/* Quick Test Presets */}
        <div className="p-2 bg-stone-100 border-t border-stone-200 flex space-x-1.5 overflow-x-auto">
          <button
            onClick={() => sendMessage('What is the mandi price of wheat in Khanna today?')}
            className="px-2.5 py-1 rounded-full text-[10px] bg-white border border-stone-300 text-stone-700 hover:bg-[#075E54] hover:text-white shrink-0 font-medium"
          >
            Ask Mandi Rate
          </button>
          <button
            onClick={() => sendMessage('Is there rain alert for my field in next 24 hours?')}
            className="px-2.5 py-1 rounded-full text-[10px] bg-white border border-stone-300 text-stone-700 hover:bg-[#075E54] hover:text-white shrink-0 font-medium"
          >
            Ask Weather Alert
          </button>
          <button
            onClick={() => sendMessage('', true, 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=600&q=80')}
            className="px-2.5 py-1 rounded-full text-[10px] bg-emerald-100 border border-emerald-300 text-emerald-800 hover:bg-[#075E54] hover:text-white shrink-0 font-medium"
          >
            📸 Send Diseased Leaf Photo
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-2.5 bg-[#F0F2F5] border-t border-stone-300 flex items-center space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a WhatsApp message..."
            className="flex-1 px-3.5 py-2 rounded-full border border-stone-300 text-xs focus:outline-hidden bg-white"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!inputText.trim() || loading}
            className="p-2 rounded-full bg-[#00A884] text-white hover:bg-[#075E54] disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
