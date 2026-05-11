'use client';
import { Mic, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Language } from '@/lib/types';

interface MicButtonProps {
  isListening: boolean;
  onStart: () => void;
  onStop: () => void;
  isLoading?: boolean;
  language: Language;
  compact?: boolean;
  isStandby?: boolean;
  standbyProgress?: number;
}

export function MicButton({ isListening, onStart, onStop, isLoading, language, compact, isStandby, standbyProgress = 0 }: MicButtonProps) {
  const labels = {
    su: { loading: 'Ngolah data, sakedap...', listening: 'Nuju ngupingkeun, Lur...', idle: 'Klik upami bade nyarios', standby: 'Saurkeun: Hey ViLo' },
    id: { loading: 'Sedang memproses...', listening: 'Kakak sedang berbicara...', idle: 'Klik lalu bicara, Kak', standby: 'Katakan: Hey ViLo' },
    en: { loading: 'Processing...', listening: 'I am listening...', idle: 'Click to start talking', standby: 'Say: Hey ViLo' }
  }[language];

  // Radial timer constants
  const radius = 50; // Perfect edge fit for 100x100 viewBox
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (standbyProgress * circumference);
  
  const getStandbyColor = (progress: number) => {
    if (progress > 0.7) return 'rgb(96, 165, 250)'; // blue-400
    if (progress > 0.4) return 'rgb(52, 211, 153)'; // emerald-400
    if (progress > 0.15) return 'rgb(251, 191, 36)'; // amber-400
    return 'rgb(248, 113, 113)'; // red-400
  };

  const standbyColor = getStandbyColor(standbyProgress);

  return (
    <div className={`flex flex-col items-center justify-center ${compact ? 'gap-2 p-1 pointer-events-auto' : 'gap-2 py-2'}`}>
      <div className={`relative rounded-full ${isStandby ? 'bg-blue-500/10 shadow-[0_0_50px_rgba(59,130,246,0.15)] border border-blue-400/20' : 'glass shadow-[0_0_50px_rgba(16,185,129,0.15)] bg-gradient-to-tr from-emerald-500/15 via-white/5 to-teal-400/15 border border-white/10'} backdrop-blur-3xl flex items-center justify-center transition-all duration-500 ${compact ? 'p-1' : 'p-4'}`}>
        {/* Glow Effects */}
        <AnimatePresence>
          {isListening && !isStandby && (
            <motion.div
              key="listening-glow"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 0.4 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-emerald-400/30 blur-2xl transform-gpu will-change-[opacity,transform]"
            />
          )}
          {isStandby && (
            <motion.div
              key="standby-glow"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.4, 0.8], opacity: [0, 0.5, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-blue-400/30 blur-2xl transform-gpu will-change-[opacity,transform]"
            />
          )}
        </AnimatePresence>
        
        {/* Radial Standby Timer - Placed behind the button */}
        <AnimatePresence>
          {isStandby && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5 }}
              className={`absolute pointer-events-none z-0 transform-gpu ${compact ? 'h-14 w-14 lg:h-16 lg:w-16' : 'h-24 w-24 lg:h-20 lg:w-20'}`}
            >
              <svg className="w-full h-full -rotate-90 transform overflow-visible" viewBox="0 0 100 100">
                <motion.circle
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ 
                    pathLength: standbyProgress, 
                    opacity: 1,
                    stroke: standbyColor,
                  }}
                  transition={{ 
                    pathLength: { duration: 0.1, ease: "linear" },
                    stroke: { duration: 0.5 }
                  }}
                  cx="50"
                  cy="50"
                  r={radius}
                  strokeWidth="3"
                  fill="transparent"
                  strokeDasharray={circumference}
                  className="drop-shadow-[0_0_12px_currentColor] will-change-transform"
                  strokeLinecap="round"
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isListening && !isStandby ? onStop : onStart}
          disabled={isLoading}
          className={`relative z-10 ${compact ? 'h-14 w-14 lg:h-16 lg:w-16' : 'h-24 w-24 lg:h-20 lg:w-20'} rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 ${
            isListening && !isStandby
              ? 'bg-gradient-to-b from-red-400 via-red-500 to-red-600 text-white shadow-red-500/50 border-t border-white/20' 
              : isStandby
              ? 'bg-slate-900/80 text-blue-400 border border-blue-400/40 shadow-[0_0_25px_rgba(59,130,246,0.2)]'
              : 'bg-emerald-400 text-slate-900 group-hover:bg-emerald-300 shadow-emerald-400/40'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          id="mic-button"
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className={`${compact ? 'w-6 h-6 lg:w-7 lg:h-7 border-[3px]' : 'w-10 h-10 lg:w-8 lg:h-8 border-4'} border-slate-900 border-t-transparent rounded-full`}
            />
          ) : isListening && !isStandby ? (
            <div className="flex flex-col items-center">
              {/* Unified Visor Screen */}
              <div className={`${compact ? 'w-14 h-9 px-2' : 'w-16 h-11 px-3'} bg-[#1E293B] rounded-2xl border border-white/10 shadow-inner flex flex-col items-center justify-center gap-1`}>
                {/* Eyes - Proportional to original avatar */}
                <div className="flex gap-2.5 mb-0.5">
                  {[0, 1].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
                      transition={{ repeat: Infinity, duration: 4, delay: 0.5, times: [0, 0.8, 0.85, 0.9, 1] }}
                      className={`${compact ? 'w-2 h-2' : 'w-2.5 h-2.5'} rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]`}
                    />
                  ))}
                </div>
                
                {/* Soundwave (Digital Signal) */}
                <div className="flex items-center gap-[2px] h-2">
                  {[0.4, 0.7, 0.5, 0.8, 0.3].map((delay, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [2, 6, 3, 8, 2], opacity: [0.6, 1, 0.6] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: delay, ease: "easeInOut" }}
                      className="w-[2px] bg-emerald-400/80 rounded-full"
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <Mic className={`${compact ? 'w-6 h-6 lg:w-7 lg:h-7' : 'w-10 h-10 lg:w-8 lg:h-8'}`} />
          )}
        </motion.button>
      </div>
      
      {isStandby ? (
        <motion.div 
          animate={{ 
            opacity: [0.7, 1, 0.7],
            boxShadow: [
              "0 0 0 0 rgba(96, 165, 250, 0)",
              "0 0 15px 2px rgba(96, 165, 250, 0.3)",
              "0 0 0 0 rgba(96, 165, 250, 0)"
            ]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className={`flex items-center gap-2 rounded-full border border-blue-400/30 text-blue-400 font-bold uppercase tracking-widest bg-slate-900/80 backdrop-blur-xl shadow-2xl ${compact ? 'text-[9px] px-3 py-1' : 'text-[11px] px-5 py-2'}`}
        >
          <motion.div 
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className={`${compact ? 'w-1 h-1' : 'w-2 h-2'} rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,1)]`} 
          />
          <span>{labels.standby}</span>
        </motion.div>
      ) : (
        <p className={`font-bold tracking-widest uppercase transition-all duration-300 bg-slate-900/80 backdrop-blur-xl rounded-full shadow-2xl border border-white/10 ${compact ? 'text-[9px] text-slate-300 px-3 py-1' : 'text-xs text-emerald-400/90 px-6 py-2'}`}>
          {isLoading ? labels.loading : isListening ? labels.listening : labels.idle}
        </p>
      )}
    </div>
  );
}
