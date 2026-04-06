import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Activity, BookOpen, Home, MessageCircle, User } from 'lucide-react';

const PatientLayout = () => {
  return (
    <div className="h-full flex flex-col relative bg-nephro-bg overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-[-5%] left-[-10%] w-[350px] h-[350px] bg-nephro-accentLight/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[350px] h-[350px] bg-nephro-light/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex-1 overflow-y-auto pb-24 relative z-10 pt-4">
        <Outlet />
      </div>

      {/* Floating Glassmorphism Bottom Taskbar */}
      <div className="absolute bottom-5 left-5 right-5 bg-white/70 backdrop-blur-2xl shadow-[0_15px_40px_rgba(26,107,74,0.15)] rounded-3xl p-2.5 flex justify-between items-center z-50 border border-white/80">
        <NavItem to="/patient/home" icon={<Home size={24} />} label="Home" />
        <NavItem to="/patient/education" icon={<BookOpen size={24} />} label="Learn" />
        <NavItem to="/patient/track" icon={<Activity size={24} />} label="Track" />
        <NavItem to="/patient/community" icon={<MessageCircle size={24} />} label="Community" />
        <NavItem to="/patient/profile" icon={<User size={24} />} label="Profile" />
      </div>
    </div>
  );
};

const NavItem = ({ to, icon, label }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center w-[60px] h-[55px] rounded-2xl transition-all duration-300 ${
          isActive
            ? 'text-white bg-gradient-to-br from-nephro-primary to-nephro-light shadow-[0_8px_20px_rgba(26,107,74,0.35)] transform -translate-y-2'
            : 'text-gray-400 hover:text-nephro-primary hover:bg-white/50'
        }`
      }
    >
      {icon}
      <span className="text-[10px] mt-1 font-bold tracking-wide">{label}</span>
    </NavLink>
  );
};

export default PatientLayout;
