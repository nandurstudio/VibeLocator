'use client';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { InventoryPanel } from '@/components/InventoryPanel';
import { ChatPanel } from '@/components/ChatPanel';
import { ViloAvatar } from '@/components/ViloAvatar';
import { SettingsMenu } from '@/components/SettingsMenu';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { processVoiceInput, generateSpeech, playAudioFromBase64, resumeAudioContext, GEMINI_MODEL } from '@/lib/gemini';
import { Language, Message } from '@/lib/types';
import { formatUserMessage, getSTTLanguageCode } from '@/lib/locales';



import { useVilo } from '@/context/ViloContext';

export default function Home() {
  const {
    language, uiStrings,
    voiceEnabled, setVoiceEnabled,
    isHqEnabled, voiceSpeed,
    isWakeWordEnabled, setIsWakeWordEnabled, standbyTimeout,
    items, saveItem, updateItem, deleteItem, findItems,
    isSettingsExpanded, setIsSettingsExpanded
  } = useVilo();

  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'confirming' | 'error'>('idle');
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);


  const [messages, setMessages] = useState<Message[]>([]);
  const [manualText, setManualText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [chatScrollState, setChatScrollState] = useState({ top: false, bottom: false });
  const [itemScrollState, setItemScrollState] = useState({ top: false, bottom: false });
  const [chatScrollProgress, setChatScrollProgress] = useState(0);
  const [itemScrollProgress, setItemScrollProgress] = useState(0);
  const [standbyProgress, setStandbyProgress] = useState(0);
  const [currentThinkingMessage, setCurrentThinkingMessage] = useState('');

  const handleInputRef = useRef<any>(null);
  const { isListening, isWakeWordMode, transcript, interimTranscript, startListening, stopListening, switchMode, setTranscript } = useSpeechRecognition({
    onSessionEnd: (text) => handleInputRef.current?.(text)
  });

  const clearHistoryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const settingsRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (clearHistoryTimeoutRef.current) clearTimeout(clearHistoryTimeoutRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // Load messages from localStorage on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem('vibelocator_messages');
        if (saved) {
          setMessages(JSON.parse(saved));
        }
      } catch (e) {
        console.warn("Failed to load messages:", e);
      }
    }, 0);
    return () => clearTimeout(timer);
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
        // Double check for duplicate name with empty location to prevent "gradual" save bug
        const existingEmpty = items.find(i => 
          i.name.toLowerCase() === (result.item || '').toLowerCase() && 
          !i.location.trim()
        );

        if (existingEmpty) {
          updateItem(existingEmpty.id, result.item, result.location, result.category);
        } else {
          saveItem(result.item, result.location, result.category);
        }
      } else if (result.action === 'UPDATE') {
        const idsToUpdate = result.target_ids && result.target_ids.length > 0
          ? result.target_ids
          : findItems(result.item).map((i: any) => i.id);

        if (idsToUpdate.length > 0) {
          idsToUpdate.forEach((id: string) => updateItem(id, result.item, result.location, result.category));
        } else {
          // Fallback check for duplicate name with empty location
          const existingEmpty = items.find(i => 
            i.name.toLowerCase() === (result.item || '').toLowerCase() && 
            !i.location.trim()
          );
          if (existingEmpty) {
            updateItem(existingEmpty.id, result.item, result.location, result.category);
          } else {
            saveItem(result.item, result.location, result.category);
          }
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
  }, [items, processingStatus, saveItem, deleteItem, updateItem, findItems, setTranscript, language, manualText, messages, voiceEnabled, isHqEnabled, saveMessages, performSpeech, isWakeWordEnabled, switchMode, startListening, setIsSettingsExpanded]);

  const clearHistory = useCallback(() => {
    saveMessages([]);
  }, [saveMessages]);

  useEffect(() => {
    const savedVoice = localStorage.getItem('vibelocator_voice');
    if (savedVoice !== null) {
      setVoiceEnabled(savedVoice === 'true');
    }
  }, [setVoiceEnabled]);

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

  // Voice recognition effects moved to hooks

  const prevWakeEnabledRef = useRef(isWakeWordEnabled);
  useEffect(() => {
    if (isWakeWordEnabled && !prevWakeEnabledRef.current) {
      // Turned ON
      resumeAudioContext();
      lastActivityRef.current = Date.now();
      setTimeout(() => {
        switchMode(true, getSTTLanguageCode(language), (text) => {
          console.log('[SR] Wake word detected:', text);
          setIsWakingUp(true);
          setIsSettingsExpanded(false);
          lastActivityRef.current = Date.now();
          setTimeout(() => setIsWakingUp(false), 1000);
          setTimeout(() => {
            startListening(getSTTLanguageCode(language));
          }, 300);
        });
      }, 100);
    } else if (!isWakeWordEnabled && prevWakeEnabledRef.current) {
      // Turned OFF
      stopListening();
    }
    prevWakeEnabledRef.current = isWakeWordEnabled;
  }, [isWakeWordEnabled, language, switchMode, stopListening, startListening, setIsSettingsExpanded]);

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
  }, [isWakeWordEnabled, language, messages, standbyTimeout, stopListening, saveMessages, setIsWakeWordEnabled]);

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
      setShowScrollTop(window.scrollY > 100);
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
  }, [isSettingsExpanded, setIsSettingsExpanded]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  // Grouping logic moved to locales.ts

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

  // Handlers moved to context or localized

  const handleManualTextChange = useCallback((val: string) => {
    if (isListening) {
      stopListening();
    }
    setManualText(val);
    lastActivityRef.current = Date.now();

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
  }, [isListening, isTyping, isWakeWordEnabled, language, messages, saveMessages, stopListening]);

  const handleInputSubmit = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      handleInput();
    }
  }, [isListening, handleInput, stopListening]);

  const handleMicStart = useCallback(() => {
    if (isWakeWordMode) stopListening();
    startListening(getSTTLanguageCode(language));
  }, [isWakeWordMode, language, startListening, stopListening]);

  const handleMicStop = useCallback(() => {
    stopListening();
  }, [stopListening]);

  const handleClearHistory = useCallback(() => {
    if (confirmClearHistory) {
      clearHistory();
      setConfirmClearHistory(false);
    } else {
      setConfirmClearHistory(true);
      if (clearHistoryTimeoutRef.current) clearTimeout(clearHistoryTimeoutRef.current);
      clearHistoryTimeoutRef.current = setTimeout(() => setConfirmClearHistory(false), 3000);
    }
  }, [confirmClearHistory, clearHistory]);

  // performSpeech and handleReplay moved up

  // handleInput block moved up

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

  // Context handles filteredItems and uiStrings

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
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-[90px] pb-6 md:pb-0 relative w-full z-10 transform-gpu flex flex-col gap-1 md:overflow-hidden">

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

        <div className="grid grid-cols-1 md:grid-cols-12 gap-1 md:gap-2 items-stretch md:flex-1 md:overflow-hidden">

          {/* Interaction Column: right on desktop, bottom on mobile */}
          <div className="md:col-span-5 w-full z-10 relative md:order-2 md:h-full md:flex md:flex-col md:overflow-hidden">
            {/* Column Wrapper - Dashboard mode on desktop */}
            <div className="flex flex-col gap-2 flex-1 min-h-0 md:overflow-hidden">
              {/* Header & Settings */}
              <div className="flex flex-col gap-2 relative">
                <SettingsMenu
                  settingsRef={settingsRef}
                  itemsCount={useVilo().items?.length || 0}
                />
              </div>

              {/* Conversation Thread */}
              <div className="flex flex-col gap-2 w-full md:flex-1 min-h-0">
              <ChatPanel
                messages={messages}
                onClearHistory={clearHistory}
                chatScrollProgress={chatScrollProgress}
                scrollRef={scrollRef}
                handleChatScroll={handleChatScroll}
                chatScrollState={chatScrollState}
                isTyping={isTyping}
                isListening={isListening}
                isWakeWordMode={isWakeWordMode}
                processingStatus={processingStatus}
                currentThinkingMessage={currentThinkingMessage}
                manualText={manualText}
                onManualTextChange={handleManualTextChange}
                onInputSubmit={handleInputSubmit}
                onMicStart={handleMicStart}
                onMicStop={handleMicStop}
                transcript={transcript}
                interimTranscript={interimTranscript}
                standbyProgress={standbyProgress}
                handleKeyDown={handleKeyDown}
                inputContainerRef={inputContainerRef}
                onReplay={handleReplay}
              />
            </div>
          </div>
        </div>

        <InventoryPanel
            itemScrollRef={itemScrollRef}
            handleItemScroll={handleItemScroll}
            itemScrollProgress={itemScrollProgress}
            itemScrollState={itemScrollState}
          />
        </div>

        {/* Footer Decoration */}
        <div className="mt-4 md:mt-0 pt-2 text-center opacity-40 text-[10px] tracking-widest uppercase font-bold text-slate-500 pb-2 md:pb-6 lg:pb-0 w-full col-span-1 md:col-span-12">
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

      </main>
      
      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 z-50 w-16 h-16 rounded-full glass border border-white/10 text-emerald-400 shadow-xl shadow-emerald-400/5 hover:text-emerald-300 hover:bg-white/5 transition-all group flex flex-col items-center justify-center p-0"
            aria-label="Scroll to top"
          >
            <ChevronDown className="w-5 h-5 rotate-180 -mt-1 group-hover:-translate-y-1 transition-transform" />
            <span className="text-[8px] font-bold uppercase tracking-widest leading-none mt-1">{uiStrings.scrollToTop}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
