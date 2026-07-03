import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { User, Settings, LogOut, FileText, Bell, Shield, X, Flame, ChevronRight, Palette } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

/* ────────────── Bottom Sheet Modal ────────────── */
const BottomSheet = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.4)' }}>
    <div className="bg-white rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-nephro-dark">{title}</h3>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

/* ────────────── Toggle Row ────────────── */
const ToggleRow = ({ label, description, value, onChange }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
    <div>
      <p className="text-sm font-semibold text-nephro-dark">{label}</p>
      {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${value ? 'bg-nephro-primary' : 'bg-gray-200'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  </div>
);

/* ────────────── MenuRow ────────────── */
const MenuRow = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
    <div className="flex items-center text-gray-700">
      <div className="text-nephro-primary bg-nephro-bg p-2 rounded-lg mr-4">{icon}</div>
      <span className="font-semibold text-sm">{label}</span>
    </div>
    <ChevronRight size={16} className="text-gray-300" />
  </button>
);

/* ═══════════════ Profile Page ═══════════════ */
const Profile = () => {
  const { user, logout } = useAuth();
  const { theme, setAppTheme } = useTheme();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [linkCode, setLinkCode] = useState('');

  /* Modal state */
  const [modal, setModal] = useState(null); // 'notifications' | 'privacy' | 'settings'

  /* App settings (persisted to localStorage) */
  const [settings, setSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nephro_settings') || '{}'); }
    catch { return {}; }
  });
  const saveSetting = (key, val) => {
    const next = { ...settings, [key]: val };
    setSettings(next);
    localStorage.setItem('nephro_settings', JSON.stringify(next));
  };

  /* Notification prefs (persisted to localStorage) */
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nephro_notif') || '{}'); }
    catch { return {}; }
  });
  const saveNotif = (key, val) => {
    const next = { ...notifPrefs, [key]: val };
    setNotifPrefs(next);
    localStorage.setItem('nephro_notif', JSON.stringify(next));
  };

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
        
        // Fetch link code
        const codeRes = await axios.get(`${API_BASE_URL}/api/patient/${user.id}/link-code`);
        setLinkCode(codeRes.data.linkCode);
      } catch (error) {
        console.error('Failed to load profile summary', error);
      }
    };
    fetchProfileData();
  }, [user?.id]);

  const handleLogout = () => { logout(); navigate('/'); };

  const streakDays = dashboard?.streaks?.medicationDays ?? 0;

  return (
    <div className="h-full bg-nephro-bg flex flex-col p-5 overflow-y-auto pb-24">
      <h2 className="text-2xl font-bold text-nephro-dark mb-6 mt-2">Profile &amp; Settings</h2>

      {/* User Info Card */}
      <div className="bg-white rounded-2xl p-6 flex flex-col items-center shadow-sm border border-gray-100 mb-4 relative overflow-hidden">
        <div className="absolute top-0 w-full h-16 bg-nephro-primary" />
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

      {/* 🔥 Streak Card */}
      <div className={`rounded-2xl p-4 shadow-sm border mb-4 flex items-center gap-4 ${streakDays > 0 ? 'bg-orange-50 border-orange-100' : 'bg-white border-gray-100'}`}>
        <div className={`p-3 rounded-xl ${streakDays > 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
          <Flame size={28} className={streakDays > 0 ? 'text-orange-500' : 'text-gray-400'} />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Medication Streak</p>
          <p className={`text-2xl font-extrabold ${streakDays > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
            {streakDays} {streakDays === 1 ? 'day' : 'days'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {streakDays === 0
              ? 'Log a medication in the Track tab to start your streak!'
              : streakDays >= 7
                ? '🏆 Amazing consistency — keep it up!'
                : 'Keep logging daily to build your streak!'}
          </p>
        </div>
      </div>

      {/* Health Summary */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
        <h4 className="text-sm font-bold text-nephro-dark mb-2">My Health Summary</h4>
        <p className="text-xs text-gray-600">CKD Stage: <span className="font-semibold">{onboarding?.ckdStage || profile?.stage || 'Not set'}</span></p>
        <p className="text-xs text-gray-600 mt-1">Latest GFR: <span className="font-semibold">{onboarding?.baselineLabs?.gfr || '--'}</span></p>
        <p className="text-xs text-gray-600 mt-1">Creatinine: <span className="font-semibold">{onboarding?.baselineLabs?.creatinine || '--'}</span></p>
        <p className="text-xs text-gray-600 mt-1">Dialysis status: <span className="font-semibold">{String(profile?.treatments || '').toLowerCase().includes('dialysis') ? 'On dialysis' : 'Not on dialysis'}</span></p>
        <p className="text-xs text-gray-600 mt-1">Symptoms tracked: <span className="font-semibold">{dashboard?.quickStats?.symptomsLogged ?? 0}</span></p>
      </div>

      {/* 🔗 Caregiver Linking Section */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-nephro-primary/10 mb-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 p-3 opacity-10">
          <Shield size={64} className="text-nephro-primary" />
        </div>
        <h4 className="text-sm font-bold text-nephro-dark mb-1">Share Access with Caregiver</h4>
        <p className="text-xs text-gray-500 mb-4">Give this code to your caregiver to link your health updates.</p>
        
        <div className="flex items-center space-x-3">
          <div className="flex-1 bg-nephro-bg border-2 border-dashed border-nephro-primary/30 rounded-xl p-3 flex items-center justify-center">
            <span className="text-2xl font-mono font-black tracking-widest text-nephro-primary">{linkCode || '------'}</span>
          </div>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(linkCode);
              alert('Link code copied to clipboard!');
            }}
            className="bg-nephro-primary text-white p-3 rounded-xl shadow-md active:scale-95 transition-all"
          >
            <Settings size={20} />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-3 italic text-center">Codes are unique and secure. Share only with someone you trust.</p>
      </div>

      {/* Care Team */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
        <h4 className="text-sm font-bold text-nephro-dark mb-2">Care Team &amp; Next Visit</h4>
        <p className="text-xs text-gray-600">Primary doctor: <span className="font-semibold">Dr. Assigned via Care Team</span></p>
        <p className="text-xs text-gray-600 mt-1">
          Next appointment: <span className="font-semibold">
            {appointments[0]?.date ? new Date(appointments[0].date).toLocaleString() : 'No appointment scheduled'}
          </span>
        </p>
      </div>

      {/* Settings Menu */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 mb-6">
        <MenuRow icon={<FileText size={20} />} label="Health Profile Data" onClick={() => navigate('/patient/setup')} />
        <MenuRow icon={<Bell size={20} />} label="Notifications" onClick={() => setModal('notifications')} />
        <MenuRow icon={<Shield size={20} />} label="Privacy &amp; Security" onClick={() => setModal('privacy')} />
        <MenuRow icon={<Settings size={20} />} label="App Settings" onClick={() => setModal('settings')} />
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center justify-center w-full py-4 text-red-500 font-bold bg-white rounded-xl shadow-sm border border-red-50 hover:bg-red-50 transition-colors"
      >
        <LogOut size={20} className="mr-2" /> Log Out
      </button>
      <p className="text-center text-xs text-gray-400 mt-8 mb-4">RenAmi v1.0.0</p>

      {/* ── Notifications Modal ── */}
      {modal === 'notifications' && (
        <BottomSheet title="Notification Preferences" onClose={() => setModal(null)}>
          <ToggleRow
            label="Daily medication reminder"
            description="Reminds you each morning to log your medication"
            value={!!notifPrefs.medReminder}
            onChange={(v) => saveNotif('medReminder', v)}
          />
          <ToggleRow
            label="Lab results reminder"
            description="Nudge you to log results after appointments"
            value={!!notifPrefs.labReminder}
            onChange={(v) => saveNotif('labReminder', v)}
          />
          <ToggleRow
            label="Community activity"
            description="Notify you when someone replies to your posts"
            value={!!notifPrefs.communityNotif}
            onChange={(v) => saveNotif('communityNotif', v)}
          />
          <ToggleRow
            label="Weekly health summary"
            description="A weekly digest of your tracked data"
            value={!!notifPrefs.weeklySummary}
            onChange={(v) => saveNotif('weeklySummary', v)}
          />
          <p className="text-xs text-gray-400 mt-4 text-center">Push notifications will be available in v1.1</p>
        </BottomSheet>
      )}

      {/* ── Privacy & Security Modal ── */}
      {modal === 'privacy' && (
        <BottomSheet title="Privacy &amp; Security" onClose={() => setModal(null)}>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="font-bold text-blue-800 mb-1">🔒 Your data is secure</p>
              <p className="text-xs text-blue-700 leading-relaxed">All health data is stored on secure RenAmi infrastructure. Your information is never sold or shared with third parties without your explicit consent.</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2">
              <p className="text-xs text-gray-600"><span className="font-semibold">Data storage:</span> Your records are stored in an encrypted backend database.</p>
              <p className="text-xs text-gray-600"><span className="font-semibold">Access control:</span> Only you and your assigned care team can view your health data.</p>
              <p className="text-xs text-gray-600"><span className="font-semibold">AI privacy:</span> Messages to the AI Health Coach are used only to provide responses and improve your care experience.</p>
              <p className="text-xs text-gray-600"><span className="font-semibold">Data deletion:</span> Contact your care team to request data deletion at any time.</p>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* ── App Settings Modal ── */}
      {modal === 'settings' && (
        <BottomSheet title="App Settings" onClose={() => setModal(null)}>
          <div className="mb-6">
            <p className="text-sm font-semibold text-nephro-dark mb-3 flex items-center">
              <Palette size={16} className="mr-2 opacity-50" /> Color Theme
            </p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setAppTheme('green')}
                className={`py-3 rounded-xl border-2 text-xs font-bold transition-all ${theme === 'green' ? 'border-nephro-primary bg-nephro-bg text-nephro-primary' : 'border-gray-100 bg-white text-gray-500'}`}
              >
                <div className="w-6 h-6 rounded-full bg-[#1a6b4a] mx-auto mb-2" />
                Nephro Green
              </button>
              <button
                onClick={() => setAppTheme('blue')}
                className={`py-3 rounded-xl border-2 text-xs font-bold transition-all ${theme === 'blue' ? 'border-[#1a4a6b] bg-[#eef4f7] text-[#1a4a6b]' : 'border-gray-100 bg-white text-gray-500'}`}
              >
                <div className="w-6 h-6 rounded-full bg-[#1a4a6b] mx-auto mb-2" />
                Ocean Blue
              </button>
              <button
                onClick={() => setAppTheme('warm')}
                className={`py-3 rounded-xl border-2 text-xs font-bold transition-all ${theme === 'warm' ? 'border-[#8a3619] bg-[#fbf5f2] text-[#8a3619]' : 'border-gray-100 bg-white text-gray-500'}`}
              >
                <div className="w-6 h-6 rounded-full bg-[#8a3619] mx-auto mb-2" />
                Warm Amber
              </button>
            </div>
          </div>
          
          <ToggleRow
            label="Compact view"
            description="Reduce spacing for more content on screen"
            value={!!settings.compactView}
            onChange={(v) => saveSetting('compactView', v)}
          />
          <ToggleRow
            label="Large text"
            description="Increase font size for easier reading"
            value={!!settings.largeText}
            onChange={(v) => saveSetting('largeText', v)}
          />
          <ToggleRow
            label="Show streaks on home"
            description="Display your medication streak on the Home dashboard"
            value={settings.showStreakHome !== false}
            onChange={(v) => saveSetting('showStreakHome', v)}
          />
          <p className="text-xs text-gray-400 mt-4 text-center">More customisation options coming in v1.1</p>
        </BottomSheet>
      )}
    </div>
  );
};

export default Profile;
