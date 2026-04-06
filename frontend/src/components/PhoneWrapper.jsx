import React from 'react';

const PhoneWrapper = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-200 md:flex md:items-center md:justify-center md:p-4">
      {/* Phone Mockup Frame - Becomes full screen on mobile */}
      <div className="relative w-full h-screen md:w-[390px] md:h-[844px] bg-white md:rounded-[50px] shadow-2xl overflow-hidden md:border-[12px] border-black">
        {/* Notch - Hidden on real mobile devices to not conflict with native notches */}
        <div className="absolute top-0 inset-x-0 h-7 hidden md:flex justify-center z-50">
          <div className="w-1/2 h-full bg-black rounded-b-2xl"></div>
        </div>
        
        {/* App Content */}
        <div className="w-full h-full relative z-0 overflow-y-auto overflow-x-hidden bg-nephro-bg text-nephro-dark pt-8 md:pt-8 min-h-full">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PhoneWrapper;
