'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Bell,
  ChevronDown,
  Check,
  AlertTriangle,
  MapPin,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { INDIAN_LANGUAGES } from '../i18n/languages';
import { api } from '../lib/api';

export default function Navbar() {
  const {
    currentLanguage,
    setLanguage,
    profile,
    setProfileId,
    availableProfiles,
    setIsAIAssistantOpen,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.id) {
      api.getAlerts(profile.id).then((res) => {
        setAlerts(res.alerts || []);
      }).catch(() => {});
    }
  }, [profile?.id]);

  const activeLang = INDIAN_LANGUAGES.find((l) => l.code === currentLanguage) || INDIAN_LANGUAGES[0];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase();
    if (q.includes('farm') || q.includes('field') || q.includes('land')) {
      window.location.href = '/farms';
    } else if (q.includes('crop') || q.includes('health') || q.includes('leaf') || q.includes('disease')) {
      window.location.href = '/crop-health';
    } else if (q.includes('weather') || q.includes('rain') || q.includes('temp') || q.includes('forecast')) {
      window.location.href = '/weather';
    } else if (q.includes('mandi') || q.includes('price') || q.includes('rate') || q.includes('wheat') || q.includes('paddy')) {
      window.location.href = '/mandi';
    } else if (q.includes('alert') || q.includes('risk') || q.includes('warning')) {
      window.location.href = '/alerts';
    } else {
      setIsAIAssistantOpen(true);
    }
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-[#E2E8DC] px-5 md:px-7 flex items-center justify-between sticky top-0 z-30 transition-all">
      {/* Left side: Search & Context */}
      <div className="flex items-center space-x-4">
        {/* Search input with keyboard hint */}
        <form onSubmit={handleSearchSubmit} className="relative w-64 sm:w-80 md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-3.5 w-3.5 text-stone-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search farms, crops, alerts, mandi prices..."
            className="w-full pl-9 pr-8 py-1.5 rounded-lg text-xs bg-[#F9FAF6] border border-[#E2E8DC] text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#1B4D3E] focus:border-[#1B4D3E] transition-all"
          />
          <kbd className="hidden sm:inline-block absolute right-2.5 top-2 text-[10px] text-stone-400 font-mono">
            ↵
          </kbd>
        </form>

        {/* Active Farm Context badge */}
        <div className="hidden lg:flex items-center space-x-1.5 text-xs text-stone-500 pl-2 border-l border-stone-200">
          <MapPin className="w-3.5 h-3.5 text-[#1B4D3E]" />
          <span className="font-medium text-stone-800">
            {profile?.role === 'fpo_coordinator' ? 'Malwa Agri Cluster' : 'Green Horizon Acreage'}
          </span>
          <span className="text-[11px] text-stone-400">• Ludhiana</span>
        </div>
      </div>

      {/* Right side: Language Selector, Notifications, Profile */}
      <div className="flex items-center space-x-2.5 md:space-x-3">
        {/* Official 22 Indian Languages Selector */}
        <div className="relative">
          <button
            onClick={() => {
              setIsLangDropdownOpen(!isLangDropdownOpen);
              setIsProfileDropdownOpen(false);
              setIsAlertsOpen(false);
            }}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-700 bg-white border border-[#E2E8DC] hover:border-stone-300 transition-colors shadow-2xs"
            title="Change Indian Regional Language"
          >
            <span className="text-xs" role="img" aria-label="India flag">🇮🇳</span>
            <span className="font-semibold text-stone-800">{activeLang.nativeName}</span>
            <span className="text-[10px] text-stone-400 hidden sm:inline">({activeLang.name})</span>
            <ChevronDown className="w-3 h-3 text-stone-400" />
          </button>

          {isLangDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 max-h-96 overflow-y-auto bg-white border border-[#E2E8DC] rounded-xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="p-2 border-b border-stone-100">
                <div className="text-xs font-bold text-stone-900">Official Indian Languages (22)</div>
                <div className="text-[10px] text-stone-500">Unicode-safe localization with regional phonetic TTS</div>
              </div>
              <div className="py-1">
                {INDIAN_LANGUAGES.map((lang) => {
                  const isSelected = lang.code === currentLanguage;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setIsLangDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors text-left ${
                        isSelected
                          ? 'bg-[#EAF3ED] text-[#1B4D3E] font-semibold'
                          : 'hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <div>
                        <span className="font-semibold mr-2">{lang.nativeName}</span>
                        <span className="text-[10px] text-stone-400">({lang.name})</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#1B4D3E]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Button */}
        <div className="relative">
          <button
            onClick={() => {
              setIsAlertsOpen(!isAlertsOpen);
              setIsLangDropdownOpen(false);
              setIsProfileDropdownOpen(false);
            }}
            className="w-8 h-8 rounded-lg bg-white border border-[#E2E8DC] text-stone-600 hover:text-stone-900 hover:border-stone-300 flex items-center justify-center transition-colors relative shadow-2xs"
            title="Active Weather & Risk Notifications"
          >
            <Bell className="w-3.5 h-3.5" />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#C62828] text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                {alerts.length}
              </span>
            )}
          </button>

          {isAlertsOpen && (
            <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-[#E2E8DC] rounded-xl shadow-xl p-3 z-50 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <span className="text-xs font-bold text-stone-900">Active Advisories ({alerts.length})</span>
                <Link
                  href="/alerts"
                  onClick={() => setIsAlertsOpen(false)}
                  className="text-[11px] text-[#1B4D3E] font-semibold hover:underline"
                >
                  View All
                </Link>
              </div>
              <div className="divide-y divide-stone-100 mt-1">
                {alerts.length === 0 ? (
                  <div className="py-4 text-center text-xs text-stone-400">No active risk advisories</div>
                ) : (
                  alerts.slice(0, 4).map((alt) => (
                    <div key={alt.id} className="py-2.5">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle
                          className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                            alt.severity === 'critical' ? 'text-red-600' : 'text-amber-600'
                          }`}
                        />
                        <div className="text-xs">
                          <div className="font-semibold text-stone-900">{alt.title}</div>
                          <div className="text-[11px] text-stone-600 line-clamp-2 mt-0.5">
                            {alt.description}
                          </div>
                          <div className="text-[10px] text-stone-400 mt-1">
                            {new Date(alt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Authenticated User Profile */}
        <div className="relative">
          <button
            onClick={() => {
              setIsProfileDropdownOpen(!isProfileDropdownOpen);
              setIsLangDropdownOpen(false);
              setIsAlertsOpen(false);
            }}
            className="flex items-center space-x-2 p-1 rounded-lg hover:bg-stone-50 transition-colors"
          >
            <div
              className="w-7 h-7 rounded-full overflow-hidden border border-[#CBD5C0] bg-cover bg-center shrink-0"
              style={{
                backgroundImage: "url('/images/hero_banner.jpg')",
                backgroundPosition: '51% 26%',
                backgroundSize: '420%',
              }}
            />
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-stone-900 leading-tight">
                {profile?.fullName || 'Gurpreet Singh'}
              </div>
              <div className="text-[10px] text-stone-500 capitalize">
                {profile?.role?.replace('_', ' ') || 'Farmer'}
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-stone-400 hidden sm:block" />
          </button>

          {isProfileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E2E8DC] rounded-xl shadow-xl p-2 z-50 animate-in fade-in">
              <div className="p-2.5 border-b border-stone-100">
                <div className="text-xs font-bold text-stone-900">{profile?.fullName}</div>
                <div className="text-[11px] text-stone-500">{profile?.phoneNumber}</div>
                <div className="text-[10px] text-[#1B4D3E] font-medium uppercase mt-0.5">
                  Role: {profile?.role?.replace('_', ' ')}
                </div>
              </div>
              <div className="p-1">
                <div className="text-[10px] font-semibold text-stone-400 uppercase px-2 py-1">
                  Switch Test Profile:
                </div>
                {availableProfiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProfileId(p.id);
                      setIsProfileDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded-lg flex items-center justify-between ${
                      p.id === profile?.id
                        ? 'bg-[#EAF3ED] text-[#1B4D3E] font-semibold'
                        : 'hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{p.fullName}</div>
                      <div className="text-[10px] text-stone-400 capitalize">{p.role.replace('_', ' ')}</div>
                    </div>
                    {p.id === profile?.id && <Check className="w-3.5 h-3.5 text-[#1B4D3E]" />}
                  </button>
                ))}
              </div>
              <div className="pt-1 border-t border-stone-100">
                <Link
                  href="/profile"
                  onClick={() => setIsProfileDropdownOpen(false)}
                  className="block px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-50 rounded-lg"
                >
                  Manage Account & Consent →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
