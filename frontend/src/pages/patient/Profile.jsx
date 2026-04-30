import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Settings, LogOut, FileText, Bell, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.id) return;
      try {
        const [profileRes, onboardingRes, dashboardRes, appointmentsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/patient/${user.id}/profile`),
          axios.get(`${API_BASE_URL}/api/patient/${user.id}/onboarding`),
          axios.get(`${API_BASE_URL}/api/patient/${user.id}/dashboard`),
          axios.get(`${API_BASE_URL}/api/patient/${user.id}/appointments`)
        ]);
        setProfile(profileRes.data.profile || null);
        setOnboarding(onboardingRes.data.onboarding || null);
        setDashboard(dashboardRes.data.dashboard || null);
        setAppointments(appointmentsRes.data.appointments || []);
      } catch (error) {
        console.error('Failed to load profile summary', error);
      }
    };

    fetchProfileData();
  }, [user?.id]);

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

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
        <h4 className="text-sm font-bold text-nephro-dark mb-2">My Health Summary</h4>
        <p className="text-xs text-gray-600">CKD Stage: <span className="font-semibold">{onboarding?.ckdStage || profile?.stage || 'Not set'}</span></p>
        <p className="text-xs text-gray-600 mt-1">Latest GFR: <span className="font-semibold">{onboarding?.baselineLabs?.gfr || '--'}</span></p>
        <p className="text-xs text-gray-600 mt-1">Creatinine: <span className="font-semibold">{onboarding?.baselineLabs?.creatinine || '--'}</span></p>
        <p className="text-xs text-gray-600 mt-1">Dialysis status: <span className="font-semibold">{String(profile?.treatments || '').toLowerCase().includes('dialysis') ? 'On dialysis' : 'Not on dialysis'}</span></p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
        <h4 className="text-sm font-bold text-nephro-dark mb-2">Care Team & Next Visit</h4>
        <p className="text-xs text-gray-600">Primary doctor: <span className="font-semibold">Dr. Assigned via Care Team</span></p>
        <p className="text-xs text-gray-600 mt-1">Next appointment: <span className="font-semibold">{appointments[0]?.date ? new Date(appointments[0].date).toLocaleString() : 'No appointment scheduled'}</span></p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
        <h4 className="text-sm font-bold text-nephro-dark mb-2">Emergency & Achievements</h4>
        <p className="text-xs text-gray-600">When to call doctor: severe swelling, breathing difficulty, chest pain, no urine output.</p>
        <p className="text-xs text-gray-600 mt-2">Medication streak: <span className="font-semibold">{dashboard?.streaks?.medicationDays ?? 0} days</span></p>
        <p className="text-xs text-gray-600 mt-1">Symptoms tracked: <span className="font-semibold">{dashboard?.quickStats?.symptomsLogged ?? 0}</span></p>
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
