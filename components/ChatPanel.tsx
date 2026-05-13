'use client';
import React, { RefObject } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, Trash2, Loader2, Mic, Send } from 'lucide-react';
import { Language, Message } from '@/lib/types';
import { ChatMessage } from '@/components/ChatMessage';
import { ViloAvatar } from '@/components/ViloAvatar';
import { MicButton } from '@/components/MicButton';
import { groupMessagesByDate, getSTTLanguageCode, formatTime } from '@/lib/locales';

import { useVilo } from '@/context/ViloContext';

interface ChatPanelProps {
  messages: Message[];
  onClearHistory: () => void;
  chatScrollProgress: number;
  scrollRef: RefObject<HTMLDivElement | null>;
  handleChatScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  chatScrollState: { top: boolean; bottom: boolean };
  isTyping: boolean;
  isListening: boolean;
  isWakeWordMode: boolean;
  processingStatus: 'idle' | 'processing' | 'confirming' | 'error';
  currentThinkingMessage: string;
  manualText: string;
  onManualTextChange: (val: string) => void;
  onInputSubmit: () => void;
  onMicStart: () => void;
  onMicStop: () => void;
  transcript: string;
  interimTranscript: string;
  standbyProgress: number;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  inputContainerRef: RefObject<HTMLDivElement | null>;
  onReplay: (msg: Message) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onClearHistory,
  chatScrollProgress,
  scrollRef,
  handleChatScroll,
  chatScrollState,
  isTyping,
  isListening,
  isWakeWordMode,
  processingStatus,
  currentThinkingMessage,
  manualText,
  onManualTextChange,
  onInputSubmit,
  onMicStart,
  onMicStop,
  transcript,
  interimTranscript,
  standbyProgress,
  handleKeyDown,
  inputContainerRef,
  onReplay
}) => {
  const { language, uiStrings, isWakeWordEnabled, setIsSettingsExpanded } = useVilo();
  
  const [confirmClearHistory, setConfirmClearHistory] = React.useState(false);
  const clearHistoryTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    return () => {
      if (clearHistoryTimeoutRef.current) clearTimeout(clearHistoryTimeoutRef.current);
    };
  }, []);

  const handleClearHistoryClick = () => {
    if (confirmClearHistory) {
      onClearHistory();
      setConfirmClearHistory(false);
    } else {
      setConfirmClearHistory(true);
      if (clearHistoryTimeoutRef.current) clearTimeout(clearHistoryTimeoutRef.current);
      clearHistoryTimeoutRef.current = setTimeout(() => setConfirmClearHistory(false), 3000);
    }
  };

  const renderSTTContent = () => {
    if (!transcript && !interimTranscript) {
      return <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="inline text-emerald-400 font-bold ml-[2px]">_</motion.span>;
    }

    if (interimTranscript) {
      let displayInterim = interimTranscript;
      if (transcript && interimTranscript.toLowerCase().trim().startsWith(transcript.toLowerCase().trim())) {
        displayInterim = interimTranscript.substring(transcript.length);
      }

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

  return (
    <div className="flex flex-col gap-2 w-full md:flex-1 min-h-0">
      <div className="flex justify-between items-center px-1 shrink-0">
        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <History className="w-3 h-3" />
          {uiStrings.historyTitle}
        </h3>
        {messages.length > 0 && (
          <button
            onClick={handleClearHistoryClick}
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

      <div className="relative rounded-xl overflow-hidden bg-slate-900/20 backdrop-blur-md flex flex-col h-[65vh] md:flex-1 min-h-[300px] border border-white/5 shadow-xl">
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
            {groupMessagesByDate(messages, language).map((group) => (
              <div key={group.label} className="flex flex-col gap-4 mb-4">
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
                                onReplay={onReplay}
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

      {/* Sticky Action Center (Desktop) */}
      <div className="hidden md:flex flex-col w-full shrink-0 mt-auto sticky bottom-0 z-20 gap-0 pt-0">
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
                onChange={(e) => onManualTextChange(e.target.value)}
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
                onClick={onInputSubmit}
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

        <div className="flex w-full justify-center pt-1 pb-2 rounded-b-2xl rounded-t-none glass border border-t-0 border-white/5 shadow-xl bg-slate-900/60 backdrop-blur-xl">
          <MicButton
            isListening={isListening && !isWakeWordMode}
            onStart={onMicStart}
            onStop={onMicStop}
            isLoading={processingStatus === 'processing'}
            language={language}
            isStandby={isWakeWordMode}
            standbyProgress={standbyProgress}
          />
        </div>
      </div>

      {/* Mobile Sticky Action Center */}
      <div className="md:hidden sticky bottom-0 z-40 pointer-events-none w-full">
        <div className="pointer-events-auto w-full flex flex-col items-center">
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
                  onChange={(e) => onManualTextChange(e.target.value)}
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
                  onClick={onInputSubmit}
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

          <div className="pointer-events-auto w-full flex flex-col items-center justify-center pt-1 pb-1 rounded-b-2xl rounded-t-none glass border border-t-0 border-white/5 shadow-xl bg-slate-900/60 backdrop-blur-xl">
            <MicButton
              isListening={isListening && !isWakeWordMode}
              onStart={onMicStart}
              onStop={onMicStop}
              isLoading={processingStatus === 'processing'}
              language={language}
              isStandby={isWakeWordMode}
              standbyProgress={standbyProgress}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
