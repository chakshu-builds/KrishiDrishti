'use client';

import React, { useState } from 'react';
import {
  PhoneCall,
  PhoneOff,
  Mic,
  Volume2,
  VolumeX,
  X,
  Code,
  Radio,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';

export default function VoiceAssistantModal() {
  const { isVoiceModalOpen, setIsVoiceModalOpen, profile, speakText } = useApp();

  const [callActive, setCallActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<'idle' | 'language_selection' | 'main_menu' | 'speak_question' | 'completed'>('idle');
  const [promptText, setPromptText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('hi');
  const [spokenInput, setSpokenInput] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [rawTwiml, setRawTwiml] = useState('');
  const [showTwiml, setShowTwiml] = useState(false);
  const [sessionId, setSessionId] = useState('');

  if (!isVoiceModalOpen) return null;

  const startCall = async () => {
    try {
      setCallActive(true);
      const res = await api.simulateVoiceCall({
        action: 'start',
        callerNumber: profile?.phoneNumber || '+919876543210',
      });
      setSessionId(res.sessionId);
      setCurrentStep('language_selection');
      setPromptText(res.promptText);
      setRawTwiml(res.rawTwiml);
      speakText('कृषक दृष्टि किसान हेल्पलाइन में आपका स्वागत है। हिंदी के लिए 1 दबाएं। ਪੰਜਾਬੀ ਲਈ 2 ਦਬਾਓ।');
    } catch (err) {
      console.error('Call failed:', err);
    }
  };

  const handleDigitPress = async (digit: string) => {
    if (currentStep === 'language_selection') {
      const res = await api.simulateVoiceCall({
        action: 'select_language',
        sessionId,
        digit,
      });
      setCurrentStep('main_menu');
      setSelectedLanguage(res.selectedLanguage);
      setPromptText(res.promptText);
      speakText(res.promptText);
    } else if (currentStep === 'main_menu') {
      const res = await api.simulateVoiceCall({
        action: 'select_menu',
        sessionId,
        digit,
        language: selectedLanguage,
      });
      setRawTwiml(res.twiml);
      if (digit === '3') {
        setCurrentStep('speak_question');
        setPromptText(selectedLanguage === 'pa' ? 'ਬੀਪ ਤੋਂ ਬਾਅਦ ਆਪਣਾ ਸਵਾਲ ਬੋਲੋ...' : 'बीप के बाद अपनी फसल का सवाल बोलें...');
      } else {
        setCurrentStep('completed');
        // Extract say text from TwiML
        const match = res.twiml.match(/<Say[^>]*>([^<]+)<\/Say>/);
        const spoken = match ? match[1] : res.message;
        setPromptText(spoken);
        speakText(spoken);
      }
    }
  };

  const handleSendSpokenQuestion = async () => {
    if (!spokenInput.trim()) return;
    const res = await api.simulateVoiceCall({
      action: 'speak_question',
      sessionId,
      spokenText: spokenInput,
      language: selectedLanguage,
    });
    setAiAnswer(res.aiResponse);
    setRawTwiml(res.twiml);
    setCurrentStep('completed');
    setPromptText(res.aiResponse);
    speakText(res.aiResponse);
  };

  const endCall = () => {
    setCallActive(false);
    setCurrentStep('idle');
    setPromptText('');
    setRawTwiml('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-agri-surface rounded-2xl border border-agri-border shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Bar */}
        <div className="p-4 bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 flex items-center justify-center">
              <PhoneCall className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">Farmer Telephone / IVR Hotline Gateway</h3>
              <p className="text-[11px] text-emerald-300">Toll-Free Voice Channel Simulation (Twilio TwiML / Exotel)</p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setShowTwiml(!showTwiml)}
              className={`p-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1 ${
                showTwiml ? 'bg-emerald-700 border-emerald-500' : 'bg-emerald-800/60 border-emerald-700 text-emerald-200'
              }`}
              title="Inspect TwiML XML"
            >
              <Code className="w-3.5 h-3.5" />
              <span className="text-[10px]">TwiML</span>
            </button>
            <button
              onClick={() => {
                endCall();
                setIsVoiceModalOpen(false);
              }}
              className="p-1.5 rounded-lg bg-emerald-800/60 hover:bg-emerald-700 text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TwiML XML Inspector Tab */}
        {showTwiml && rawTwiml && (
          <div className="p-3 bg-stone-900 text-emerald-400 font-mono text-[11px] border-b border-stone-800 max-h-40 overflow-y-auto">
            <div className="text-[10px] text-stone-400 mb-1">// Server-Generated TwiML Voice Response:</div>
            <pre className="whitespace-pre-wrap">{rawTwiml}</pre>
          </div>
        )}

        {/* Call Simulator Screen */}
        <div className="p-5 space-y-4 bg-[#F8FAF6]">
          {!callActive ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-inner">
                <PhoneCall className="w-8 h-8 text-agri-green animate-bounce" />
              </div>
              <div>
                <h4 className="font-bold text-agri-text-primary text-base">Agricultural Voice Hotline</h4>
                <p className="text-xs text-agri-text-secondary max-w-sm mx-auto mt-1">
                  Enables Indian farmers without smartphones or slow 2G connectivity to dial a toll-free number, select their native language, and hear real-time weather risks and mandi rates.
                </p>
              </div>
              <div className="text-xs text-agri-text-muted">
                Simulated Caller ID: <span className="font-mono font-bold text-agri-green">{profile?.phoneNumber || '+919876543210'}</span>
              </div>
              <button
                onClick={startCall}
                className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-agri-green text-white font-semibold text-sm hover:bg-agri-green-hover transition-all shadow-md"
              >
                <PhoneCall className="w-4 h-4 text-green-300" />
                <span>Simulate Inbound Farmer Call</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Call Status Banner */}
              <div className="p-3 rounded-xl bg-white border border-agri-border flex items-center justify-between shadow-xs">
                <div className="flex items-center space-x-2.5">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
                  <div className="text-xs">
                    <div className="font-bold text-agri-text-primary">Call Connected (1800-KRISHAK)</div>
                    <div className="text-[10px] text-agri-text-muted">Farmer: {profile?.fullName || 'Gurpreet Singh'}</div>
                  </div>
                </div>
                <button
                  onClick={endCall}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 flex items-center space-x-1"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  <span>Hang Up</span>
                </button>
              </div>

              {/* IVR Voice Playback Box */}
              <div className="p-4 rounded-xl bg-white border border-agri-border space-y-2 shadow-xs">
                <div className="flex items-center space-x-2 text-agri-green">
                  <Volume2 className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">IVR Spoken Prompt:</span>
                </div>
                <p className="text-xs sm:text-sm text-agri-text-primary leading-relaxed font-medium bg-agri-bg p-3 rounded-lg border border-agri-border">
                  {promptText || 'Connecting...'}
                </p>
              </div>

              {/* Keypad & Menu Options */}
              {currentStep === 'language_selection' && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-agri-text-secondary">Keypad Selection (Choose Language):</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleDigitPress('1')}
                      className="p-2.5 bg-white border border-agri-border rounded-xl text-left hover:border-agri-green hover:bg-agri-green-light transition-all text-xs"
                    >
                      <span className="font-bold text-agri-green mr-2">1.</span>
                      <span className="font-semibold">हिंदी (Hindi)</span>
                    </button>
                    <button
                      onClick={() => handleDigitPress('2')}
                      className="p-2.5 bg-white border border-agri-border rounded-xl text-left hover:border-agri-green hover:bg-agri-green-light transition-all text-xs"
                    >
                      <span className="font-bold text-agri-green mr-2">2.</span>
                      <span className="font-semibold">ਪੰਜਾਬੀ (Punjabi)</span>
                    </button>
                    <button
                      onClick={() => handleDigitPress('3')}
                      className="p-2.5 bg-white border border-agri-border rounded-xl text-left hover:border-agri-green hover:bg-agri-green-light transition-all text-xs"
                    >
                      <span className="font-bold text-agri-green mr-2">3.</span>
                      <span className="font-semibold">मराठी (Marathi)</span>
                    </button>
                    <button
                      onClick={() => handleDigitPress('4')}
                      className="p-2.5 bg-white border border-agri-border rounded-xl text-left hover:border-agri-green hover:bg-agri-green-light transition-all text-xs"
                    >
                      <span className="font-bold text-agri-green mr-2">4.</span>
                      <span className="font-semibold">English</span>
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 'main_menu' && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-agri-text-secondary">Keypad Menu Options:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => handleDigitPress('1')}
                      className="p-2.5 bg-white border border-agri-border rounded-xl text-left hover:border-agri-green hover:bg-agri-green-light transition-all text-xs"
                    >
                      <span className="font-bold text-agri-green mr-2">1.</span>
                      <span>Weather & Rain Risk</span>
                    </button>
                    <button
                      onClick={() => handleDigitPress('2')}
                      className="p-2.5 bg-white border border-agri-border rounded-xl text-left hover:border-agri-green hover:bg-agri-green-light transition-all text-xs"
                    >
                      <span className="font-bold text-agri-green mr-2">2.</span>
                      <span>Today's Mandi Rates</span>
                    </button>
                    <button
                      onClick={() => handleDigitPress('3')}
                      className="p-2.5 bg-white border border-agri-border rounded-xl text-left hover:border-agri-green hover:bg-agri-green-light transition-all text-xs"
                    >
                      <span className="font-bold text-agri-green mr-2">3.</span>
                      <span>Ask Spoken Question</span>
                    </button>
                    <button
                      onClick={() => handleDigitPress('4')}
                      className="p-2.5 bg-white border border-agri-border rounded-xl text-left hover:border-agri-green hover:bg-agri-green-light transition-all text-xs"
                    >
                      <span className="font-bold text-agri-green mr-2">4.</span>
                      <span>Request Expert Callback</span>
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 'speak_question' && (
                <div className="p-3 bg-white border border-agri-border rounded-xl space-y-3">
                  <div className="text-xs font-bold text-agri-text-primary">Speak or Enter Your Agricultural Question:</div>
                  <input
                    type="text"
                    value={spokenInput}
                    onChange={(e) => setSpokenInput(e.target.value)}
                    placeholder="e.g. Meri gehun ki fasal me peele patte dikh rahe hain..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-agri-border bg-agri-bg"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSendSpokenQuestion}
                      className="flex-1 py-2 bg-agri-green text-white text-xs font-bold rounded-lg hover:bg-agri-green-hover"
                    >
                      Submit Speech to AI Assistant
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 'completed' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>IVR Information Delivered Successfully</span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    If enabled, an SMS summary is also dispatched to the farmer's registered mobile number without extra charges.
                  </p>
                  <button
                    onClick={() => {
                      setCurrentStep('main_menu');
                      handleDigitPress(selectedLanguage === 'pa' ? '2' : selectedLanguage === 'mr' ? '3' : '1');
                    }}
                    className="text-xs text-agri-green font-semibold hover:underline"
                  >
                    ← Return to Main Menu
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
