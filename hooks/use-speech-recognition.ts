import { useState, useCallback, useRef, useEffect } from 'react';

export function useSpeechRecognition() {
  const runningRef = useRef(false);
  const wakeWordModeRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const [isWakeWordMode, setIsWakeWordModeState] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onWakeWordDetectedRef = useRef<(() => void) | null>(null);

  const setWakeWordMode = (val: boolean) => {
    wakeWordModeRef.current = val;
    setIsWakeWordModeState(val);
  };

  const startListeningRef = useRef<any>(null);

  const startListening = useCallback((langCode: string = 'id-ID', isWakeWord: boolean = false, onWakeWord?: () => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Browser anda tidak mendukung Speech Recognition.");
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch (e) {}
    }

    runningRef.current = true;
    setWakeWordMode(isWakeWord);
    if (onWakeWord) onWakeWordDetectedRef.current = onWakeWord;

    const recognition = new SpeechRecognition();
    recognition.lang = langCode;
    recognition.continuous = true;
    recognition.interimResults = true;

    const resetSilenceTimer = () => {
      if (wakeWordModeRef.current) return;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (recognitionRef.current && !wakeWordModeRef.current) {
          recognitionRef.current.stop();
        }
      }, 3500); // 3.5 seconds for commands
    };

    recognition.onstart = () => {
      setIsListening(true);
      if (!wakeWordModeRef.current) {
        setTranscript('');
        setInterimTranscript('');
      }
      resetSilenceTimer();
    };

    recognition.onresult = (event: any) => {
      if (!runningRef.current) return;
      resetSilenceTimer();
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      const textToDisplay = finalTranscript + interimTranscript;
      const currentText = textToDisplay.toLowerCase().trim();
      
      if (wakeWordModeRef.current) {
        if (/\b(vilo|pilo|filo|kilo|milo|pillow|willow|villa|hilo|helo|hello|bilo|vido)\b/i.test(currentText) || 
            currentText.includes('vilo') || 
            currentText.includes('pilo') ||
            currentText.includes('filo') ||
            currentText.includes('helo') ||
            currentText.includes('hello')) {
          if (onWakeWordDetectedRef.current) {
            // Immediately stop current recognition to prevent further processing of the current audio buffer
            if (recognitionRef.current) {
                recognitionRef.current.onend = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.abort(); // Using abort to stop immediately
            }
            
            const callback = onWakeWordDetectedRef.current;
            onWakeWordDetectedRef.current = null;
            
            // Explicitly clear all transcript state
            setTranscript('');
            setInterimTranscript('');
            
            setWakeWordMode(false);
            
            // Allow a small delay to ensure the recognition really stops
            setTimeout(() => {
                callback();
            }, 100);
          }
        }
      } else {
        setTranscript(finalTranscript);
        setInterimTranscript(interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      if (!runningRef.current) return;
      
      // Don't log 'no-speech' as an error, it's common and expected in standby mode
      if (event.error !== 'no-speech') {
        console.error("Speech recognition error", event.error);
      }
      
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setIsListening(false);
      
      if (wakeWordModeRef.current && event.error !== 'not-allowed') {
        // Restart faster for no-speech
        const delay = event.error === 'no-speech' ? 100 : 1000;
        setTimeout(() => {
          if (runningRef.current && wakeWordModeRef.current && startListeningRef.current) {
            startListeningRef.current(langCode, true, onWakeWordDetectedRef.current || undefined);
          }
        }, delay);
      }
    };

    recognition.onend = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setIsListening(false);
      
      if (runningRef.current && wakeWordModeRef.current && startListeningRef.current) {
        startListeningRef.current(langCode, true, onWakeWordDetectedRef.current || undefined);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const stopListening = useCallback(() => {
    runningRef.current = false;
    setWakeWordMode(false);
    onWakeWordDetectedRef.current = null;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
  }, []);

  return { isListening, isWakeWordMode, transcript, interimTranscript, startListening, stopListening, setTranscript };
}
