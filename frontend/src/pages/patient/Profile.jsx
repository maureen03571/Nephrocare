import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Settings, LogOut, FileText, Bell, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="h-full bg-nephro-bg flex flex-col p-5 overflow-y-auto pb-24">
      <h2 className="text-2xl font-bold text-nephro-dark mb-6 mt-2">Profile & Settings</h2>

      {/* User Info Card */}
      <div className="bg-white rounded-2xl p-6 flex flex-col items-center shadow-sm border border-gray-100 mb-6 relative overflow-hidden">
        <div className="absolute top-0 w-full h-16 bg-nephro-primary"></div>
        <div className="w-20 h-20 bg-white rounded-full p-1 z-10 shadow-md">
          <div className="w-full h-full bg-nephro-accentLight rounded-full flex items-center justify-center text-nephro-primary">
            <User size={36} />
          </div>
        </div>
        <h3 className="mt-3 text-xl font-bold text-nephro-dark">{user?.name}</h3>
        <p className="text-sm text-gray-500">{user?.email}</p>
        <div className="mt-4 flex space-x-2">
          <span className="bg-nephro-bg text-nephro-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            {user?.role}
          </span>
        </div>
      </div>

      {/* Settings Menu */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        <MenuRow icon={<FileText size={20} />} label="Health Profile Data" onClick={() => navigate('/patient/setup')} />
        <MenuRow icon={<Bell size={20} />} label="Notifications" onClick={() => alert('Notifications coming soon.')} />
        <MenuRow icon={<Shield size={20} />} label="Privacy & Security" onClick={() => alert('Security settings securely managed by NephroCare infrastructure.')} />
        <MenuRow icon={<Settings size={20} />} label="App Settings" onClick={() => alert('App settings coming quickly in version 1.1')} />
      </div>

      {/* Logout */}
      <button 
        onClick={handleLogout}
        className="mt-6 flex items-center justify-center w-full py-4 text-red-500 font-bold bg-white rounded-xl shadow-sm border border-red-50 hover:bg-red-50 transition-colors"
      >
        <LogOut size={20} className="mr-2" /> Log Out
      </button>

      <p className="text-center text-xs text-gray-400 mt-8 mb-4">NephroCare v1.0.0</p>
    </div>
  );
};

const MenuRow = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
    <div className="flex items-center text-gray-700">
      <div className="text-nephro-primary bg-nephro-bg p-2 rounded-lg mr-4">
        {icon}
      </div>
      <span className="font-semibold text-sm">{label}</span>
    </div>
    <div className="text-gray-300">›</div>
  </button>
);

export default Profile;
