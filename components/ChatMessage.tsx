'use client';
import { useState, useEffect, memo } from 'react';
import { motion } from 'motion/react';
import { Languages, Volume2 } from 'lucide-react';
import { Message, Language } from '@/lib/types';
import { ViloAvatar } from '@/components/ViloAvatar';

export const TerminalTypewriter = ({ text, onComplete, isNew, showCursorAlways }: { text: string, onComplete?: () => void, isNew: boolean, showCursorAlways?: boolean }) => {
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

export const ChatMessage = memo(({
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
