'use client';
import { motion, useAnimation } from 'motion/react';
import { useEffect } from 'react';

interface ViloAvatarProps {
  state: 'idle' | 'listening' | 'processing' | 'confirming' | 'error';
}

export function ViloAvatar({ state }: ViloAvatarProps) {
  const headControls = useAnimation();
  const blinkControls = useAnimation();

  useEffect(() => {
    // 1. Smooth Floating Animation
    const floatingAnims = {
      idle: { y: [0, -3, 0], rotate: [0, 0.5, -0.5, 0] },
      listening: { y: [0, -5, 0], scale: [1, 1.03, 1] },
      processing: { scale: [1, 0.97, 1], y: [0, -1, 0] },
      confirming: { y: [0, -8, 0], scale: [1, 1.05, 1] },
      error: { x: [0, -3, 3, -3, 3, 0], y: [0, -1, 0] }
    };
    
    headControls.start({
      ...floatingAnims[state],
      transition: { 
        repeat: state === 'error' ? 0 : Infinity,
        duration: state === 'error' ? 0.4 : (state === 'processing' ? 0.8 : 4), 
        ease: "easeInOut" 
      }
    });

    // 2. Natural Blinking Logic (Hanya untuk Idle & Listening)
    if (state === 'idle' || state === 'listening') {
      blinkControls.start({
        scaleY: [1, 1, 0.1, 1, 1], // Menambah durasi mata terbuka sebelum kedip
        transition: { 
          repeat: Infinity, 
          duration: 3.5, 
          times: [0, 0.8, 0.85, 0.9, 1],
          ease: "easeInOut",
          delay: Math.random() * 2 
        }
      });
    } else {
      blinkControls.set({ scaleY: 1 }); // Mata tetap terbuka di status lain
    }
  }, [state, headControls, blinkControls]);

  return (
    <div className="w-20 h-20 flex items-center justify-center">
      <motion.div 
        animate={headControls} 
        style={{ transformOrigin: 'bottom center' }}
        className="relative w-full h-full"
      >
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Helmet Design */}
          <rect x="10" y="20" width="80" height="65" rx="28" fill="#F1F5F9" />
          <rect x="10" y="25" width="80" height="55" rx="24" fill="white" />
          <rect x="4" y="42" width="10" height="22" rx="4" fill="#CBD5E1" />
          <rect x="86" y="42" width="10" height="22" rx="4" fill="#CBD5E1" />
          
          {/* Dark Visor */}
          <rect x="18" y="32" width="64" height="42" rx="16" fill="#1E293B" />

          {/* Emotional Expressions */}
          <g style={{ transformOrigin: 'center' }}>
            {state === 'error' ? (
              <g stroke="#EF4444" strokeWidth="5" strokeLinecap="round">
                <path d="M30 45 L42 55 M42 45 L30 55" />
                <path d="M58 45 L70 55 M70 45 L58 55" />
              </g>
            ) : state === 'confirming' ? (
              <g>
                <path d="M50 38 L68 66 H32 Z" stroke="#FBBF24" strokeWidth="3" strokeLinejoin="round" />
                <rect x="48.5" y="48" width="3" height="10" rx="1.5" fill="#FBBF24" />
                <circle cx="50" cy="62" r="2" fill="#FBBF24" />
              </g>
            ) : state === 'processing' ? (
              <motion.path 
                animate={{ pathLength: [0, 1], opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                d="M30 52 H40 L45 42 L55 62 L60 52 H70" 
                stroke="#60A5FA" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" 
              />
            ) : (
              <g>
                {/* Scanlines for Listening */}
                {state === 'listening' && (
                   <rect x="25" y="42" width="50" height="20" fill="url(#scanlinePattern)" opacity="0.2" />
                )}
                <motion.ellipse 
                  animate={blinkControls}
                  style={{ transformOrigin: '38px 52px' }}
                  cx="38" cy="52" rx="6" ry="6" 
                  fill={state === 'listening' ? '#22C55E' : '#38BDF8'} 
                />
                <motion.ellipse 
                  animate={blinkControls}
                  style={{ transformOrigin: '62px 52px' }}
                  cx="62" cy="52" rx="6" ry="6" 
                  fill={state === 'listening' ? '#22C55E' : '#38BDF8'} 
                />
              </g>
            )}
          </g>
          
          <defs>
            <pattern id="scanlinePattern" x="0" y="0" width="100%" height="4" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="100%" y2="0" stroke="black" strokeWidth="2" />
            </pattern>
          </defs>
        </svg>
      </motion.div>
    </div>
  );
}
