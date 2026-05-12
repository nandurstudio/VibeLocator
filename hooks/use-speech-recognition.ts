import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Patched Speech Recognition Hook for Mobile Stability
 * Implements State Machine and Proper Cleanup to prevent "cueng-centung" loop.
 */

type RecognitionState = 'IDLE' | 'STARTING' | 'LISTENING' | 'STOPPING';

export const useSpeechRecognition = (options?: {
  onSessionEnd?: (text: string) => void;
  onError?: (error: string) => void;
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isWakeWordMode, setIsWakeWordMode] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const stateRef = useRef<RecognitionState>('IDLE');
  const shouldAutoRestartRef = useRef(false);
  const abortCooldownRef = useRef<number>(0);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onWakeWordDetectedRef = useRef<((text: string) => void) | null>(null);
  const currentLangRef = useRef("id-ID");

  // Constants
  const SILENCE_TIMEOUT = 6500;
  const ABORT_COOLDOWN_MS = 150; // Increased for mobile stability

  const cleanupListeners = (rec: any) => {
    if (!rec) return;
    rec.onstart = null;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
  };

  const startListeningRef = useRef<any>(null);
  const transcriptRef = useRef("");

  // Sync transcript ref
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const stopListening = useCallback(() => {
    console.log('[SR] stopListening called, current state:', stateRef.current);
    
    if (stateRef.current === 'STOPPING' || stateRef.current === 'IDLE') return;

    stateRef.current = 'STOPPING';
    shouldAutoRestartRef.current = false;
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        cleanupListeners(recognitionRef.current);
        recognitionRef.current.abort();
        abortCooldownRef.current = Date.now();
      } catch (e) {
        console.warn('[SR] Error during abort:', e);
      }
      recognitionRef.current = null;
    }

    setIsListening(false);
    stateRef.current = 'IDLE';
  }, []);

  const startListening = useCallback(
    (langCode: string = "id-ID", wakeWordMode: boolean = false, onWakeWordDetected?: (text: string) => void) => {
      // 1. Guard: Check cooldown after abort
      const timeSinceAbort = Date.now() - abortCooldownRef.current;
      if (timeSinceAbort < ABORT_COOLDOWN_MS) {
        console.log('[SR] Cooldown active, rescheduling start...');
        setTimeout(() => startListeningRef.current?.(langCode, wakeWordMode, onWakeWordDetected), ABORT_COOLDOWN_MS - timeSinceAbort + 10);
        return;
      }

      // 2. Guard: Check current state
      if (stateRef.current !== 'IDLE') {
        console.warn(`[SR] Cannot start: current state is ${stateRef.current}. Stopping first...`);
        stopListening();
        setTimeout(() => startListeningRef.current?.(langCode, wakeWordMode, onWakeWordDetected), 50);
        return;
      }

      console.log(`[SR] Starting in ${wakeWordMode ? 'Wake Word' : 'Manual'} mode...`);
      
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.error("Speech Recognition not supported in this browser.");
        return;
      }

      stateRef.current = 'STARTING';
      shouldAutoRestartRef.current = wakeWordMode;
      setIsWakeWordMode(wakeWordMode);
      currentLangRef.current = langCode;
      if (onWakeWordDetected) onWakeWordDetectedRef.current = onWakeWordDetected;

      const recognition = new SpeechRecognition();
      recognition.lang = langCode;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        console.log('[SR] onstart event');
        stateRef.current = 'LISTENING';
        setIsListening(true);
        setLastError(null);
        
        if (!wakeWordMode) {
          setTranscript("");
          setInterimTranscript("");
          transcriptRef.current = "";
        }
        
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          console.log('[SR] Silence timeout reached');
          stopListening();
        }, SILENCE_TIMEOUT);
      };

      recognition.onresult = (event: any) => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => stopListening(), SILENCE_TIMEOUT);
        }

        let interimStr = "";
        let finalStr = "";

        for (let i = 0; i < event.results.length; ++i) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            const trimmedFinal = finalStr.trim().toLowerCase();
            const trimmedChunk = chunk.trim().toLowerCase();
            
            if (trimmedFinal && trimmedChunk.startsWith(trimmedFinal) && trimmedChunk.length > trimmedFinal.length) {
              // Android bug: chunk contains the ENTIRE previous transcript + new words
              finalStr = chunk;
            } else if (trimmedFinal === trimmedChunk) {
              // Exact duplicate chunk emitted (ignore)
            } else {
              // Standard API: new distinct chunk
              if (finalStr && !finalStr.endsWith(' ') && !chunk.startsWith(' ')) {
                finalStr += ' ';
              }
              finalStr += chunk;
            }
          } else {
            interimStr += chunk;
          }
        }

        // Clean up broken Android interim duplicate
        const trimmedFinalForInterim = finalStr.trim().toLowerCase();
        const trimmedInterim = interimStr.trim().toLowerCase();
        if (trimmedFinalForInterim && trimmedInterim.startsWith(trimmedFinalForInterim) && trimmedInterim.length > trimmedFinalForInterim.length) {
            // interim contains final. Strip it out so UI doesn't show duplicates.
            interimStr = interimStr.trim().substring(finalStr.trim().length).trim();
        } else if (trimmedFinalForInterim === trimmedInterim) {
            interimStr = "";
        }

        if (finalStr) {
          const processedFinal = finalStr.trim();
          if (wakeWordMode) {
            if (onWakeWordDetectedRef.current) {
              onWakeWordDetectedRef.current(processedFinal);
            }
          } else {
            setTranscript(processedFinal);
            transcriptRef.current = processedFinal;
          }
        }
        setInterimTranscript(interimStr);
      };

      recognition.onerror = (event: any) => {
        const errorType = event.error;
        console.warn('[SR] onerror event:', errorType);

        if (errorType === "no-speech" || errorType === "aborted") {
          return;
        }

        setLastError(errorType);
        if (options?.onError) options.onError(errorType);

        if (errorType === "not-allowed") {
          stopListening();
        }
      };

      recognition.onend = () => {
        console.log('[SR] onend event. State:', stateRef.current, 'Restart:', shouldAutoRestartRef.current);
        
        const currentState = stateRef.current;
        const shouldRestart = shouldAutoRestartRef.current && (currentState === 'LISTENING' || currentState === 'STARTING');

        if (shouldRestart) {
          console.log('[SR] Attempting auto-restart...');
          stateRef.current = 'IDLE';
          setTimeout(() => {
            if (shouldAutoRestartRef.current) {
              startListeningRef.current?.(currentLangRef.current, true, onWakeWordDetectedRef.current || undefined);
            }
          }, 150);
        } else {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          setIsListening(false);
          stateRef.current = 'IDLE';
          
          // Trigger session end callback if manual mode and we have content
          if (!shouldAutoRestartRef.current && transcriptRef.current && options?.onSessionEnd) {
            const finalTranscript = transcriptRef.current;
            options.onSessionEnd(finalTranscript);
          }
        }
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (e) {
        console.error('[SR] Failed to start recognition:', e);
        stateRef.current = 'IDLE';
      }
    },
    [options, stopListening]
  );

  // Sync startListening ref
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const switchMode = useCallback((wakeMode: boolean, langCode: string = "id-ID", onWakeWordDetected?: (text: string) => void) => {
    console.log('[SR] switchMode to:', wakeMode ? 'WakeWord' : 'Manual');
    stopListening();
    
    setTimeout(() => {
      if (wakeMode) {
        startListeningRef.current?.(langCode, true, onWakeWordDetected);
      } else {
        setIsWakeWordMode(false);
      }
    }, 200);
  }, [stopListening]);


  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        cleanupListeners(recognitionRef.current);
        recognitionRef.current.abort();
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isWakeWordMode,
    lastError,
    startListening,
    stopListening,
    switchMode,
    setTranscript,
    setInterimTranscript,
    getState: () => ({
      state: stateRef.current,
      wakeWordMode: isWakeWordMode,
      shouldRestart: shouldAutoRestartRef.current
    })
  };
};

