'use client';
import React, { RefObject } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Languages, ChevronDown, Volume2, VolumeX, Mic, Ear, EarOff, AlertTriangle } from 'lucide-react';
import { Language } from '@/lib/types';

import { useVilo } from '@/context/ViloContext';

interface SettingsMenuProps {
  settingsRef: RefObject<HTMLDivElement | null>;
  itemsCount: number;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  settingsRef,
  itemsCount
}) => {
  const {
    language, setLanguage,
    isSettingsExpanded, setIsSettingsExpanded,
    voiceEnabled, toggleVoice,
    isHqEnabled, toggleHq,
    voiceSpeed, setVoiceSpeed,
    isWakeWordEnabled, toggleWakeWord,
    standbyTimeout, setStandbyTimeout,
    uiStrings,
    isSupported
  } = useVilo();

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 w-full">
      <div className="flex flex-col gap-4 w-full z-20" ref={settingsRef}>
        <div className="flex items-center justify-between w-full md:w-full gap-2" suppressHydrationWarning>
          <div className="glass rounded-2xl p-1 flex items-center justify-between gap-1 flex-1 md:flex-none custom-scrollbar overflow-x-auto">
            <Languages className="w-4 h-4 ml-2 mr-1 text-slate-400 shrink-0" />
            <button
              onClick={() => setLanguage('su')}
              className={`px-3 py-1.5 flex-1 md:flex-none rounded-xl text-[10px] sm:text-xs font-bold transition-all shrink-0 ${language === 'su' ? 'bg-emerald-400 text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Sunda
            </button>
            <button
              onClick={() => setLanguage('id')}
              className={`px-3 py-1.5 flex-1 md:flex-none rounded-xl text-[10px] sm:text-xs font-bold transition-all shrink-0 ${language === 'id' ? 'bg-emerald-400 text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Indonesia
            </button>
            <button
              onClick={() => setLanguage('en')}
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
                        onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
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
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${itemsCount >= 200 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {itemsCount}/200
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((itemsCount / 200) * 100, 100)}%` }}
                    className={`h-full transition-all duration-500 ${itemsCount >= 200 ? 'bg-amber-400' : 'bg-emerald-400/50'}`}
                  />
                </div>
                {itemsCount >= 200 && (
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
                          onClick={() => setStandbyTimeout(val)}
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
  );
};
