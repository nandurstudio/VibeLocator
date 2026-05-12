'use client';
import { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react';
import { Search, Loader2, Trash2, History, Volume2, VolumeX, Ear, EarOff, ChevronDown, Send, Mic, X, AlertTriangle, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MicButton } from '@/components/MicButton';
import { ItemList } from '@/components/ItemList';
import { ViloAvatar } from '@/components/ViloAvatar';
import { useItems } from '@/hooks/use-items';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { processVoiceInput, generateSpeech, playAudioFromBase64, resumeAudioContext, GEMINI_MODEL } from '@/lib/gemini';
import { Language, Message } from '@/lib/types';
import { Languages } from 'lucide-react';

const formatUserMessage = (text: string): string => {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (/[.!?]$/.test(trimmed)) return trimmed;

  const questionMarkers = [
    // ID
    'apa', 'siapa', 'dimana', 'di mana', 'kapan', 'mengapa', 'kenapa', 'bagaimana', 'berapa', 'mana', 'apakah', 'siapakah', 'manakah', 'bolehkah', 'bisakah',
    // SU
    'naon', 'saha', 'iraha', 'naha', 'kumaha', 'sabaraha', 'dupi', 'naha',
    // EN
    'what', 'who', 'where', 'when', 'why', 'how', 'which', 'do ', 'does ', 'did ', 'is ', 'are ', 'can ', 'could '
  ];

  const lowerText = trimmed.toLowerCase();

  // Check if it starts with a question marker OR contains certain markers with spaces around them
  const isQuestion = questionMarkers.some(marker =>
    lowerText.startsWith(marker) || lowerText.includes(' ' + marker)
  ) || lowerText.endsWith(' ya') || lowerText.endsWith(' nya'); // Handle "ya" or "nya" at the end which often indicates a question in casual talk

  return isQuestion ? `${trimmed}?` : trimmed;
};

const TerminalTypewriter = ({ text, onComplete, isNew, showCursorAlways }: { text: string, onComplete?: () => void, isNew: boolean, showCursorAlways?: boolean }) => {
  const [displayText, setDisplayText] = useState(isNew ? '' : text);
  const [currentIndex, setCurrentIndex] = useState(isNew ? 0 : text.length);
  const [isSkipped, setIsSkipped] = useState(!isNew);

  // Adaptive speed: faster for longer text
  const baseSpeed = Math.max(5, 25 - Math.floor(text.length / 20));

  useEffect(() => {
    // If not new, already skipped, or finished, do nothing
    if (!isNew || isSkipped || currentIndex >= text.length) {
      if (isNew && !isSkipped && currentIndex >= text.length) {
        onComplete?.();
      }
      return;
    }

    const timeout = setTimeout(() => {
      setDisplayText(text.substring(0, currentIndex + 1));
      setCurrentIndex(prev => prev + 1);
    }, baseSpeed);

    return () => clearTimeout(timeout);
  }, [currentIndex, text, baseSpeed, isNew, isSkipped, onComplete]);

  const handleSkip = () => {
    if (isSkipped) return;
    setIsSkipped(true);
    setDisplayText(text);
    setCurrentIndex(text.length);
    onComplete?.();
  };

  const showCursor = showCursorAlways || (isNew && !isSkipped && currentIndex < text.length);

  return (
    <div onClick={handleSkip} className="cursor-pointer">
      <span>{displayText}</span>
      {showCursor && (
        <motion.span
          animate={{ opacity: [1, 1, 0, 0] }}
          transition={{ repeat: Infinity, duration: 0.8, times: [0, 0.5, 0.51, 1] }}
          className="inline-block w-[6px] h-[15px] bg-emerald-400 ml-1 translate-y-[2px] shadow-[0_0_8px_rgba(16,185,129,0.5)]"
        />
      )}
    </div>
  );
};

const ChatMessage = memo(({
  msg,
  isFirst,
  isLast,
  isStandalone,
  language,
  formatTime,
  youName,
  feedbackSubject,
  feedbackBody,
  onReplay,
  isLastGlobal
}: {
  msg: Message,
  isFirst: boolean,
  isLast: boolean,
  isStandalone: boolean,
  language: Language,
  formatTime: (ts: number) => string,
  youName: string,
  feedbackSubject: string,
  feedbackBody: string,
  onReplay: (msg: Message) => void,
  isLastGlobal: boolean
}) => {
  // Use state initializer to capture "freshness" once on mount
  const [isFresh] = useState(() =>
    msg.role === 'assistant' && !msg.isSystem && (Date.now() - msg.timestamp < 5000)
  );

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={`flex w-full ${msg.role === 'user' ? 'justify-end mt-0' : 'justify-start'} ${isFirst ? 'mt-0' : ''}`}
    >
      {msg.role === 'user' ? (
        <div className="bg-emerald-400 text-slate-900 py-2 px-4 rounded-2xl rounded-tr-none shadow-xl shadow-emerald-400/10 max-w-[85%] flex flex-col items-end">
          <div className="w-full text-left">
            <p className="text-[9px] uppercase font-bold opacity-50 mb-0.5 tracking-widest">
              <span>{youName}</span>
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
        <div className={`flex items-start gap-3 w-full ${!isFirst && msg.role === 'assistant' ? 'mt-1' : 'mt-0'}`}>
          <div className={`scale-[0.45] ml-0 origin-top-left shrink-0 w-8 ${!isFirst ? 'invisible h-0' : '-mt-1'}`}>
            <ViloAvatar state={msg.avatarState || 'idle'} />
          </div>
          <div className={`glass py-2 px-3 border flex flex-col w-full ${isStandalone ? 'rounded-2xl rounded-tl-none shadow-xl' :
            isFirst ? 'rounded-tr-2xl rounded-tl-none shadow-none border-b-0' :
              isLast ? 'rounded-br-2xl rounded-bl-2xl rounded-tr-none rounded-tl-none shadow-xl' :
                'rounded-none rounded-tr-none rounded-tl-none shadow-none border-b-0'
            } ${msg.isSystem ? 'border-white/5 opacity-70 bg-slate-900/40' : 'border-emerald-400/10'} ${(isLast || isStandalone) ? (msg.isSystem ? 'shadow-white/5' : 'shadow-emerald-500/10') : ''}`}>
            <div className="flex-1 min-w-0 pr-1 mt-0 flex flex-col">
              {isFirst && (
                <p className={`text-[9px] mb-0.5 uppercase tracking-widest font-extrabold flex justify-between items-center ${msg.isSystem ? 'text-slate-500' : 'text-emerald-400 opacity-90'}`}>
                  ViLo AI
                </p>
              )}
              <div className={`whitespace-pre-wrap break-words ${msg.isSystem ? 'text-xs text-slate-400 italic leading-relaxed' : 'text-sm text-slate-200 leading-relaxed font-medium'}`}>
                {msg.role === 'assistant' && !msg.isSystem ? (
                  <TerminalTypewriter text={msg.content} isNew={isFresh} showCursorAlways={isLastGlobal} />
                ) : (
                  msg.content
                )}
              </div>

              {/* Feedback Button */}
              {msg.showFeedbackButton && (
                <a
                  href={`mailto:founder@nandurstudio.com?subject=${encodeURIComponent(feedbackSubject)}&body=${encodeURIComponent(`${feedbackBody}\n\n--- DIAGNOSTIC DATA ---\n${msg.technicalDetails || 'No technical data available.'}\n------------------------`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 py-2 px-4 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-emerald-400/20 transition-all active:scale-95 relative z-20 cursor-pointer pointer-events-auto no-underline"
                >
                  <Languages className="w-3 h-3" />
                  {language === 'en' ? 'Contact Developer' : 'Lapor Developer'}
                </a>
              )}
              {/* TTS Indicator */}
              {msg.isGeneratingAudio && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5 opacity-60">
                  <div className="flex gap-[2px] items-end h-[12px]">
                    <motion.div animate={{ height: [4, 10, 4] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-emerald-400 rounded-full" />
                    <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="w-1 bg-emerald-400 rounded-full" />
                    <motion.div animate={{ height: [4, 8, 4] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} className="w-1 bg-emerald-400 rounded-full" />
                  </div>
                  <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Synthesizing Audio...</span>
                </div>
              )}
              <div className="flex justify-between items-end gap-2 pt-1 -mb-1">
                <div className="flex items-center gap-2">
                  {(msg.audioBase64 || msg.isFallback) && (
                    <button
                      onClick={() => onReplay(msg)}
                      className="flex items-center gap-1 hover:bg-emerald-400/20 px-1.5 py-0.5 rounded-md transition-colors group/replay"
                      title="Replay Audio"
                    >
                      <Volume2 className="w-2.5 h-2.5 text-emerald-400 opacity-60 group-hover/replay:opacity-100 transition-opacity" />
                      {msg.isFallback && <span className="text-[7px] text-slate-500 uppercase font-black tracking-tighter">Fallback</span>}
                    </button>
                  )}
                </div>
                <span className={`text-[8px] font-bold opacity-30 uppercase pt-1 ${msg.isSystem ? 'text-slate-400' : 'text-emerald-400'}`}>
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
});
ChatMessage.displayName = 'ChatMessage';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguage] = useState<Language>('su');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isHqEnabled, setIsHqEnabled] = useState(true); // Default HQ on
  const [manualText, setManualText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [chatScrollState, setChatScrollState] = useState({ top: false, bottom: false });
  const [itemScrollState, setItemScrollState] = useState({ top: false, bottom: false });
  const [chatScrollProgress, setChatScrollProgress] = useState(0);
  const [itemScrollProgress, setItemScrollProgress] = useState(0);
  const [standbyProgress, setStandbyProgress] = useState(0);
  const [currentThinkingMessage, setCurrentThinkingMessage] = useState('');
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [isSupported, setIsSupported] = useState(true);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'confirming' | 'error'>('idle');
  const [isWakeWordEnabled, setIsWakeWordEnabled] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [standbyTimeout, setStandbyTimeout] = useState(5);

  const { items, saveItem, updateItem, deleteItem, clearItems, findItem, findItems } = useItems();
  const handleInputRef = useRef<any>(null);
  const { isListening, isWakeWordMode, transcript, interimTranscript, startListening, stopListening, switchMode, setTranscript } = useSpeechRecognition({
    onSessionEnd: (text) => handleInputRef.current?.(text)
  });

  // const logEvent = useCallback((action: string, metadata: any = {}) => {
  //   // In production, this would send to an analytics service (Posthog, Mixpanel, etc.)
  //   console.log(`[ViLo Analytics] ${action}:`, {
  //     ...metadata,
  //     timestamp: new Date().toISOString(),
  //     language
  //   });
  // }, [language]);

  const renderSTTContent = () => {
    if (!transcript && !interimTranscript) {
      return <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="inline text-emerald-400 font-bold ml-[2px]">_</motion.span>;
    }

    if (interimTranscript) {
      // Deduplicate: If interim starts with transcript, only show the difference
      let displayInterim = interimTranscript;
      if (transcript && interimTranscript.toLowerCase().trim().startsWith(transcript.toLowerCase().trim())) {
        displayInterim = interimTranscript.substring(transcript.length);
      }

      // Pisahkan kata terakhir dari interim untuk diberi cursor sticky
      const match = displayInterim.match(/(.*?)(\S+)?$/);
      const prefix = match ? match[1] : displayInterim;
      const lastWord = match && match[2] ? match[2] : "";

      return (
        <span style={{ whiteSpace: 'pre-wrap' }}>
          {transcript && <span className="text-white font-medium">{transcript}</span>}
          {prefix && <span className="text-emerald-400 italic opacity-75">{prefix}</span>}
          <span className="whitespace-nowrap">
            <span className="text-emerald-400 italic opacity-75">{lastWord}</span>
            <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="inline text-emerald-400 font-bold ml-[2px]">_</motion.span>
          </span>
        </span>
      );
    } else {
      // Pisahkan kata terakhir dari transcript (firm)
      const match = transcript.match(/(.*?)(\S+)?$/);
      const prefix = match ? match[1] : transcript;
      const lastWord = match && match[2] ? match[2] : "";

      return (
        <span style={{ whiteSpace: 'pre-wrap' }}>
          {prefix && <span className="text-white font-medium">{prefix}</span>}
          <span className="whitespace-nowrap">
            <span className="text-white font-medium">{lastWord}</span>
            <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="inline text-emerald-400 font-bold ml-[2px]">_</motion.span>
          </span>
        </span>
      );
    }
  };

  const clearHistoryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clearAllTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Wrap in setTimeout to avoid "synchronous setState in effect" error
    // and prevent hydration mismatch in AI Studio environments.
    const timer = setTimeout(() => {
      try {
        const savedWake = localStorage.getItem('vibelocator_wake');
        if (savedWake !== null) setIsWakeWordEnabled(savedWake === 'true');

        const savedTimeout = localStorage.getItem('vibelocator_standby_timeout');
        if (savedTimeout !== null) setStandbyTimeout(parseFloat(savedTimeout));

        const savedMsgs = localStorage.getItem('vibelocator_messages');
        if (savedMsgs) setMessages(JSON.parse(savedMsgs));

        const savedLang = localStorage.getItem('vibelocator_lang');
        if (savedLang) setLanguage(savedLang as Language);

        const savedVoice = localStorage.getItem('vibelocator_voice');
        if (savedVoice !== null) setVoiceEnabled(savedVoice === 'true');

        const savedHq = localStorage.getItem('vibelocator_hq');
        if (savedHq !== null) setIsHqEnabled(savedHq === 'true');

        const savedSpeed = localStorage.getItem('vibelocator_voice_speed');
        if (savedSpeed !== null) setVoiceSpeed(parseFloat(savedSpeed));

        // Check for Speech Recognition support
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
  const settingsRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
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
  const [isItemsExpanded, setIsItemsExpanded] = useState(false); // Default collapsed on mobile
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const avatarState: 'idle' | 'listening' | 'processing' | 'confirming' | 'error' =
    processingStatus === 'processing' ? 'processing'
      : processingStatus === 'confirming' ? 'confirming'
        : processingStatus === 'error' ? 'error'
          : (isListening && !isWakeWordMode ? 'listening' : 'idle');

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
  const itemScrollRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/purity
  const lastActivityRef = useRef<number>(Date.now());

  const MAX_MESSAGES = 100;

  const saveMessages = useCallback((msgs: Message[]) => {
    // Cap at MAX_MESSAGES — keep latest messages
    const capped = msgs.length > MAX_MESSAGES ? msgs.slice(msgs.length - MAX_MESSAGES) : msgs;
    setMessages(capped);
    localStorage.setItem('vibelocator_messages', JSON.stringify(capped));
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    const savedVoice = localStorage.getItem('vibelocator_voice');
    if (savedVoice !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVoiceEnabled(savedVoice === 'true');
    }
  }, []);

  const toggleVoice = useCallback(() => {
    resumeAudioContext();
    const newVal = !voiceEnabled;
    setVoiceEnabled(newVal);
    localStorage.setItem('vibelocator_voice', String(newVal));
    // logEvent('toggle_voice', { enabled: newVal });
  }, [voiceEnabled]);

  const toggleHq = useCallback(() => {
    resumeAudioContext();
    const newVal = !isHqEnabled;
    setIsHqEnabled(newVal);
    localStorage.setItem('vibelocator_hq', String(newVal));
    // logEvent('toggle_hq', { enabled: newVal });
  }, [isHqEnabled]);

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

  // Moved up to avoid TDZ lint error
  const getSTTLanguageCode = (lang: Language) => {
    if (lang === 'su') return 'su-ID';
    if (lang === 'id') return 'id-ID';
    return 'en-US';
  };

  const toggleWakeWord = useCallback(() => {
    resumeAudioContext();
    const newVal = !isWakeWordEnabled;
    setIsWakeWordEnabled(newVal);
    localStorage.setItem('vibelocator_wake', String(newVal));
    lastActivityRef.current = Date.now();

    if (newVal) {
      // Small delay to let the state update
      setTimeout(() => {
        switchMode(true, getSTTLanguageCode(language), (text) => {
          console.log('[SR] Wake word detected:', text);
          setIsWakingUp(true);
          setIsSettingsExpanded(false);
          lastActivityRef.current = Date.now();
          setTimeout(() => setIsWakingUp(false), 1000);

          // Switch to active listening
          setTimeout(() => {
            startListening(getSTTLanguageCode(language));
          }, 300);
        });
      }, 100);
    } else {
      stopListening();
    }
  }, [isWakeWordEnabled, language, switchMode, stopListening, startListening]);

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
  }, [isWakeWordEnabled, language, messages, standbyTimeout, stopListening, saveMessages]);

  // Real-time standby progress for radial UI
  useEffect(() => {
    if (!isWakeWordEnabled) return;

    const updateProgress = () => {
      const totalMs = standbyTimeout * 60 * 1000;
      const elapsedMs = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, 1 - (elapsedMs / totalMs));
      setStandbyProgress(remaining);
    };

    updateProgress();
    const interval = setInterval(updateProgress, 100); // Smooth updates every 100ms
    return () => {
      clearInterval(interval);
      setStandbyProgress(0);
    };
  }, [isWakeWordEnabled, standbyTimeout]);

  // Wake word auto-restart is now handled by the hook's switchMode and internal onend logic

  // Reset standby timer whenever there is voice activity
  useEffect(() => {
    if (transcript || interimTranscript) {
      lastActivityRef.current = Date.now();
    }
  }, [transcript, interimTranscript]);

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
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };

    if (isSettingsExpanded || isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsExpanded, isCategoryDropdownOpen]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  const groupMessagesByDate = useCallback((msgs: Message[]) => {
    const groups: { label: string; messages: Message[] }[] = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 24 * 60 * 60 * 1000;

    msgs.forEach(msg => {
      let label = '';
      if (msg.timestamp >= today) {
        label = language === 'en' ? 'Today' : (language === 'id' ? 'Hari Ini' : 'Dinten Ieu');
      } else if (msg.timestamp >= yesterday) {
        label = language === 'en' ? 'Yesterday' : (language === 'id' ? 'Kemarin' : 'Kamari');
      } else {
        const date = new Date(msg.timestamp);
        label = date.toLocaleDateString(language === 'en' ? 'en-US' : (language === 'id' ? 'id-ID' : 'id-ID'), {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }

      const existingGroup = groups.find(g => g.label === label);
      if (existingGroup) {
        existingGroup.messages.push(msg);
      } else {
        groups.push({ label, messages: [msg] });
      }
    });

    return groups;
  }, [language]);

  const handleChatScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setChatScrollState({
      top: scrollTop > 0,
      bottom: Math.ceil(scrollTop + clientHeight) < scrollHeight
    });

    // Calculate progress percentage (0 to 100)
    const totalScrollable = scrollHeight - clientHeight;
    const progress = totalScrollable > 0 ? (scrollTop / totalScrollable) * 100 : 0;
    setChatScrollProgress(progress);
  }, []);

  const handleItemScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setItemScrollState({
      top: scrollTop > 0,
      bottom: Math.ceil(scrollTop + clientHeight) < scrollHeight
    });

    const totalScrollable = scrollHeight - clientHeight;
    const progress = totalScrollable > 0 ? (scrollTop / totalScrollable) * 100 : 0;
    setItemScrollProgress(progress);
  }, []);

  const handleLanguageChange = (lang: Language) => {
    resumeAudioContext();
    setLanguage(lang);
    localStorage.setItem('vibelocator_lang', lang);
  };

  const performSpeech = useCallback(async (text: string, msgId: string, lang: Language) => {
    if (!voiceEnabled) return;

    if (isHqEnabled) {
      try {
        const audioBase64 = await generateSpeech(text);
        if (audioBase64) {
          playAudioFromBase64(audioBase64, voiceSpeed);
          // Update the message in state to cache the audio and remove loading state
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, audioBase64, isGeneratingAudio: false } : m));
          return;
        }
      } catch (e) {
        console.warn("Gemini Speech failed, falling back to Browser TTS", e);
      }
    }

    // Fallback: Browser Web Speech API
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'su' ? 'id-ID' : (lang === 'en' ? 'en-US' : 'id-ID');
    utterance.rate = voiceSpeed;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);

    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isFallback: true, isGeneratingAudio: false } : m));
  }, [voiceEnabled, isHqEnabled, voiceSpeed, setMessages]);

  const handleReplay = useCallback((msg: Message) => {
    if (!voiceEnabled) return;
    // logEvent('audio_replay', { messageId: msg.id, role: msg.role });

    if (msg.audioBase64) {
      playAudioFromBase64(msg.audioBase64, voiceSpeed);
    } else {
      const utterance = new SpeechSynthesisUtterance(msg.content);
      utterance.lang = language === 'su' ? 'id-ID' : (language === 'en' ? 'en-US' : 'id-ID');
      utterance.rate = voiceSpeed;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  }, [voiceEnabled, voiceSpeed, language]);

  const handleInput = useCallback(async (textOverride?: string) => {
    lastActivityRef.current = Date.now();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      setIsTyping(false);
    }

    const rawText = (textOverride || manualText).trim().slice(0, 500); // Max 500 chars
    if (!rawText || processingStatus === 'processing' || processingStatus === 'confirming') return;

    const textToProcess = formatUserMessage(rawText);

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
    // logEvent('message_sent', { length: textToProcess.length });

    setProcessingStatus('processing');

    try {
      // Pass the last 10 messages for conversation context (exclude system messages if any, though all might be useful)
      const historyContext = messages.filter(m => !m.isSystem).slice(-10).map(m => ({ role: m.role, content: m.content }));
      const result = await processVoiceInput(textToProcess, items, language, historyContext);

      const assistantMsgId = crypto.randomUUID();
      const assistantMsg: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: result.message,
        timestamp: Date.now(),
        avatarState: result.avatarState ?? 'idle',
        isGeneratingAudio: voiceEnabled && isHqEnabled
      };
      // Clear processing status BEFORE adding message to avoid it appearing after the bubble
      setProcessingStatus('idle');
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

      // Trigger Smart Speech
      await performSpeech(result.message, assistantMsgId, language);

      lastActivityRef.current = Date.now();
    } catch (error: any) {
      console.error("Error processing input:", error);

      let errorMsg = "";
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      const apiMessage = error?.message || error?.error?.message || "";
      const statusCode = error?.status || error?.error?.code || 0;

      if (isOffline) {
        errorMsg = language === 'su' ? "Duh, janten sesah... internetna nuju pegat, Kak." :
          (language === 'id' ? "Aduh, sepertinya internet Kakak terputus nih." : "You seem to be offline.");
      } else if (statusCode === 429 || apiMessage.includes('429')) {
        errorMsg = language === 'su' ? "Punten pisan, kuota AI nuju seep. Mangga ditaros deui engké." :
          (language === 'id' ? "Maaf ya, kuota AI sedang habis. Silakan coba lagi nanti." : "AI quota exceeded.");
      } else if (statusCode === 500) {
        errorMsg = language === 'su' ? "Server Google nuju ruksak (500). Cobian sakedap deui nya." :
          (language === 'id' ? "Server Google sedang bermasalah (500). Coba sebentar lagi ya." : "Google Server error (500).");
      } else if (apiMessage && apiMessage.length < 100) {
        errorMsg = (language === 'su' ? "Aya masalah ti pusat: " : (language === 'id' ? "Ada masalah dari pusat: " : "API Error: ")) + apiMessage;
      } else {
        errorMsg = language === 'su' ? "Punten, aya masalah sakedap pas ngolah datana." :
          (language === 'id' ? "Maaf, ada masalah saat memproses permintaan Kakak." : "Something went wrong.");
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: errorMsg,
        timestamp: Date.now(),
        isSystem: true,
        avatarState: 'error'
      };

      const techData = [
        `[DIAGNOSTIC REPORT - VILOCATOR V2.9]`,
        `Timestamp: ${new Date().toISOString()}`,
        `Error Type: ${apiMessage || 'Unknown API Exception'}`,
        `Status Code: ${statusCode || 'N/A'}`,
        `Current Model: ${GEMINI_MODEL || 'gemini-2.5-flash'}`,
        `Language: ${language}`,
        `Inventory: ${items.length} items`,
        `Voice Context: ${voiceEnabled ? 'Active' : 'Muted'} (HQ: ${isHqEnabled ? 'Enabled' : 'Disabled'})`,
        `Browser: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}`,
        `-----------------------------------`,
        `Request Text: "${textToProcess.substring(0, 50)}..."`
      ].join('\n');

      const feedbackMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: language === 'su' ? "Punten pisan, aya masalah téhnis. Mangga lapor ka Nandur Studio kanggo dibantos." :
          (language === 'id' ? "Duh, sepertinya ada masalah teknis. Silakan lapor ke Nandur Studio agar segera diperbaiki." : "Technical glitch detected. Please report this to the developer for a quick fix."),
        timestamp: Date.now() + 1,
        isSystem: true,
        showFeedbackButton: true,
        technicalDetails: techData
      };

      saveMessages([...newMessages, assistantMsg, feedbackMsg]);

      // Speak error with fallback
      const utterance = new SpeechSynthesisUtterance(errorMsg);
      utterance.lang = language === 'su' ? 'id-ID' : (language === 'en' ? 'en-US' : 'id-ID');
      window.speechSynthesis.speak(utterance);

      // Set error state on header avatar — clears when next request starts
      setProcessingStatus('error');
    } finally {
      setTranscript('');
      lastActivityRef.current = Date.now();

      // If standby mode is still enabled, go back to it after processing
      if (isWakeWordEnabled) {
        setTimeout(() => {
          switchMode(true, getSTTLanguageCode(language), (text) => {
            setIsWakingUp(true);
            setIsSettingsExpanded(false);
            lastActivityRef.current = Date.now();
            setTimeout(() => setIsWakingUp(false), 1000);
            setTimeout(() => {
              if (isWakeWordEnabled) {
                startListening(getSTTLanguageCode(language));
              }
            }, 300);
          });
        }, 1000); // Wait for AI to finish speaking or for user to digest
      }
    }
  }, [items, processingStatus, saveItem, deleteItem, updateItem, findItems, setTranscript, language, manualText, messages, voiceEnabled, isHqEnabled, saveMessages, performSpeech, isWakeWordEnabled, switchMode, startListening]);

  // Sync handleInput ref for the hook
  useEffect(() => {
    handleInputRef.current = handleInput;
  }, [handleInput]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInput();
    }
  };

  // Transcript processing is now handled by onSessionEnd callback in useSpeechRecognition

  const filteredItems = useMemo(() => items.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.category && i.category.toLowerCase().includes(searchQuery.toLowerCase()))
  ), [items, searchQuery]);

  const clearHistory = useCallback(() => {
    saveMessages([]);
  }, [saveMessages]);

  const formatTime = useCallback((ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const uiStrings = useMemo(() => ({
    su: {
      title: "VibeLocator",
      subtitle: "\"Poho disimpen dimana? Kalem bae... ViLo siap nambihan ingetan.\"",
      placeholder: "Milari naon yeuh?",
      listTitle: "Barang nu tos disimpen",
      empty: "Kosong keneh yeuh. Pencet Mic geura!",
      historyEmpty: "Teu acan aya obrolan, Lur.",
      clearItems: "Hapus Sadaya Barang",
      clearHistory: "Bersihkeun Obrolan",
      historyTitle: "Catetan Obrolan",
      confirmClear: "Yakin bade dihapus sadayana?",
      voiceOn: "Mode Sora: HURUNG",
      voiceOff: "Mode Sora: PAREUM",
      alwaysOnMode: "Always On (Aktif)",
      alwaysOnOff: "Always On: OFF",
      standbyLabel: "Standby:",
      standbyIndicator: "ViLo Standby: Saurkeun \"Hey ViLo\"",
      smuTag: "Memori Semantik",
      youName: "Anjeun",
      listening: "Nuju Ngupingkeun...",
      thinking: "Sakedap, nuju diolah...",
      manualPlaceholder: "Ketik di dieu bilih hoream nyarios...",
      sendBtn: "Gas!",
      allBtn: "Sadayana",
      footerThanks: "Hatur Nuhun!",
      scrollToTop: "Ka Luhur",
      quotaLabel: "Status Kuota AI",
      hqToggle: "Sora High-Quality",
      voiceTooltip: "Hurungkeun/Pareumkeun Sora AI",
      wakeTooltip: "Nguping Tuluy (Saurkeun 'Hey ViLo')",
      feedbackSubject: "Laporan Masalah ViLo",
      feedbackBody: "Sampurasun Nandur Studio,\n\nPunten, abdi mendak masalah dina ViLo:\n\n[Seratkeun masalahna di dieu]",
      speedLabel: "Laju Sora",
      browserWarning: "Punten, browser ieu teu acan ngarojong Mic sacara pinuh. Cobian nganggo Chrome atanapi Edge nya Kak.",
      storageLabel: "Kapasitas Inventaris",
      capacityFull: "Inventaris Pinuh!"
    },
    id: {
      title: "VibeLocator",
      subtitle: "\"Lupa naruh dimana? Chill aja, Kak... ViLo back-up ingatanmu.\"",
      placeholder: "Lagi nyari apa, Kak?",
      listTitle: "Daftar Barang Kamu",
      empty: "Masih kosong melompong nih, Kak.",
      historyEmpty: "Belum ada obrolan nih, Kak.",
      clearItems: "Kosongkan Semua Barang",
      clearHistory: "Hapus Riwayat Chat",
      historyTitle: "Riwayat Obrolan",
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
      scrollToTop: "Ke Atas",
      quotaLabel: "Status Kuota AI",
      hqToggle: "Suara High-Quality",
      voiceTooltip: "Aktifkan/Matikan Suara AI",
      wakeTooltip: "Selalu Mendengarkan (Panggil 'Hey ViLo')",
      feedbackSubject: "Laporan Error ViLo",
      feedbackBody: "Halo Nandur Studio,\n\nSaya menemukan masalah pada ViLo:\n\n[Tuliskan deskripsi masalah di sini]",
      speedLabel: "Kecepatan Suara",
      browserWarning: "Maaf, browser ini belum mendukung fitur Mic sepenuhnya. Coba pakai Chrome atau Edge ya Kak.",
      storageLabel: "Kapasitas Inventaris",
      capacityFull: "Inventaris Penuh!"
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
      scrollToTop: "Top",
      quotaLabel: "AI Quota Status",
      hqToggle: "High-Quality Audio",
      voiceTooltip: "Toggle AI Voice Response",
      wakeTooltip: "Always Listening (Say 'Hey ViLo')",
      feedbackSubject: "ViLo Error Report",
      feedbackBody: "Hello Nandur Studio,\n\nI encountered an issue with ViLo:\n\n[Write more details here]",
      speedLabel: "Voice Speed",
      browserWarning: "Sorry, this browser doesn't fully support Mic features. Please try Chrome or Edge.",
      storageLabel: "Inventory Capacity",
      capacityFull: "Inventory Full!"
    }
  }[language]), [language]);

  return (
    <div className="flex flex-col min-h-screen xl:h-screen xl:overflow-hidden">
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

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[90px] pb-6 md:pb-10 lg:pb-0 relative w-full z-10 transform-gpu flex flex-col gap-1 xl:overflow-hidden">

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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-1 lg:gap-2 items-stretch lg:flex-1 xl:overflow-hidden">

          {/* Interaction Column: right on desktop, bottom on mobile */}
          <div className="lg:col-span-5 w-full z-10 relative lg:order-2 xl:h-full lg:flex lg:flex-col xl:overflow-hidden">
            {/* Column Wrapper - Dashboard mode on desktop */}
            <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-hidden">
              {/* Header & Settings */}
              <div className="flex flex-col gap-2 relative">
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

                    {!isSupported && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        <p className="text-[10px] font-medium text-amber-200/70 leading-tight">
                          {uiStrings.browserWarning}
                        </p>
                      </motion.div>
                    )}

                    <AnimatePresence>
                      {isSettingsExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex flex-col gap-1 overflow-hidden absolute top-full right-0 mt-2 w-full md:w-64 z-50 glass p-2 rounded-[2rem] shadow-2xl"
                        >
                          <button
                            onClick={toggleVoice}
                            className={`p-1 px-4 py-2.5 rounded-t-[1.5rem] rounded-b-sm border border-white/5 flex items-center justify-between gap-3 transition-all ${voiceEnabled ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' : 'bg-slate-900/50 text-slate-500'
                              }`}
                            title={uiStrings.voiceTooltip}
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

                          <AnimatePresence>
                            {voiceEnabled && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.4, ease: "easeInOut" }}
                                className="flex flex-col gap-1 overflow-hidden"
                              >
                                <button
                                  onClick={toggleHq}
                                  className={`p-1 px-4 py-2.5 rounded-sm border border-white/5 flex items-center justify-between gap-3 transition-all ${isHqEnabled ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : 'bg-slate-900/50 text-slate-500 hover:bg-white/5'
                                    }`}
                                  title={uiStrings.hqToggle}
                                >
                                  <div className="flex items-center gap-2">
                                    <Mic className="w-4 h-4 shrink-0" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-left">
                                      {uiStrings.hqToggle}
                                    </span>
                                  </div>
                                  <div className={`w-8 h-4 rounded-full relative transition-all shrink-0 ${isHqEnabled ? 'bg-amber-400/30' : 'bg-slate-800'}`}>
                                    <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${isHqEnabled ? 'right-0.5 bg-amber-400' : 'left-0.5 bg-slate-600'}`} />
                                  </div>
                                </button>

                                <div className="flex flex-col gap-3 p-3 bg-slate-900/50 rounded-sm border border-white/5">
                                  <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{uiStrings.speedLabel}</span>
                                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{voiceSpeed.toFixed(1)}x</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0.5"
                                    max="2.0"
                                    step="0.1"
                                    value={voiceSpeed}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      setVoiceSpeed(val);
                                      localStorage.setItem('vibelocator_voice_speed', String(val));
                                    }}
                                    className="w-full accent-emerald-400 bg-slate-800 rounded-lg h-1 appearance-none cursor-pointer"
                                  />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className="flex flex-col gap-2 p-3 bg-slate-900/50 rounded-sm border border-white/5">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{uiStrings.quotaLabel}</span>
                              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Healthy</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: '85%' }}
                                className="h-full bg-emerald-400/50"
                              />
                            </div>
                            <p className="text-[9px] text-slate-500 italic">&quot;Optimized for High Performance Mode&quot;</p>
                          </div>

                          <div className="flex flex-col gap-2 p-3 bg-slate-900/50 rounded-sm border border-white/5">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{uiStrings.storageLabel}</span>
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${items.length >= 200 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {items.length}/200
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min((items.length / 200) * 100, 100)}%` }}
                                className={`h-full transition-all duration-500 ${items.length >= 200 ? 'bg-amber-400' : 'bg-emerald-400/50'}`}
                              />
                            </div>
                            {items.length >= 200 && (
                              <p className="text-[9px] text-amber-400 font-bold uppercase tracking-tighter italic">
                                {uiStrings.capacityFull}
                              </p>
                            )}
                          </div>

                          <motion.button
                            layout
                            onClick={toggleWakeWord}
                            initial={false}
                            animate={{
                              borderBottomLeftRadius: isWakeWordEnabled ? "2px" : "24px",
                              borderBottomRightRadius: isWakeWordEnabled ? "2px" : "24px",
                            }}
                            transition={{ ease: "easeInOut" }}
                            className={`p-1 px-4 py-2.5 border border-white/5 border-t-0 flex items-center justify-between gap-3 transition-colors rounded-t-sm ${isWakeWordEnabled ? 'bg-blue-400/10 text-blue-400 border-blue-400/20' : 'bg-slate-900/50 text-slate-500'
                              }`}
                            title={uiStrings.wakeTooltip}
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
                          </motion.button>

                          {isWakeWordEnabled && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="glass rounded-b-[1.5rem] rounded-t-sm p-2 flex flex-col gap-2 border-t-0 overflow-hidden"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[9px] uppercase font-bold text-slate-500 ml-2">{uiStrings.standbyLabel}</span>
                                <div className="flex gap-1 flex-nowrap justify-end overflow-x-auto no-scrollbar">
                                  {[0.5, 1, 2, 5].map((val) => (
                                    <button
                                      key={val}
                                      onClick={() => {
                                        setStandbyTimeout(val);
                                        localStorage.setItem('vibelocator_standby_timeout', String(val));
                                        lastActivityRef.current = Date.now();
                                      }}
                                      className={`px-2 md:px-3 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 ${standbyTimeout === val
                                        ? 'bg-blue-400 text-slate-900 shadow-lg shadow-blue-400/20'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                        }`}
                                    >
                                      {val < 1 ? '30s' : `${val}m`}
                                    </button>
                                  ))}
                                </div>
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
                  {/* Scroll Progress Indicator */}
                  <div className="absolute top-0 right-0 w-[2px] h-full bg-white/[0.02] z-50 pointer-events-none">
                    <motion.div
                      className="w-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                      style={{ height: `${chatScrollProgress}%` }}
                    />
                  </div>

                  <div
                    ref={scrollRef}
                    onScroll={handleChatScroll}
                    className="flex-1 overflow-y-auto p-2 flex flex-col gap-4 custom-scrollbar min-h-0"
                    suppressHydrationWarning
                  >
                    {messages.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full opacity-50 relative mt-4">
                        <History className="w-10 h-10 text-slate-500 mb-3" />
                        <p className="text-slate-400 text-xs font-bold">{uiStrings.historyEmpty}</p>
                      </div>
                    )}
                    <AnimatePresence mode="popLayout">
                      {groupMessagesByDate(messages).map((group) => (
                        <div key={group.label} className="flex flex-col gap-4 mb-4">
                          {/* Date Separator */}
                          <div className="flex items-center gap-4 px-4 my-2">
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] bg-white/[0.03] px-3 py-1 rounded-full border border-white/5 backdrop-blur-md">
                              {group.label}
                            </span>
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 via-white/10 to-transparent" />
                          </div>

                          <div className="flex flex-col gap-2">
                            {(() => {
                              const roleGroups: Message[][] = [];
                              let currentGroup: Message[] = [];

                              group.messages.forEach((msg, idx) => {
                                if (idx > 0 && msg.role !== group.messages[idx - 1].role) {
                                  roleGroups.push(currentGroup);
                                  currentGroup = [msg];
                                } else {
                                  currentGroup.push(msg);
                                }
                              });
                              if (currentGroup.length > 0) roleGroups.push(currentGroup);

                              return roleGroups.map((roleGroup, rgIdx) => {
                                const isAiGroup = roleGroup[0].role === 'assistant';
                                return (
                                  <div key={rgIdx} className={`flex flex-col ${isAiGroup ? 'w-fit max-w-[85%] sm:max-w-[320px] items-start' : 'w-full items-end'}`}>
                                    {roleGroup.map((msg) => {
                                      const globalIndex = group.messages.indexOf(msg);
                                      const isFirst = globalIndex === 0 || group.messages[globalIndex - 1].role !== msg.role;
                                      const isLast = globalIndex === group.messages.length - 1 || group.messages[globalIndex + 1].role !== msg.role;
                                      const isStandalone = isFirst && isLast;

                                      return (
                                        <ChatMessage
                                          key={msg.id}
                                          msg={msg}
                                          isFirst={isFirst}
                                          isLast={isLast}
                                          isStandalone={isStandalone}
                                          language={language}
                                          formatTime={formatTime}
                                          youName={uiStrings.youName}
                                          feedbackSubject={uiStrings.feedbackSubject}
                                          feedbackBody={uiStrings.feedbackBody}
                                          onReplay={handleReplay}
                                          isLastGlobal={messages[messages.length - 1]?.id === msg.id}
                                        />
                                      );
                                    })}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      ))}

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
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-start gap-3 mt-2"
                        >
                          <div className="scale-[0.45] ml-0 origin-top-left shrink-0 w-8 -mt-1">
                            <ViloAvatar state="processing" />
                          </div>
                          <div className="glass py-2 px-3 rounded-2xl rounded-tl-none flex items-center gap-3 border border-white/5">
                            <div className="flex gap-1 items-center justify-center h-4 w-[24px]">
                              <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
                              <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
                              <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
                            </div>
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                              {currentThinkingMessage}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className={`absolute top-0 left-0 right-0 h-6 pointer-events-none transition-opacity duration-300 ${chatScrollState.top ? 'opacity-100' : 'opacity-0'}`} style={{ background: 'linear-gradient(to bottom, rgba(52, 211, 153, 0.1), transparent)', borderTop: '1px solid rgba(52, 211, 153, 0.2)' }} />
                  <div className={`absolute bottom-0 left-0 right-0 h-6 pointer-events-none transition-opacity duration-300 ${chatScrollState.bottom ? 'opacity-100' : 'opacity-0'}`} style={{ background: 'linear-gradient(to top, rgba(52, 211, 153, 0.1), transparent)', borderBottom: '1px solid rgba(52, 211, 153, 0.2)' }} />
                </div>
              </div>

              {/* Sticky Action Center (Desktop) - Grouped Textarea and Mic */}
              <div className="hidden lg:flex flex-col w-full shrink-0 mt-auto sticky bottom-0 z-20 gap-0 pt-0">
                {/* Desktop Textarea - Transparent Background */}
                <div className="shrink-0 w-full">
                  <div ref={inputContainerRef} className="relative glass rounded-t-lg rounded-b-none overflow-hidden focus-within:ring-2 focus-within:ring-emerald-400/50 transition-all border border-white/5 shadow-xl min-h-[56px] bg-slate-900/60 backdrop-blur-xl">
                    {isListening && !isWakeWordMode && (transcript || interimTranscript) ? (
                      <div
                        className="w-full bg-transparent p-3 md:p-4 pr-12 md:pr-14 text-sm md:text-base mt-1 min-h-[56px] max-h-[120px] overflow-y-auto custom-scrollbar flex items-center flex-wrap"
                        id="listening-display-desktop"
                      >
                        {renderSTTContent()}
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
                        id="manual-input-desktop"
                        maxLength={500}
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
                        className={`w-8 h-8 rounded-md flex items-center justify-center transition-all shrink-0 ${(isListening || manualText) && processingStatus !== 'processing'
                          ? 'bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-400/20 hover:scale-105'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        id="send-button-desktop"
                        title={uiStrings.sendBtn}
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

                {/* Desktop Mic - With Isolated Glass Cloud Background */}
                <div className="flex w-full justify-center pt-1 pb-2 rounded-b-2xl rounded-t-none glass border border-t-0 border-white/5 shadow-xl bg-slate-900/60 backdrop-blur-xl">
                  <MicButton
                    isListening={isListening && !isWakeWordMode}
                    onStart={() => {
                      if (isWakeWordMode) stopListening();
                      setIsSettingsExpanded(false);
                      startListening(getSTTLanguageCode(language));
                    }}
                    onStop={stopListening}
                    isLoading={processingStatus === 'processing'}
                    language={language}
                    isStandby={isWakeWordMode}
                    standbyProgress={standbyProgress}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Sticky Action Center - Isolated Glass for Mic Only */}
          <div className="lg:hidden sticky bottom-0 z-40 pointer-events-none w-full">
            <div className="pointer-events-auto w-full flex flex-col items-center">
              {/* Mobile Textarea - Transparent Background */}
              <div className="w-full">
                <div className="relative glass rounded-t-lg rounded-b-none overflow-hidden focus-within:ring-2 focus-within:ring-emerald-400/50 transition-all border border-white/5 shadow-xl min-h-[56px] bg-slate-900/60 backdrop-blur-xl">
                  {isListening && !isWakeWordMode && (transcript || interimTranscript) ? (
                    <div
                      className="w-full bg-transparent p-3 md:p-4 pr-12 md:pr-14 text-sm md:text-base mt-1 min-h-[56px] max-h-[120px] overflow-y-auto custom-scrollbar flex items-center flex-wrap"
                      id="listening-display-mobile"
                    >
                      {renderSTTContent()}
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
                      id="manual-input-mobile"
                      maxLength={500}
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
                      className={`w-8 h-8 rounded-md flex items-center justify-center transition-all shrink-0 ${(isListening || manualText) && processingStatus !== 'processing'
                        ? 'bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-400/20 hover:scale-105'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      id="send-button-mobile"
                      title={uiStrings.sendBtn}
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

              {/* Mobile Mic - Perfectly Matched Glass Style with Textarea */}
              <div
                className="pointer-events-auto w-full flex flex-col items-center justify-center pt-1 pb-1 rounded-b-2xl rounded-t-none glass border border-t-0 border-white/5 shadow-xl bg-slate-900/60 backdrop-blur-xl"
              >
                <MicButton
                  isListening={isListening && !isWakeWordMode}
                  onStart={() => {
                    if (isWakeWordMode) stopListening();
                    setIsSettingsExpanded(false);
                    // Add a tiny delay to ensure the browser has released the mic from standby mode
                    setTimeout(() => {
                      startListening(getSTTLanguageCode(language));
                    }, 100);
                  }}
                  onStop={stopListening}
                  isLoading={processingStatus === 'processing'}
                  language={language}
                  compact
                  isStandby={isWakeWordMode}
                  standbyProgress={standbyProgress}
                />
              </div>
            </div>
          </div>

          {/* Items Column: left on desktop, top on mobile */}
          <div className="lg:col-span-7 w-full mt-2 lg:mt-0 lg:pr-6 lg:order-1 transition-all duration-300 xl:h-full lg:flex lg:flex-col xl:overflow-hidden min-h-0 gap-2">
            {/* Header with Title and Toggle */}
            {/* Items Content Wrapper - To group header and list with gap-2 */}
            <div className="flex flex-col gap-2 lg:flex-1 min-h-0">
              {/* Search Input Container */}
              <AnimatePresence>
                {(isItemsExpanded || isDesktop) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="w-full lg:flex lg:h-auto lg:opacity-100 overflow-hidden"
                  >
                    <div className="relative flex-grow">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder={uiStrings.placeholder}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-2 pl-12 pr-4 focus:outline-none focus:border-emerald-400/50 transition-all text-slate-200 text-sm"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          lastActivityRef.current = Date.now();
                        }}
                        id="search-input"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Items Header - Styled like Chat History, Always visible on mobile as a toggle */}
              <div className="flex items-center justify-between px-1 shrink-0">
                <h3
                  className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2 cursor-pointer lg:cursor-default"
                  onClick={() => { if (!isDesktop) setIsItemsExpanded(!isItemsExpanded); }}
                >
                  <Package className="w-3 h-3" />
                  {uiStrings.listTitle}
                  <ChevronDown className={`w-3 h-3 transition-transform duration-300 lg:hidden ${isItemsExpanded ? 'rotate-180' : ''}`} />
                </h3>

                {/* Clear All Button - Now in Header, matching Clear History style */}
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
                    className={`text-[10px] font-bold uppercase tracking-tighter transition-all flex items-center gap-1 ml-auto ${confirmClearAll ? 'text-slate-900 bg-red-400 px-3 py-1.5 rounded-lg border-2 border-red-400' : 'text-slate-600 hover:text-red-400'}`}
                  >
                    {confirmClearAll ? (language === 'en' ? 'Sure?' : (language === 'id' ? 'Yakin?' : 'Leres?')) : (
                      <>
                        <Trash2 className="w-3 h-3" />
                        {uiStrings.clearItems}
                      </>
                    )}
                  </button>
                )}
              </div>
              <AnimatePresence>
                {(isItemsExpanded || isDesktop) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-2 lg:flex lg:h-auto lg:opacity-100 overflow-hidden lg:flex-1 min-h-0"
                  >
                  {/* Category Filters - Now in a sleek dropdown bar matching language selector style */}
                  {items.length > 0 && (
                    <div ref={categoryRef} className="flex items-center gap-2 px-1 relative">
                      {/* Category Pill Container */}
                      <div className="glass rounded-2xl p-1 flex items-center gap-1 flex-1 md:flex-none custom-scrollbar overflow-x-auto min-w-0">
                        <Package className="w-4 h-4 ml-2 mr-1 text-slate-400 shrink-0" />
                        <button
                          onClick={() => setSearchQuery('')}
                          className={`px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all shrink-0 ${!searchQuery ? 'bg-emerald-400 text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          {uiStrings.allBtn}
                        </button>
                        
                        {/* Selected Category Label (if not 'All') */}
                        {searchQuery && Array.from(new Set(items.map(i => i.category))).includes(searchQuery) && (
                          <div className="flex items-center gap-1 bg-emerald-400/10 px-2.5 py-1.5 rounded-xl border border-emerald-400/20 shrink-0">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{searchQuery}</span>
                            <button 
                              onClick={() => setSearchQuery('')}
                              className="hover:bg-emerald-400/20 rounded-full p-0.5 transition-colors"
                            >
                              <X className="w-2.5 h-2.5 text-emerald-400" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Dropdown Button */}
                      <button
                        onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                        className="glass p-2 sm:p-2.5 rounded-2xl text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/5 transition-all shrink-0 aspect-square flex items-center justify-center"
                        title="Filter Category"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Category Dropdown Menu */}
                      <AnimatePresence>
                        {isCategoryDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                            className="absolute top-full right-1 mt-2 w-56 glass p-2 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[60] border border-white/10 backdrop-blur-3xl"
                          >
                            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto custom-scrollbar p-1">
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] px-3 py-2 border-b border-white/5 mb-1">
                                {language === 'en' ? 'Select Category' : (language === 'id' ? 'Pilih Kategori' : 'Pilih Kategori')}
                              </p>
                              {Array.from(new Set(items.map(i => i.category).filter(Boolean))).map(cat => (
                                <button
                                  key={cat}
                                  onClick={() => {
                                    setSearchQuery(cat);
                                    setIsCategoryDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${searchQuery === cat ? 'bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-400/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                                >
                                  {cat}
                                </button>
                              ))}
                              {Array.from(new Set(items.map(i => i.category).filter(Boolean))).length === 0 && (
                                <p className="text-[10px] text-slate-500 italic px-4 py-3 text-center">No categories yet</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                    {/* Items List Container */}
                    <div className="mt-2 lg:mt-0 text-left w-full relative rounded-xl overflow-hidden bg-slate-900/20 backdrop-blur-md flex flex-col h-[65vh] md:h-[75vh] lg:h-auto lg:flex-1 min-h-[300px] border border-white/5 shadow-xl">
                      <div className="absolute top-0 right-0 w-[2px] h-full bg-white/[0.02] z-50 pointer-events-none">
                        <motion.div
                          className="w-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                          style={{ height: `${itemScrollProgress}%` }}
                        />
                      </div>
                      <div
                        className={`absolute top-0 left-0 right-0 h-8 pointer-events-none transition-opacity duration-300 z-20 ${itemScrollState.top ? 'opacity-100' : 'opacity-0'}`}
                        style={{ background: 'linear-gradient(rgba(52, 211, 153, 0.08), transparent)', borderTop: '1px solid rgba(52, 211, 153, 0.1)' }}
                      />
                      <div
                        className={`absolute bottom-0 left-0 right-0 h-8 pointer-events-none transition-opacity duration-300 z-20 ${itemScrollState.bottom ? 'opacity-100' : 'opacity-0'}`}
                        style={{ background: 'linear-gradient(to top, rgba(52, 211, 153, 0.08), transparent)', borderBottom: '1px solid rgba(52, 211, 153, 0.1)' }}
                      />
                      <div
                        ref={itemScrollRef}
                        onScroll={handleItemScroll}
                        className="flex-1 overflow-y-auto p-2 flex flex-col gap-4 custom-scrollbar min-h-0"
                      >
                        <ItemList items={filteredItems} onDelete={deleteItem} language={language} searchQuery={searchQuery} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer Decoration */}
        <div className="mt-4 lg:mt-0 pt-2 text-center opacity-40 text-[10px] tracking-widest uppercase font-bold text-slate-500 pb-2 md:pb-6 lg:pb-0 w-full col-span-1 lg:col-span-12">
          <div className="mb-2">VibeLocator v2.8 (c70639b) • {uiStrings.footerThanks}</div>
          <a
            href="https://linkedin.com/in/nandangduryat"
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
