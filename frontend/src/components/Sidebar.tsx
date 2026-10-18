'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Sprout,
  Stethoscope,
  CloudSun,
  TrendingUp,
  Map,
  Cpu,
  Sparkles,
  Bell,
  Users,
  Settings,
  PhoneCall,
  MessageSquare,
  Plane,
  ShoppingBag,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';

export default function Sidebar() {
  const pathname = usePathname();
  const { profile, setIsVoiceModalOpen, setIsWhatsAppModalOpen } = useApp();
  const [alertCount, setAlertCount] = useState<number>(0);

  useEffect(() => {
    if (profile?.id) {
      api.getAlerts(profile.id).then((res) => {
        if (res.alerts && Array.isArray(res.alerts)) {
          setAlertCount(res.alerts.length);
        }
      }).catch(() => {});
    }
  }, [profile?.id]);

  // Only routes that actually exist in the application
  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/farms', label: 'Farms & Fields', icon: Sprout },
    { href: '/crop-health', label: 'Crop Health', icon: Stethoscope },
    { href: '/weather', label: 'Weather', icon: CloudSun },
    { href: '/mandi', label: 'Mandi Prices', icon: TrendingUp },
    { href: '/marketplace', label: 'Buy & Sell Crops', icon: ShoppingBag },
    { href: '/field-map', label: 'Field Map', icon: Map },
    { href: '/virtual-drone', label: 'Virtual Drone Scanner', icon: Plane },
    { href: '/devices', label: 'Devices & IoT', icon: Cpu },
    { href: '/ai-assistant', label: 'AI Assistant', icon: Sparkles },
    { href: '/alerts', label: 'Alerts & Risks', icon: Bell, badge: alertCount },
    { href: '/fpo', label: 'FPO Workspace', icon: Users, roleRestricted: 'fpo_coordinator' },
    { href: '/profile', label: 'Profile & Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-[#E2E8DC] flex flex-col justify-between hidden md:flex min-h-screen sticky top-0 z-20 select-none">
      <div className="flex flex-col flex-1">
        {/* Brand Header */}
        <div className="px-5 py-5 border-b border-[#E2E8DC]/60 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-[#EAF3ED] border border-[#CBD5C0]/50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <svg viewBox="0 0 36 36" fill="none" className="w-6 h-6">
                <path
                  d="M18 5C18 5 13 11 13 17C13 19.8 15.2 22 18 22C20.8 22 23 19.8 23 17C23 11 18 5 18 5Z"
                  fill="#1B4D3E"
                />
                <path
                  d="M14 15C14 15 9 17 8 22C7.5 24.5 9.5 26.5 12 26C15 25.5 17 22 17 22"
                  fill="#2E7D32"
                />
                <path
                  d="M22 15C22 15 27 17 28 22C28.5 24.5 26.5 26.5 24 26C21 25.5 19 22 19 22"
                  fill="#D9822B"
                />
                <path
                  d="M18 22V30"
                  stroke="#1B4D3E"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <div className="font-bold text-base text-stone-900 leading-tight tracking-tight">
                KrishakDrishti
              </div>
              <div className="text-[11px] text-[#1B4D3E] font-medium tracking-wide">
                कृषक दृष्टि
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#EAF3ED] text-[#1B4D3E] font-semibold border border-[#CBD5C0]/40'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#1B4D3E] stroke-[2]' : 'text-stone-400 stroke-[1.75]'
                  }`}
                />
                <span className="truncate flex-1">{item.label}</span>

                {/* Subtle Alert Badge */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-[#1B4D3E] text-white'
                        : 'bg-red-50 text-[#C62828] border border-red-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* FPO Role Badge */}
                {item.roleRestricted && (
                  <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-semibold uppercase">
                    FPO
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer Area */}
      <div className="p-3 border-t border-[#E2E8DC]/60 space-y-2.5 bg-stone-50/40">
        {/* Multi-channel triggers */}
        <div className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 px-1">
          Support Channels
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-[11px] font-medium bg-white text-stone-700 hover:text-[#1B4D3E] hover:border-[#1B4D3E]/40 border border-[#E2E8DC] transition-colors shadow-xs"
            title="Multilingual Voice IVR Simulator"
          >
            <PhoneCall className="w-3 h-3 text-[#1B4D3E]" />
            <span>Voice IVR</span>
          </button>
          <button
            onClick={() => setIsWhatsAppModalOpen(true)}
            className="flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-[11px] font-medium bg-white text-stone-700 hover:text-[#1C7C82] hover:border-[#1C7C82]/40 border border-[#E2E8DC] transition-colors shadow-xs"
            title="WhatsApp Bot Assistant"
          >
            <MessageSquare className="w-3 h-3 text-[#1C7C82]" />
            <span>WhatsApp</span>
          </button>
        </div>

        {/* Authenticated User Status */}
        <div className="pt-2 border-t border-[#E2E8DC]/60 flex items-center space-x-2.5 px-1">
          <div
            className="w-7 h-7 rounded-full overflow-hidden border border-[#CBD5C0] bg-cover bg-center shrink-0"
            style={{
              backgroundImage: "url('/images/hero_banner.jpg')",
              backgroundPosition: '51% 26%',
              backgroundSize: '420%',
            }}
          />
          <div className="truncate text-xs">
            <div className="font-semibold text-stone-900 truncate">
              {profile?.fullName || 'Gurpreet Singh'}
            </div>
            <div className="text-[10px] text-stone-500 capitalize">
              {profile?.role?.replace('_', ' ') || 'Farmer'} • Sidhwan Bet
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
