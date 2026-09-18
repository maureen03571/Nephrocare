import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Welcome = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to Auth after 3.5 seconds for wow factor
    const timer = setTimeout(() => {
      navigate('/auth');
    }, 3500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[800px] h-full relative overflow-hidden bg-nephro-dark">
      {/* Deep premium animated background */}
      <div className="absolute inset-0 bg-gradient-to-tr from-nephro-dark via-[#133020] to-[#0d1f15] opacity-95"></div>
      
      {/* Huge Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-nephro-accentLight/20 rounded-full blur-[130px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-nephro-primary/30 rounded-full blur-[140px]"></div>

      {/* Pulsing Glowing Ring */}
      <div className="absolute w-[320px] h-[320px] rounded-full border border-white/5 bg-white/5 backdrop-blur-[2px] animate-[pulse_4s_infinite_alternate] z-0"></div>

      {/* Rotating Kidney Icon with intense Glow */}
      <div className="relative z-10 animate-[bounce_4s_ease-in-out_infinite] drop-shadow-[0_0_40px_rgba(197,232,119,0.5)]">
        <svg
          className="w-44 h-44 animate-[spin_12s_linear_infinite]"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Kidney Shape */}
          <path
            d="M136.5 45.5C118.5 25.5 83.5 28.5 61.5 46.5C39.5 64.5 26.5 98.5 35.5 125.5C44.5 152.5 76.5 174.5 99.5 167.5C122.5 160.5 120.5 130.5 117.5 110.5C114.5 90.5 133.5 86.5 147.5 80.5C161.5 74.5 154.5 65.5 136.5 45.5Z"
            fill="url(#kidney-grad)"
            stroke="#c5e877"
            strokeWidth="3.5"
            strokeDasharray="4 4"
            className="animate-[pulse_3s_infinite_alternate]"
          />
          {/* Inner details */}
          <path
            d="M85 120C100 120 110 100 105 85"
            stroke="#a8d96c"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M60 90C70 95 75 110 70 120"
            stroke="#ffffff"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.8"
          />
          <defs>
            <linearGradient id="kidney-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(26,107,74,0.3)" />
              <stop offset="100%" stopColor="rgba(197,232,119,0.15)" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="mt-12 relative z-10 text-center px-4">
        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-nephro-accentLight to-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] tracking-wider">
          RenAmi
        </h1>
        <p className="mt-4 text-[#d9f2a3] font-bold text-xl tracking-wide">
          Your Kidney Friend
        </p>
      </div>
      
      {/* Loading Indicator */}
      <div className="mt-20 flex space-x-3 relative z-10">
        <div className="w-3.5 h-3.5 bg-nephro-accentLight rounded-full animate-bounce [animation-delay:-0.3s] shadow-[0_0_12px_#a8d96c]"></div>
        <div className="w-3.5 h-3.5 bg-nephro-accentLight rounded-full animate-bounce [animation-delay:-0.15s] shadow-[0_0_12px_#a8d96c]"></div>
        <div className="w-3.5 h-3.5 bg-nephro-accentLight rounded-full animate-bounce shadow-[0_0_12px_#a8d96c]"></div>
      </div>
    </div>
  );
};
export default Welcome;
