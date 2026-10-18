'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import { INDIAN_LANGUAGES, getTranslation, TranslationDict, LanguageMeta } from '../i18n/languages';

interface AppContextType {
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  langMeta: LanguageMeta;
  t: TranslationDict;
  profile: any;
  setProfileId: (id: string) => void;
  availableProfiles: any[];
  refreshProfile: () => Promise<void>;
  isAIAssistantOpen: boolean;
  setIsAIAssistantOpen: (open: boolean) => void;
  isVoiceModalOpen: boolean;
  setIsVoiceModalOpen: (open: boolean) => void;
  isWhatsAppModalOpen: boolean;
  setIsWhatsAppModalOpen: (open: boolean) => void;
  speakText: (text: string) => void;
  isSpeaking: boolean;
  stopSpeaking: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguageState] = useState<string>('hi');
  const [profile, setProfile] = useState<any>(null);
  const [profileId, setProfileIdState] = useState<string>('usr-farmer-001');
  const [availableProfiles, setAvailableProfiles] = useState<any[]>([]);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Load profile on mount or profileId change
  const refreshProfile = async () => {
    try {
      const [profileRes, usersRes] = await Promise.all([
        api.getProfile(profileId),
        api.getUsers(),
      ]);
      setProfile(profileRes.profile);
      setAvailableProfiles(usersRes.profiles);
      if (profileRes.profile?.preferredLanguage) {
        setCurrentLanguageState(profileRes.profile.preferredLanguage);
      }
    } catch (err) {
      console.warn('[AppContext] Failed to load profile:', err);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, [profileId]);

  const setLanguage = (lang: string) => {
    setCurrentLanguageState(lang);
    if (profile && profile.id) {
      api.updateProfile(profile.id, { preferredLanguage: lang }).catch(() => {});
    }
  };

  const setProfileId = (id: string) => {
    setProfileIdState(id);
  };

  const langMeta = INDIAN_LANGUAGES.find((l) => l.code === currentLanguage) || INDIAN_LANGUAGES[0];
  const t = getTranslation(currentLanguage);

  // Text to Speech
  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#•]/g, ' ');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = langMeta.bcp47;
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        langMeta,
        t,
        profile,
        setProfileId,
        availableProfiles,
        refreshProfile,
        isAIAssistantOpen,
        setIsAIAssistantOpen,
        isVoiceModalOpen,
        setIsVoiceModalOpen,
        isWhatsAppModalOpen,
        setIsWhatsAppModalOpen,
        speakText,
        isSpeaking,
        stopSpeaking,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
