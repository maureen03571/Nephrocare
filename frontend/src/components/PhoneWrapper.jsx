import React from 'react';

const PhoneWrapper = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center p-4">
      {/* Phone Mockup Frame */}
      <div className="relative w-[390px] h-[844px] bg-white rounded-[50px] shadow-2xl overflow-hidden border-[12px] border-black">
        {/* Notch */}
        <div className="absolute top-0 inset-x-0 h-7 flex justify-center z-50">
          <div className="w-1/2 h-full bg-black rounded-b-2xl"></div>
        </div>
        
        {/* App Content */}
        <div className="w-full h-full relative z-0 overflow-y-auto overflow-x-hidden bg-nephro-bg text-nephro-dark pt-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PhoneWrapper;
