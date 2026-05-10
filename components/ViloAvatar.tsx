'use client';
import { motion } from 'motion/react';
import { memo } from 'react';

interface ViloAvatarProps {
  state: 'idle' | 'listening' | 'processing' | 'confirming' | 'error';
}

export const ViloAvatar = memo(function ViloAvatar({ state }: ViloAvatarProps) {
  // 1. Unified Swaying (Melayang stabil yang tidak reset saat pindah status)
  const swayTransition = {
    duration: 4,
    repeat: Infinity,
    ease: "easeInOut"
  } as const;

  // 2. Eye Darting Logic (Melirik kanan-kiri)
  const eyeDartAnims = {
    idle: { x: [0, 2, -2, 0], transition: { repeat: Infinity, duration: 6, times: [0, 0.4, 0.5, 1], delay: 1 } },
    listening: { x: [0, 3, -3, 0], transition: { repeat: Infinity, duration: 3, times: [0, 0.45, 0.55, 1] } },
    processing: { x: 0 },
    confirming: { x: 0 },
    error: { x: 0 }
  };

  // 3. Eye Glow Logic (Efek bercahaya saat mendengarkan)
  const eyeGlow = state === 'listening' 
    ? "drop-shadow(0 0 4px #10B981) drop-shadow(0 0 8px #10B981)" 
    : "none";

  return (
    <div className="w-20 h-20 flex items-center justify-center">
      <motion.div 
        // Global Sway (Melayang utama yang tetap lanjut meski state berubah)
        animate={{ 
          y: state === 'listening' ? [0, -4, 0] : [0, -2, 0],
          rotate: [0, 0.5, -0.5, 0]
        }}
        transition={swayTransition}
        style={{ transformOrigin: 'bottom center' }}
        className="relative w-full h-full"
      >
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="helmetGradient" x1="50" y1="20" x2="50" y2="85" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F8FAFC" />
              <stop offset="1" stopColor="#F1F5F9" />
            </linearGradient>
            <pattern id="scanlinePattern" width="100" height="2" patternUnits="userSpaceOnUse">
              <rect width="100" height="1" fill="#10B981" />
            </pattern>
          </defs>

          {/* Helmet Design */}
          <rect x="10" y="20" width="80" height="65" rx="28" fill="url(#helmetGradient)" />
          <rect x="10" y="25" width="80" height="55" rx="24" fill="white" />
          <rect x="4" y="42" width="10" height="22" rx="4" fill="#CBD5E1" />
          <rect x="86" y="42" width="10" height="22" rx="4" fill="#CBD5E1" />
          
          {/* Dark Visor */}
          <rect x="18" y="32" width="64" height="42" rx="16" fill="#1E293B" />

          {/* Expressions Area */}
          <motion.g 
            animate={eyeDartAnims[state]}
            style={{ transformOrigin: 'center' }}
          >
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
                stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" 
              />
            ) : (
              <g style={{ filter: eyeGlow }}>
                {/* Scanlines for Listening */}
                {state === 'listening' && (
                   <rect x="25" y="42" width="50" height="20" fill="url(#scanlinePattern)" opacity="0.1" />
                )}
                
                {/* Left Eye */}
                <motion.ellipse 
                  animate={{ 
                    scaleY: [1, 1, 0.1, 1, 1],
                  }}
                  transition={{ repeat: Infinity, duration: 4, times: [0, 0.8, 0.85, 0.9, 1] }}
                  style={{ transformOrigin: '38px 52px' }}
                  cx="38" cy="52" rx="6" ry="6" 
                  fill={state === 'listening' ? '#10B981' : '#38BDF8'} 
                />
                
                {/* Right Eye */}
                <motion.ellipse 
                  animate={{ 
                    scaleY: [1, 1, 0.1, 1, 1],
                  }}
                  transition={{ repeat: Infinity, duration: 4, times: [0, 0.8, 0.85, 0.9, 1] }}
                  style={{ transformOrigin: '62px 52px' }}
                  cx="62" cy="52" rx="6" ry="6" 
                  fill={state === 'listening' ? '#10B981' : '#38BDF8'} 
                />
              </g>
            )}
          </motion.g>
        </svg>
      </motion.div>
    </div>
  );
});
