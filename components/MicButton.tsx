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
}

export function MicButton({ isListening, onStart, onStop, isLoading, language, compact, isStandby }: MicButtonProps) {
  const labels = {
    su: { loading: 'Ngolah data, sakedap...', listening: 'Akang nuju ngomong...', idle: 'Klik tos éta ngomong, A', standby: 'Saurkeun: Hey Vilo' },
    id: { loading: 'Sedang memproses...', listening: 'Kakak sedang berbicara...', idle: 'Klik lalu bicara, Kak', standby: 'Katakan: Hey Vilo' },
    en: { loading: 'Processing...', listening: 'I am listening...', idle: 'Click to start talking', standby: 'Say: Hey Vilo' }
  }[language];

  return (
    <div className={`flex flex-col items-center justify-center ${compact ? 'gap-2 p-1 pointer-events-auto' : 'gap-4 py-8'}`}>
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
              className="absolute inset-0 rounded-full bg-emerald-400/40 blur-2xl"
            />
          )}
          {isStandby && (
            <motion.div
              key="standby-glow"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.4, 0.8], opacity: [0, 0.5, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-blue-400/40 blur-2xl"
            />
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isListening && !isStandby ? onStop : onStart}
          disabled={isLoading}
          className={`relative ${compact ? 'h-14 w-14 lg:h-16 lg:w-16' : 'h-24 w-24 lg:h-32 lg:w-32'} rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 ${
            isListening && !isStandby
              ? 'bg-red-500 text-white shadow-red-500/40' 
              : isStandby
              ? 'bg-blue-400/20 text-blue-400 border border-blue-400/30 shadow-[0_0_20px_rgba(59,130,246,0.5)]'
              : 'bg-emerald-400 text-slate-900 group-hover:bg-emerald-300 shadow-emerald-400/40'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          id="mic-button"
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className={`${compact ? 'w-6 h-6 lg:w-7 lg:h-7 border-[3px]' : 'w-10 h-10 lg:w-12 lg:h-12 border-4'} border-slate-900 border-t-transparent rounded-full`}
            />
          ) : isListening && !isStandby ? (
            <Square className={`${compact ? 'w-6 h-6 lg:w-7 lg:h-7' : 'w-10 h-10 lg:w-12 lg:h-12'}`} fill="currentColor" />
          ) : (
            <Mic className={`${compact ? 'w-6 h-6 lg:w-7 lg:h-7' : 'w-10 h-10 lg:w-12 lg:h-12'}`} />
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
