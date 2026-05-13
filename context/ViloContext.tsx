'use client';
import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Language, Item, Message } from '@/lib/types';
import { getUiStrings } from '@/lib/locales';
import { useItems } from '@/hooks/use-items';
import { resumeAudioContext } from '@/lib/gemini';

interface ViloContextType {
  // Localization
  language: Language;
  setLanguage: (lang: Language) => void;
  uiStrings: any;

  // Settings
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  toggleVoice: () => void;
  isHqEnabled: boolean;
  setIsHqEnabled: (enabled: boolean) => void;
  toggleHq: () => void;
  voiceSpeed: number;
  setVoiceSpeed: (speed: number) => void;
  isWakeWordEnabled: boolean;
  setIsWakeWordEnabled: (enabled: boolean) => void;
  toggleWakeWord: () => void;
  standbyTimeout: number;
  setStandbyTimeout: (timeout: number) => void;
  isSupported: boolean;
  setIsSupported: (supported: boolean) => void;

  // Inventory
  items: Item[];
  filteredItems: Item[];
  saveItem: (item: string, location: string, category?: string) => void;
  updateItem: (id: string, item: string, location: string, category?: string) => void;
  deleteItem: (id: string) => void;
  clearItems: () => void;
  findItems: (name: string) => Item[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // UI States
  isDesktop: boolean;
  setIsDesktop: (isDesktop: boolean) => void;
  isSettingsExpanded: boolean;
  setIsSettingsExpanded: (expanded: boolean) => void;
}

const ViloContext = createContext<ViloContextType | undefined>(undefined);

export const ViloProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('su');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isHqEnabled, setIsHqEnabled] = useState(true);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [isWakeWordEnabled, setIsWakeWordEnabled] = useState(false);
  const [standbyTimeout, setStandbyTimeout] = useState(5);
  const [isSupported, setIsSupported] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);

  // Initialize settings from localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedWake = localStorage.getItem('vibelocator_wake');
        if (savedWake !== null) setIsWakeWordEnabled(savedWake === 'true');

        const savedTimeout = localStorage.getItem('vibelocator_standby_timeout');
        if (savedTimeout !== null) setStandbyTimeout(parseFloat(savedTimeout));

        const savedLang = localStorage.getItem('vibelocator_lang');
        if (savedLang) setLanguage(savedLang as Language);

        const savedVoice = localStorage.getItem('vibelocator_voice');
        if (savedVoice !== null) setVoiceEnabled(savedVoice === 'true');

        const savedHq = localStorage.getItem('vibelocator_hq');
        if (savedHq !== null) setIsHqEnabled(savedHq === 'true');

        const savedSpeed = localStorage.getItem('vibelocator_voice_speed');
        if (savedSpeed !== null) setVoiceSpeed(parseFloat(savedSpeed));

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
          setIsSupported(false);
        }
      } catch (e) {
        console.warn("Failed to load settings from localStorage:", e);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Handle desktop resize listener
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const toggleVoice = () => {
    resumeAudioContext();
    setVoiceEnabled(prev => {
      const next = !prev;
      localStorage.setItem('vibelocator_voice', String(next));
      return next;
    });
  };

  const toggleHq = () => {
    resumeAudioContext();
    setIsHqEnabled(prev => {
      const next = !prev;
      localStorage.setItem('vibelocator_hq', String(next));
      return next;
    });
  };

  const toggleWakeWord = () => {
    resumeAudioContext();
    setIsWakeWordEnabled(prev => {
      const next = !prev;
      localStorage.setItem('vibelocator_wake', String(next));
      return next;
    });
  };

  // Inventory logic using existing hook
  const { items, saveItem, updateItem, deleteItem, clearItems, findItems } = useItems();

  const filteredItems = useMemo(() => items.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.category && i.category.toLowerCase().includes(searchQuery.toLowerCase()))
  ), [items, searchQuery]);

  const uiStrings = useMemo(() => getUiStrings(language), [language]);

  const value = {
    language, setLanguage, uiStrings,
    voiceEnabled, setVoiceEnabled, toggleVoice,
    isHqEnabled, setIsHqEnabled, toggleHq,
    voiceSpeed, setVoiceSpeed,
    isWakeWordEnabled, setIsWakeWordEnabled, toggleWakeWord,
    standbyTimeout, setStandbyTimeout,
    isSupported, setIsSupported,
    items, filteredItems, saveItem, updateItem, deleteItem, clearItems, findItems,
    searchQuery, setSearchQuery,
    isDesktop, setIsDesktop,
    isSettingsExpanded, setIsSettingsExpanded
  };

  return <ViloContext.Provider value={value}>{children}</ViloContext.Provider>;
};

export const useVilo = () => {
  const context = useContext(ViloContext);
  if (context === undefined) {
    throw new Error('useVilo must be used within a ViloProvider');
  }
  return context;
};
