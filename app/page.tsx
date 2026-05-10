'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Search, Loader2, Trash2, History, Volume2, VolumeX, Ear, EarOff, ChevronDown, Send, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MicButton } from '@/components/MicButton';
import { ItemList } from '@/components/ItemList';
import { ViloAvatar } from '@/components/ViloAvatar';
import { useItems } from '@/hooks/use-items';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { processVoiceInput, generateSpeech, playAudioFromBase64 } from '@/lib/gemini';
import { Language, Message } from '@/lib/types';
import { Languages } from 'lucide-react';

export default function Home() {
  const { items, saveItem, updateItem, deleteItem, clearItems, findItem, findItems } = useItems();
  const { isListening, isWakeWordMode, transcript, interimTranscript, startListening, stopListening, setTranscript } = useSpeechRecognition();
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'error'>('idle');
  const [isWakeWordEnabled, setIsWakeWordEnabled] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [standbyTimeout, setStandbyTimeout] = useState(5); // Default 5 minutes
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguage] = useState<Language>('su');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [manualText, setManualText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [chatScrollState, setChatScrollState] = useState({ top: false, bottom: false });
  const [currentThinkingMessage, setCurrentThinkingMessage] = useState('');
  
  const clearHistoryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clearAllTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (clearHistoryTimeoutRef.current) clearTimeout(clearHistoryTimeoutRef.current);
      if (clearAllTimeoutRef.current) clearTimeout(clearAllTimeoutRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // const placeholderRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const avatarState: 'idle' | 'listening' | 'processing' | 'confirming' | 'error' = processingStatus === 'processing' 
    ? 'processing' 
    : (processingStatus === 'error' ? 'error' : (isListening && !isWakeWordMode ? 'listening' : 'idle'));
  
  useEffect(() => {
    if (processingStatus === 'processing') {
      const messages = {
        en: ["Thinking...", "Locating...", "Processing...", "Searching database...", "Analyzing..."],
        id: ["Berpikir...", "Mencari lokasi...", "Memproses...", "Mencari di database...", "Menganalisa..."],
        su: ["Nuju mikir...", "Nyiar lokasi...", "Nuju ngaprosés...", "Nyiar dina database...", "Nganalisa..."]
      };
      const langMsgs = messages[language] || messages.en;
      setTimeout(() => setCurrentThinkingMessage(langMsgs[0]), 0);
      const interval = setInterval(() => {
        const randomMsg = langMsgs[Math.floor(Math.random() * langMsgs.length)];
        setCurrentThinkingMessage(randomMsg);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [processingStatus, language]);
  
  const lastProcessedTranscript = useRef('');
  const scrollRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/purity
  const lastActivityRef = useRef<number>(Date.now());

  const saveMessages = (msgs: Message[]) => {
    setMessages(msgs);
    localStorage.setItem('vibelocator_messages', JSON.stringify(msgs));
    lastActivityRef.current = Date.now();
  };

  useEffect(() => {
    const savedVoice = localStorage.getItem('vibelocator_voice');
    if (savedVoice !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVoiceEnabled(savedVoice === 'true');
    }
  }, []);

  const toggleVoice = () => {
    const newVal = !voiceEnabled;
    setVoiceEnabled(newVal);
    localStorage.setItem('vibelocator_voice', String(newVal));
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setChatScrollState({
        top: scrollRef.current.scrollHeight > scrollRef.current.clientHeight,
        bottom: false
      });
    }
  }, [messages, isListening, transcript, interimTranscript, isTyping, isWakingUp]);

  useEffect(() => {
    if (isListening && !isWakeWordMode && (transcript || interimTranscript)) {
      if (inputContainerRef.current) {
        inputContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [isListening, isWakeWordMode, transcript, interimTranscript]);

  useEffect(() => {
    const savedWake = localStorage.getItem('vibelocator_wake');
    if (savedWake !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsWakeWordEnabled(savedWake === 'true');
    }

    const savedTimeout = localStorage.getItem('vibelocator_standby_timeout');
    if (savedTimeout !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStandbyTimeout(parseFloat(savedTimeout));
    }
  }, []);

  const toggleWakeWord = () => {
    const newVal = !isWakeWordEnabled;
    setIsWakeWordEnabled(newVal);
    localStorage.setItem('vibelocator_wake', String(newVal));
    lastActivityRef.current = Date.now();
    if (!newVal) {
      stopListening();
    }
  };

  const getSTTLanguageCode = (lang: Language) => {
    if (lang === 'su') return 'su-ID'; 
    if (lang === 'id') return 'id-ID';
    return 'en-US';
  };

  useEffect(() => {
    // Check for inactivity every minute
    const interval = setInterval(() => {
      if (isWakeWordEnabled) {
        const inactiveMs = Date.now() - lastActivityRef.current;
        if (inactiveMs > standbyTimeout * 60 * 1000) { 
          setIsWakeWordEnabled(false);
          localStorage.setItem('vibelocator_wake', 'false');
          stopListening();
          
          const msg: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: (language === 'su' 
              ? `Mode siaga dipareumkeun margi ${standbyTimeout < 1 ? '30 detik' : standbyTimeout + ' menit'} teu aya aktivitas.` 
              : language === 'id' 
              ? `Mode siaga dinonaktifkan karena ${standbyTimeout < 1 ? '30 detik' : standbyTimeout + ' menit'} tidak ada aktivitas.` 
              : `Standby mode turned off due to ${standbyTimeout < 1 ? '30s' : standbyTimeout + 'm'} inactivity.`),
            timestamp: Date.now(),
            isSystem: true
          };
          saveMessages([...messages, msg]);
        }
      }
    }, 30000); // Check every 30s for better accuracy
    return () => clearInterval(interval);
  }, [isWakeWordEnabled, language, messages, standbyTimeout, stopListening]);

  useEffect(() => {
    // If wake word is enabled and we are not doing anything, start wake word listening
    if (isWakeWordEnabled && !isListening && processingStatus !== 'processing' && !isTyping) {
      const timer = setTimeout(() => {
        startListening(getSTTLanguageCode(language), true, () => {
          setIsWakingUp(true);
          setTimeout(() => setIsWakingUp(false), 1000);
          // Wake word detected! Larger delay to avoid capturing the trigger word itself
          setTimeout(() => {
            if (isWakeWordEnabled) {
              startListening(getSTTLanguageCode(language));
            }
          }, 1200);
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isWakeWordEnabled, isListening, processingStatus, language, startListening, isTyping]);

  useEffect(() => {
    const savedMessages = localStorage.getItem('vibelocator_messages');
    if (savedMessages) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  useEffect(() => {
    const savedLang = localStorage.getItem('vibelocator_lang') as Language;
    if (savedLang) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLanguage(savedLang);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsExpanded(false);
      }
    };

    if (isSettingsExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsExpanded]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChatScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setChatScrollState({
      top: scrollTop > 0,
      bottom: Math.ceil(scrollTop + clientHeight) < scrollHeight
    });
  }, []);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('vibelocator_lang', lang);
  };

  const handleInput = useCallback(async (textOverride?: string) => {
    lastActivityRef.current = Date.now();
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      setIsTyping(false);
    }

    const textToProcess = (textOverride || manualText).trim();
    if (!textToProcess || processingStatus === 'processing') return;
    
    setManualText('');
    const textarea = document.getElementById('manual-input') as HTMLTextAreaElement;
    if (textarea) textarea.style.height = 'auto';
    
    // Add user message to history
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: textToProcess,
      timestamp: Date.now()
    };
    
    const newMessages = [...messages, userMsg];
    saveMessages(newMessages);
    
    setProcessingStatus('processing');
    
    try {
      const result = await processVoiceInput(textToProcess, items, language);
      
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.message,
        timestamp: Date.now()
      };
      
      saveMessages([...newMessages, assistantMsg]);
      
      if (result.action === 'SAVE') {
        saveItem(result.item, result.location, result.category);
      } else if (result.action === 'UPDATE') {
        const idsToUpdate = result.target_ids && result.target_ids.length > 0 
          ? result.target_ids 
          : findItems(result.item).map((i: any) => i.id);
          
        if (idsToUpdate.length > 0) {
          idsToUpdate.forEach((id: string) => updateItem(id, result.item, result.location, result.category));
        } else {
          // If not found, just save it
          saveItem(result.item, result.location, result.category);
        }
      } else if (result.action === 'DELETE') {
        const idsToDelete = result.target_ids && result.target_ids.length > 0 
          ? result.target_ids 
          : findItems(result.item).map(i => i.id);
          
        if (idsToDelete.length > 0) {
          idsToDelete.forEach(id => deleteItem(id));
        }
      }

      if (voiceEnabled) {
        const audioBase64 = await generateSpeech(result.message);
        if (audioBase64) {
          playAudioFromBase64(audioBase64);
        }
      }
      lastActivityRef.current = Date.now();
    } catch (error) {
      console.error("Error processing input:", error);
      let errorMsg = language === 'su' ? "Punten, aya masalah sakedap pas ngolah datana." : 
                      (language === 'id' ? "Maaf, ada masalah saat memproses permintaan Kakak." : 
                      "Sorry, something went wrong processing your request.");
                      
      if ((error instanceof Error && error.message.includes('429')) || (error as any)?.status === 429 || (error as any)?.message?.includes('429')) {
        errorMsg = language === 'su' ? "Punten pisan, kuota AI nuju seep. Mangga ditaros deui engké." :
                   (language === 'id' ? "Maaf ya, kuota AI sedang habis. Silakan coba lagi nanti." :
                   "Sorry, the AI quota is currently exceeded. Please try again later.");
      }

      
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: errorMsg,
        timestamp: Date.now(),
        isSystem: true
      };
      saveMessages([...newMessages, assistantMsg]);
    } finally {
      if (processingStatus !== 'error') setProcessingStatus('idle');
      setTranscript('');
    }
  }, [items, processingStatus, saveItem, deleteItem, updateItem, findItems, setTranscript, language, manualText, messages, voiceEnabled]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInput();
    }
  };

  // Process transcript when user stops speaking
  useEffect(() => {
    if (!isListening && transcript && transcript !== lastProcessedTranscript.current && !isWakeWordMode) {
      lastProcessedTranscript.current = transcript;
      handleInput(transcript);
    }
  }, [isListening, transcript, handleInput, isWakeWordMode]);

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    i.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.category && i.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const clearHistory = () => {
    saveMessages([]);
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const uiStrings = {
    su: { 
      title: "VibeLocator", 
      subtitle: "\"Poho disimpen dimana? Kalem bae... ViLo siap nambihan ingetan.\"", 
      placeholder: "Milari naon yeuh?", 
      listTitle: "Barang nu tos 'Stored'", 
      empty: "Kosong keneh yeuh. Pencet Mic geura!",
      historyEmpty: "Teu acan aya obrolan, Kang.",
      clearItems: "Reset Sadaya Barang",
      clearHistory: "Hapus Chat History",
      historyTitle: "Log Obrolan",
      confirmClear: "Leres bade di-clear sadayana?",
      voiceOn: "Mode Sora: ON",
      voiceOff: "Mode Sora: OFF",
      alwaysOnMode: "Always On (Siga ViLo)",
      alwaysOnOff: "Always On: PAEH",
      standbyLabel: "Standby:",
      standbyIndicator: "ViLo Standby: Saurkeun \"Hey ViLo\"",
      smuTag: "Memori Semantik",
      youName: "Anjeun",
      listening: "Nuju Ngupingkeun...",
      thinking: "Nuju Mikir...",
      manualPlaceholder: "Ketik di dieu bilih hoream nyarios...",
      sendBtn: "Gas!",
      allBtn: "Sadayana",
      footerThanks: "Hatur Nuhun!",
      scrollToTop: "Ka Luhur"
    },
    id: { 
      title: "VibeLocator", 
      subtitle: "\"Lupa naruh dimana? Chill aja, Kak... ViLo back-up ingatanmu.\"", 
      placeholder: "Lagi nyari apa, Kak?", 
      listTitle: "Koleksi Barang Kamu", 
      empty: "Masih kosong melompong nih, Kak.",
      historyEmpty: "Belum ada riwayat obrolan nih, Kak.",
      clearItems: "Wipe Out Semua Barang",
      clearHistory: "Hapus Chat History",
      historyTitle: "Riwayat Chat",
      confirmClear: "Serius mau dihapus semua, Kak? No regret?",
      voiceOn: "Voice Response: ON",
      voiceOff: "Voice Response: OFF",
      alwaysOnMode: "Always On Mode (Non-stop)",
      alwaysOnOff: "Always On: OFF",
      standbyLabel: "Status:",
      standbyIndicator: "ViLo Standby: Panggil \"Hey ViLo\"",
      smuTag: "Semantic Memory Unit",
      youName: "Kamu",
      listening: "Lagi Dengerin...",
      thinking: "Lagi Loading...",
      manualPlaceholder: "Tulis di sini kalo lagi mager ngomong...",
      sendBtn: "Kirim",
      allBtn: "All",
      footerThanks: "Thank You, Kak!",
      scrollToTop: "Ke Atas"
    },
    en: { 
      title: "VibeLocator", 
      subtitle: "\"Lost your stuff? Chill... ViLo's got your back, Champ.\"", 
      placeholder: "What are we looking for?", 
      listTitle: "Your Stored Vibes", 
      empty: "Nothing here yet. Try the Mic!",
      historyEmpty: "No chat history yet. Say hi!",
      clearItems: "Clear All Records",
      clearHistory: "Clear Chat History",
      historyTitle: "Chat History",
      confirmClear: "Sure you want to wipe everything?",
      voiceOn: "Voice: ON",
      voiceOff: "Voice: OFF",
      alwaysOnMode: "Always On (Active)",
      alwaysOnOff: "Always On: OFF",
      standbyLabel: "Standby:",
      standbyIndicator: "ViLo Standby: Say \"Hey ViLo\"",
      smuTag: "Semantic Memory Unit",
      youName: "You",
      listening: "Listening...",
      thinking: "Processing...",
      manualPlaceholder: "Type here if you're feeling shy...",
      sendBtn: "Send",
      allBtn: "All",
      footerThanks: "Cheers!",
      scrollToTop: "Top"
    }
  }[language];

  return (
    <div className="flex flex-col min-h-screen">
      <header className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-300 ${isScrolled ? 'bg-gradient-to-b from-slate-950/80 to-transparent backdrop-blur-xl shadow-lg shadow-black/20' : 'bg-transparent'}`}>
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
             <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-slate-100 flex items-center gap-3 md:gap-4">
                <ViloAvatar state={avatarState} />
                <span>
                  <span className="text-emerald-400">Vi</span><span className="text-white">be</span><span className="text-emerald-400">Lo</span><span className="text-white">cator.</span>
                </span>
             </h1>
         </div>
      </header>
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[90px] pb-6 md:pb-10 relative w-full">
         
         {/* SMU + Tagline */}
         <div className="flex flex-col gap-2 mb-4">
            <motion.div
               initial={{ opacity: 0, y: -10 }}
               animate={{ opacity: 1, y: 0 }}
               className="inline-block px-4 py-1 rounded-full bg-emerald-400/10 text-emerald-400 text-xs font-bold tracking-widest uppercase self-start"
            >
              {uiStrings.smuTag}
            </motion.div>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              className="text-sm md:text-base text-slate-400 max-w-md"
            >
              {uiStrings.subtitle}
            </motion.p>
         </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-stretch">
        
        {/* Left Column: Interaction */}
        <div className="lg:col-span-5 w-full z-10 relative">
          {/* Wrapper for sticky positioning on desktop layout */}
          <div className="flex flex-col gap-2 lg:sticky lg:top-24 lg:h-[calc(100vh-120px)]">
          {/* Header & Settings */}
          <div className="flex flex-col gap-1 relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 w-full">
              <div className="flex flex-col gap-4 w-full z-20" ref={settingsRef}>
                <div className="flex items-center justify-between w-full md:w-full gap-2" suppressHydrationWarning>
                  <div className="glass rounded-2xl p-1 flex items-center justify-between gap-1 flex-1 md:flex-none custom-scrollbar overflow-x-auto">
                    <Languages className="w-4 h-4 ml-2 mr-1 text-slate-400 shrink-0" />
                    <button 
                      onClick={() => handleLanguageChange('su')}
                      className={`px-3 py-1.5 flex-1 md:flex-none rounded-xl text-[10px] sm:text-xs font-bold transition-all shrink-0 ${language === 'su' ? 'bg-emerald-400 text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Sunda
                    </button>
                    <button 
                      onClick={() => handleLanguageChange('id')}
                      className={`px-3 py-1.5 flex-1 md:flex-none rounded-xl text-[10px] sm:text-xs font-bold transition-all shrink-0 ${language === 'id' ? 'bg-emerald-400 text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Indonesia
                    </button>
                    <button 
                      onClick={() => handleLanguageChange('en')}
                      className={`px-3 py-1.5 flex-1 md:flex-none rounded-xl text-[10px] sm:text-xs font-bold transition-all shrink-0 ${language === 'en' ? 'bg-emerald-400 text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      English
                    </button>
                  </div>
                  <button
                    onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
                    className="glass p-2 sm:p-2.5 rounded-2xl text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/5 transition-all shrink-0 aspect-square"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${isSettingsExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                <AnimatePresence>
                  {isSettingsExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-col gap-4 overflow-hidden absolute top-full right-0 mt-2 w-full md:w-64 z-50 glass p-4 rounded-3xl shadow-2xl"
                    >
                      <button
                        onClick={toggleVoice}
                        className={`p-1 px-4 py-2.5 rounded-2xl border border-white/5 flex items-center justify-between gap-3 transition-all ${
                          voiceEnabled ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' : 'bg-slate-900/50 text-slate-500'
                        }`}
                        title={language === 'en' ? 'Toggle AI Voice' : (language === 'id' ? 'Aktifkan Suara AI' : 'Hurungkeun Sora AI')}
                      >
                        <div className="flex items-center gap-2">
                          {voiceEnabled ? <Volume2 className="w-4 h-4 shrink-0" /> : <VolumeX className="w-4 h-4 shrink-0" />}
                          <span className="text-[10px] font-bold uppercase tracking-wider text-left">
                            {voiceEnabled ? uiStrings.voiceOn : uiStrings.voiceOff}
                          </span>
                        </div>
                        <div className={`w-8 h-4 rounded-full relative transition-all shrink-0 ${voiceEnabled ? 'bg-emerald-400/30' : 'bg-slate-800'}`}>
                          <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${voiceEnabled ? 'right-0.5 bg-emerald-400' : 'left-0.5 bg-slate-600'}`} />
                        </div>
                      </button>

                      <button
                        onClick={toggleWakeWord}
                        className={`p-1 px-4 py-2.5 rounded-2xl border border-white/5 flex items-center justify-between gap-3 transition-all ${
                          isWakeWordEnabled ? 'bg-blue-400/10 text-blue-400 border-blue-400/20' : 'bg-slate-900/50 text-slate-500'
                        }`}
                        title={language === 'en' ? 'Always Listening (Hey ViLo)' : (language === 'id' ? 'Selalu Mendengarkan (Hey ViLo)' : 'Nguping Tuluy (Hey ViLo)')}
                      >
                        <div className="flex items-center gap-2">
                          {isWakeWordEnabled ? <Ear className="w-4 h-4 shrink-0" /> : <EarOff className="w-4 h-4 shrink-0" />}
                          <span className="text-[10px] font-bold uppercase tracking-wider text-left">
                            {isWakeWordEnabled ? uiStrings.alwaysOnMode : uiStrings.alwaysOnOff}
                          </span>
                        </div>
                        <div className={`w-8 h-4 rounded-full relative transition-all shrink-0 ${isWakeWordEnabled ? 'bg-blue-400/30' : 'bg-slate-800'}`}>
                          <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${isWakeWordEnabled ? 'right-0.5 bg-blue-400' : 'left-0.5 bg-slate-600'}`} />
                        </div>
                      </button>

                      {isWakeWordEnabled && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="glass rounded-xl p-2 flex items-center justify-between gap-2"
                        >
                          <span className="text-[9px] uppercase font-bold text-slate-500 ml-2">{uiStrings.standbyLabel}</span>
                          <div className="flex gap-1 flex-wrap justify-end">
                            {[0.5, 1, 2, 5].map((val) => (
                              <button
                                key={val}
                                onClick={() => {
                                  setStandbyTimeout(val);
                                  localStorage.setItem('vibelocator_standby_timeout', String(val));
                                  lastActivityRef.current = Date.now();
                                }}
                                className={`px-2 md:px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                  standbyTimeout === val 
                                    ? 'bg-blue-400 text-slate-900' 
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                }`}
                              >
                                {val < 1 ? '30s' : `${val}m`}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Conversation Thread */}
          <div className="flex flex-col gap-2 w-full lg:flex-1 min-h-0">
            <div className="flex justify-between items-center px-1 shrink-0">
               <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <History className="w-3 h-3" />
                {uiStrings.historyTitle}
              </h3>
              {messages.length > 0 && (
                <button 
                  onClick={() => {
                    if (confirmClearHistory) {
                      clearHistory();
                      setConfirmClearHistory(false);
                    } else {
                      setConfirmClearHistory(true);
                      if (clearHistoryTimeoutRef.current) clearTimeout(clearHistoryTimeoutRef.current);
                      clearHistoryTimeoutRef.current = setTimeout(() => setConfirmClearHistory(false), 3000);
                    }
                  }}
                  className={`text-[10px] font-bold uppercase tracking-tighter transition-all flex items-center gap-1 ml-auto ${confirmClearHistory ? 'text-slate-900 bg-red-400 px-3 py-1.5 rounded-lg border-2 border-red-400' : 'text-slate-600 hover:text-red-400'}`}
                >
                  {confirmClearHistory ? (language === 'en' ? 'Sure?' : (language === 'id' ? 'Yakin?' : 'Leres?')) : (
                     <>
                       <Trash2 className="w-3 h-3" />
                       {uiStrings.clearHistory}
                     </>
                  )}
                </button>
              )}
            </div>

            <div className="relative rounded-xl overflow-hidden bg-slate-900/20 backdrop-blur-md flex flex-col h-[65vh] md:h-[75vh] lg:h-auto lg:flex-1 min-h-[300px] border border-white/5 shadow-xl">
              <div 
                ref={scrollRef}
                onScroll={handleChatScroll}
                className={`flex-1 overflow-y-auto px-2 pt-4 flex flex-col gap-4 custom-scrollbar ${isListening && !isWakeWordMode || isTyping ? 'pb-24' : 'pb-24'}`}
                suppressHydrationWarning
              >
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-50 relative mt-4">
                  <History className="w-10 h-10 text-slate-500 mb-3" />
                  <p className="text-slate-400 text-xs font-bold">{uiStrings.historyEmpty}</p>
                </div>
              )}
          <AnimatePresence mode="popLayout">
            {messages.map((msg, index) => {
              const isAssistant = msg.role === 'assistant';
              const isFirst = isAssistant && (index === 0 || messages[index - 1].role !== 'assistant');
              const isLast = isAssistant && (index === messages.length - 1 || messages[index + 1].role !== 'assistant');
              const isStandalone = isAssistant && isFirst && isLast;

              return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'user' ? (
                  <div className="bg-emerald-400 text-slate-900 py-2 px-4 rounded-2xl rounded-tr-none shadow-xl shadow-emerald-400/10 max-w-[85%] flex flex-col items-end">
                    <div className="w-full text-left">
                      <p className="text-[9px] uppercase font-bold opacity-50 mb-0.5 tracking-widest">
                        <span>{uiStrings.youName}</span>
                      </p>
                      <p className="text-sm font-bold leading-snug whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                    </div>
                    <span className="text-[8px] font-bold opacity-40 uppercase pt-1 -mb-1">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                ) : (
                  <div className={`flex items-start gap-1 ${!isFirst ? '-mt-[11px]' : 'mt-4'}`}>
                    <div className={`scale-[0.45] ml-0 origin-top-left shrink-0 w-8 ${!isFirst ? 'invisible h-[10px]' : '-mt-1'}`}>
                      <ViloAvatar state="idle" />
                    </div>
                    <div className={`glass py-2 px-3 border shadow-xl flex flex-col ${
                        isStandalone ? 'w-fit max-w-[80%] sm:max-w-[80%] rounded-2xl rounded-tl-none' :
                        isFirst ? 'w-full max-w-[75%] sm:max-w-[288px] rounded-tr-2xl rounded-tl-none' :
                        isLast ? 'w-full max-w-[75%] sm:max-w-[288px] rounded-br-2xl rounded-bl-2xl rounded-tr-none rounded-tl-none' :
                        'w-full max-w-[75%] sm:max-w-[288px] rounded-none rounded-tr-none rounded-tl-none'
                    } ${msg.isSystem ? 'border-white/5 shadow-white/5 opacity-70 bg-slate-900/40' : 'border-emerald-400/10 shadow-emerald-500/5'}`}>
                        <div className="flex-1 min-w-0 pr-1 mt-0 flex flex-col">
                          {isFirst && (
                            <p className={`text-[9px] mb-0.5 uppercase tracking-widest font-extrabold flex justify-between items-center ${msg.isSystem ? 'text-slate-500' : 'text-emerald-400 opacity-90'}`}>
                              ViLo AI
                            </p>
                          )}
                          <p className={`whitespace-pre-wrap break-words ${msg.isSystem ? 'text-xs text-slate-400 italic leading-relaxed' : 'text-sm text-slate-200 leading-relaxed font-medium'}`}>
                            {msg.content}
                          </p>
                          <span className={`text-[8px] font-bold text-slate-500 uppercase self-end pt-1 -mb-1 ${msg.isSystem ? 'opacity-50' : ''}`}>
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                    </div>
                  </div>
                )}
              </motion.div>
              );
            })}

            {(isTyping || (isListening && !isWakeWordMode)) && (
               <motion.div
                key="user-activity-bubble"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="flex justify-end"
              >
                <div className="bg-emerald-400/30 text-slate-200 py-2 px-4 rounded-2xl rounded-tr-none border border-emerald-400/20 max-w-[85%] relative group flex flex-col gap-1 min-w-[120px]">
                  <p className="text-[9px] uppercase font-bold opacity-50 tracking-widest flex justify-between items-center text-emerald-400">
                    <span>{uiStrings.youName}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {isTyping ? (
                      <div className="flex gap-1 items-center justify-center h-4 w-[24px]">
                         <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                         <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                         <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                      </div>
                    ) : (
                      <div className="flex gap-1 items-center justify-center h-4 w-[24px]">
                         <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-emerald-400 rounded-full" />
                         <motion.div animate={{ height: [8, 16, 8] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.1 }} className="w-1 bg-emerald-400 rounded-full" />
                         <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1 bg-emerald-400 rounded-full" />
                      </div>
                    )}
                    <span className="text-sm font-bold opacity-80 uppercase tracking-widest">
                      {isTyping 
                        ? (language === 'en' ? 'Typing...' : language === 'id' ? 'Mengetik...' : 'Ngetik...')
                        : (language === 'en' ? 'Talking...' : language === 'id' ? 'Bicara...' : 'Ngomong...')}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {processingStatus === 'processing' && (
              <motion.div
                key="processing-loader"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex justify-start"
              >
                <div className="glass py-2 px-3 rounded-2xl rounded-tl-none flex items-center gap-3">
                   <div className="flex gap-1 items-center justify-center h-4 w-[24px]">
                       <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                       <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                       <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    </div>
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                    {currentThinkingMessage}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
          
          <div className={`absolute top-0 left-0 right-0 h-6 pointer-events-none transition-opacity duration-300 ${chatScrollState.top ? 'opacity-100' : 'opacity-0'}`} style={{ background: 'linear-gradient(to bottom, rgba(52, 211, 153, 0.1), transparent)', borderTop: '1px solid rgba(52, 211, 153, 0.2)' }} />
          <div className={`absolute bottom-0 left-0 right-0 h-6 pointer-events-none transition-opacity duration-300 ${chatScrollState.bottom ? 'opacity-100' : 'opacity-0'}`} style={{ background: 'linear-gradient(to top, rgba(52, 211, 153, 0.1), transparent)', borderBottom: '1px solid rgba(52, 211, 153, 0.2)' }} />
          
          {/* Input Area Inside Chat Container */}
          <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent">
            <div ref={inputContainerRef} className="relative glass rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-emerald-400/50 transition-all border border-white/5 shadow-xl min-h-[56px] bg-slate-900/60 backdrop-blur-xl">
              {isListening && !isWakeWordMode && (transcript || interimTranscript) ? (
                <div 
                  className="w-full bg-transparent p-3 md:p-4 pr-12 md:pr-14 text-sm md:text-base mt-1 min-h-[56px] max-h-[120px] overflow-y-auto custom-scrollbar flex items-center flex-wrap"
                  id="listening-display"
                >
                  <span className="text-white font-medium">{transcript}</span>
                  {interimTranscript && (
                     <motion.span 
                       animate={{ opacity: [0.4, 0.7, 0.4] }} 
                       transition={{ repeat: Infinity, duration: 1.5 }}
                       className="text-white ml-1 italic"
                     >
                       {interimTranscript}
                     </motion.span>
                  )}
                  <motion.span 
                    animate={{ opacity: [1, 0, 1] }} 
                    transition={{ repeat: Infinity, duration: 0.8 }} 
                    className="inline text-emerald-400 font-bold ml-1" 
                  >
                    _
                  </motion.span>
                </div>
              ) : (
                <textarea
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                    }
                  }}
                  value={manualText}
                  onChange={(e) => {
                    if (isListening) {
                      stopListening();
                    }
                    setManualText(e.target.value);
                    lastActivityRef.current = Date.now();
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;

                    setIsTyping(true);
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

                    // Notifikasi hanya muncul jika mulai mengetik DAN sedang dalam mode siaga (WakeWordEnabled)
                    if (!isTyping && isWakeWordEnabled) {
                      const msgText = language === 'su' ? "Mode siaga dipareumkeun kusabab nuju ngetik." : 
                                      (language === 'id' ? "Mode siaga dinonaktifkan karena ada aktivitas mengetik." : "Standby mode disabled due to typing activity.");
                      const systemMsg: any = {
                          id: crypto.randomUUID(),
                          role: 'assistant',
                          content: msgText,
                          timestamp: Date.now(),
                          isSystem: true
                      };
                      saveMessages([...messages, systemMsg]);
                    }

                    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening && !isWakeWordMode ? "Nguping..." : uiStrings.manualPlaceholder}
                  className={`w-full bg-transparent p-3 md:p-4 pr-12 md:pr-14 text-sm md:text-base text-slate-100 placeholder:text-slate-600 resize-none outline-none block mt-1 ${isListening && !isWakeWordMode ? 'hidden' : ''}`}
                  rows={1}
                  id="manual-input"
                />
              )}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                 <button
                  onClick={() => {
                    if (isListening) {
                      stopListening();
                    } else {
                      handleInput();
                    }
                  }}
                  disabled={(isListening ? false : !manualText) || processingStatus === 'processing'}
                  className={`w-8 h-8 rounded-md flex items-center justify-center transition-all shrink-0 ${
                    (isListening || manualText) && processingStatus !== 'processing' 
                      ? 'bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-400/20 hover:scale-105' 
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                  id="send-button"
                  title={isListening ? uiStrings.listening : uiStrings.sendBtn}
                >
                  {processingStatus === 'processing' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-900" />
                  ) : (isListening ? (
                    <Mic className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4 -ml-0.5" />
                  ))}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Action Center Mic (Desktop) */}
        <div className="hidden lg:flex w-full mt-2 mb-2 justify-center shrink-0">
          <MicButton 
            isListening={isListening && !isWakeWordMode} 
            onStart={() => {
              if (isWakeWordMode) stopListening();
              startListening(getSTTLanguageCode(language));
            }} 
            onStop={stopListening}
            isLoading={processingStatus === 'processing'}
            language={language}
            isStandby={isWakeWordMode}
          />
        </div>
      </div>
      </div>

      {/* Mobile Sticky Mic Button */}
      <div className="lg:hidden sticky bottom-4 z-40 pointer-events-none flex flex-col items-center justify-center w-full mb-2 gap-1">
        <div className="pointer-events-auto flex items-center justify-center shrink-0">
          <MicButton 
            isListening={isListening && !isWakeWordMode} 
            onStart={() => {
              if (isWakeWordMode) stopListening();
              startListening(getSTTLanguageCode(language));
            }} 
            onStop={stopListening}
            isLoading={processingStatus === 'processing'}
            language={language}
            compact
            isStandby={isWakeWordMode}
          />
        </div>
      </div>

      {/* Right Column: Search & List */}
      <div className="lg:col-span-7 flex flex-col gap-3 lg:gap-4 w-full mt-2 lg:mt-0 lg:pl-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mt-2 lg:mt-0">
          <div className="flex items-center gap-2 px-1">
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Search className="w-3 h-3" />
              {uiStrings.listTitle}
            </h3>
          </div>
          <div className="relative w-full md:w-80 shrink-0 flex items-center gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text"
                placeholder={uiStrings.placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-emerald-400/50 transition-all text-slate-200"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  lastActivityRef.current = Date.now();
                }}
                id="search-input"
              />
            </div>
            {items.length > 0 && (
              <button 
                onClick={() => {
                  if (confirmClearAll) {
                    clearItems();
                    setConfirmClearAll(false);
                  } else {
                    setConfirmClearAll(true);
                    if (clearAllTimeoutRef.current) clearTimeout(clearAllTimeoutRef.current);
                    clearAllTimeoutRef.current = setTimeout(() => setConfirmClearAll(false), 3000);
                  }
                }}
                className={`p-3 transition-all rounded-2xl flex items-center justify-center shrink-0 border border-white/5 ${confirmClearAll ? 'bg-red-400 text-slate-900 font-bold text-[10px] px-3 uppercase tracking-widest' : 'bg-white/5 text-slate-600 hover:text-red-400 hover:bg-red-400/10'}`}
                title={uiStrings.clearItems}
              >
                {confirmClearAll ? (language === 'en' ? 'Sure?' : (language === 'id' ? 'Yakin?' : 'Leres?')) : <Trash2 className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {items.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1 overflow-x-auto pb-2 custom-scrollbar mask-gradient-right">
            <button 
              onClick={() => setSearchQuery('')}
              className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${!searchQuery ? 'bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-400/20' : 'bg-white/5 text-slate-500 hover:text-slate-300 border border-white/5'}`}
            >
              {uiStrings.allBtn}
            </button>
            {Array.from(new Set(items.map(i => i.category).filter(Boolean))).map(cat => (
              <button 
                key={cat}
                onClick={() => setSearchQuery(cat)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${searchQuery === cat ? 'bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-400/20' : 'bg-white/5 text-slate-500 hover:text-slate-300 border border-white/5'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="mt-2 text-left w-full relative">
          <ItemList items={filteredItems} onDelete={deleteItem} language={language} />
        </div>
      </div>
    </div>

      {/* Footer Decoration */}
      <div className="mt-8 md:mt-12 text-center opacity-40 text-[10px] tracking-widest uppercase font-bold text-slate-500 pb-6 w-full col-span-1 lg:col-span-12">
        <div className="mb-2">VibeLocator v1.1 • {uiStrings.footerThanks}</div>
        <a 
          href="https://nandustudio.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-emerald-400 transition-colors"
        >
          ©2026 - Nandur Studio
        </a>
      </div>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-50 w-16 h-16 rounded-full glass border border-white/10 text-emerald-400 shadow-xl shadow-emerald-400/5 hover:text-emerald-300 hover:bg-white/5 transition-all group flex flex-col items-center justify-center p-0"
            aria-label="Scroll to top"
          >
             <ChevronDown className="w-5 h-5 rotate-180 -mt-1 group-hover:-translate-y-1 transition-transform" />
             <span className="text-[8px] font-bold uppercase tracking-widest leading-none mt-1">{uiStrings.scrollToTop}</span>
          </motion.button>
        )}
      </AnimatePresence>
      </main>
    </div>
  );
}
