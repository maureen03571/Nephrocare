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
      <div className="absolute inset-0 bg-gradient-to-br from-nephro-dark via-nephro-primary to-nephro-dark opacity-90"></div>
      
      {/* Huge Glowing Orbs */}
      <div className="absolute top-0 -left-20 w-[400px] h-[400px] bg-nephro-accentLight/30 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-0 -right-20 w-[400px] h-[400px] bg-nephro-light/40 rounded-full blur-[120px]"></div>

      {/* Rotating Kidney Icon with intense Glow */}
      <div className="relative z-10 animate-[bounce_3s_ease-in-out_infinite] drop-shadow-[0_0_35px_rgba(168,217,108,0.7)]">
        <svg
          className="w-40 h-40 animate-[spin_8s_linear_infinite]"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Kidney Shape */}
          <path
            d="M136.5 45.5C118.5 25.5 83.5 28.5 61.5 46.5C39.5 64.5 26.5 98.5 35.5 125.5C44.5 152.5 76.5 174.5 99.5 167.5C122.5 160.5 120.5 130.5 117.5 110.5C114.5 90.5 133.5 86.5 147.5 80.5C161.5 74.5 154.5 65.5 136.5 45.5Z"
            fill="rgba(255,255,255,0.15)"
            stroke="#c5e877"
            strokeWidth="4"
          />
          {/* Inner details */}
          <path
            d="M85 120C100 120 110 100 105 85"
            stroke="#a8d96c"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M60 90C70 95 75 110 70 120"
            stroke="#ffffff"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="mt-12 relative z-10 text-center">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-nephro-accentLight drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] tracking-wide">
          NephroCare
        </h1>
        <p className="mt-3 text-nephro-accentLight/90 font-medium text-lg tracking-widest uppercase">
          Your Kidney Health
        </p>
      </div>
      
      {/* Loading Indicator */}
      <div className="mt-16 flex space-x-3 relative z-10">
        <div className="w-3 h-3 bg-nephro-accentLight rounded-full animate-bounce [animation-delay:-0.3s] shadow-[0_0_10px_#a8d96c]"></div>
        <div className="w-3 h-3 bg-nephro-accentLight rounded-full animate-bounce [animation-delay:-0.15s] shadow-[0_0_10px_#a8d96c]"></div>
        <div className="w-3 h-3 bg-nephro-accentLight rounded-full animate-bounce shadow-[0_0_10px_#a8d96c]"></div>
      </div>
    </div>
  );
};
export default Welcome;
