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
      <div className={`relative rounded-full ${isStandby ? 'bg-blue-500/10 shadow-[0_0_40px_rgba(59,130,246,0.15)]' : 'glass-no-outline shadow-[0_0_40px_rgba(16,185,129,0.15)] bg-gradient-to-tr from-emerald-500/10 via-white/5 to-teal-400/10'} backdrop-blur-2xl flex items-center justify-center transition-all duration-500 ${compact ? 'p-1' : 'p-3'}`}>
        {/* Glow Effects */}
        <AnimatePresence>
          {isListening && !isStandby && (
            <motion.div
              key="listening-glow"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 0.3 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-emerald-400 blur-xl"
            />
          )}
          {isStandby && (
             <motion.div
              key="standby-glow"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.3, 0.8], opacity: [0, 0.4, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-blue-400 blur-xl"
            />
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isListening && !isStandby ? onStop : onStart}
          disabled={isLoading}
          className={`relative ${compact ? 'h-14 w-14 lg:h-16 lg:w-16' : 'h-24 w-24 lg:h-32 lg:w-32'} rounded-full flex items-center justify-center shadow-2xl transition-colors duration-500 ${
            isListening && !isStandby
              ? 'bg-red-500 text-white' 
              : isStandby
              ? 'bg-blue-400/20 text-blue-400 border border-blue-400/30 shadow-[0_0_15px_rgba(59,130,246,0.4)]'
              : 'bg-emerald-400 text-slate-900 group-hover:bg-emerald-300'
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
            opacity: [0.5, 1, 0.5],
            boxShadow: [
              "0 0 0 0 rgba(96, 165, 250, 0)",
              "0 0 10px 2px rgba(96, 165, 250, 0.2)",
              "0 0 0 0 rgba(96, 165, 250, 0)"
            ]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className={`flex items-center gap-2 rounded-full bg-blue-400/5 border border-blue-400/20 text-blue-400/80 font-bold uppercase tracking-widest ${compact ? 'text-[9px] px-3 py-1 bg-slate-900/80 backdrop-blur-md shadow-lg drop-shadow-md' : 'text-[10px] px-4 py-1.5'}`}
        >
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className={`${compact ? 'w-1 h-1' : 'w-1.5 h-1.5'} rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]`} 
          />
          <span>{labels.standby}</span>
        </motion.div>
      ) : (
        <p className={`font-medium tracking-wide uppercase transition-colors duration-300 ${compact ? 'text-[9px] text-slate-400/90 drop-shadow-md bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full shadow-lg border border-white/10' : 'text-sm text-slate-400'}`}>
          {isLoading ? labels.loading : isListening ? labels.listening : labels.idle}
        </p>
      )}
    </div>
  );
}
