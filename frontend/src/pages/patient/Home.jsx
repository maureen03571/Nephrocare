import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Droplet, Activity, Calendar, Clock, Bell, Sparkles, Trophy, ShieldCheck, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

const Home = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [symptoms, setSymptoms] = useState([]);
  const [weights, setWeights] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [resolvingAlertId, setResolvingAlertId] = useState(null);

  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
      const timer = setTimeout(() => {
        if (Notification.permission === 'granted') {
          new Notification('NephroCare Reminder', { body: 'Time for your 1L water intake and Lisinopril!' });
        } else {
          alert('NephroCare Reminder: Time for your 1L water intake and Lisinopril!');
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profRes, sympRes, weightRes, apptRes, dashboardRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/patient/${user.id}/profile`),
          axios.get(`${API_BASE_URL}/api/patient/${user.id}/symptoms`),
          axios.get(`${API_BASE_URL}/api/patient/${user.id}/weight`),
          axios.get(`${API_BASE_URL}/api/patient/${user.id}/appointments`),
          axios.get(`${API_BASE_URL}/api/patient/${user.id}/dashboard`)
        ]);
        setProfile(profRes.data.profile);
        setSymptoms(sympRes.data.symptoms);
        setWeights(weightRes.data.weights || []);
        setAppointments(apptRes.data.appointments);
        setDashboard(dashboardRes.data.dashboard || null);
      } catch (err) {
        console.error(err);
      }
    };
    if (user?.id) fetchData();
  }, [user?.id]);

  const quickStats = useMemo(() => {
    const sorted = [...weights].sort((a, b) => new Date(b.date) - new Date(a.date));
    const today = sorted[0];
    const previous = sorted[1];
    const todayValue = today ? Number(today.value) : null;
    const prevValue = previous ? Number(previous.value) : null;
    const delta = todayValue !== null && prevValue !== null ? (todayValue - prevValue).toFixed(1) : null;
    return {
      weightToday: todayValue,
      weightYesterday: prevValue,
      weightDelta: delta
    };
  }, [weights]);

  const healthChecks = [
    { label: 'Stayed hydrated', done: true },
    { label: 'Meds on time', done: true },
    { label: 'BP stable', done: symptoms.filter(s => s.severity === 'High').length === 0 }
  ];

  const priorityActions = [
    { title: 'Take 2 medications in next hour', note: 'Morning kidney regimen', icon: <Bell size={18} /> },
    { title: 'Log morning weight', note: 'Fluid retention check', icon: <Activity size={18} /> },
    { title: 'Dialysis in 3 hours', note: 'Pre-session checklist ready', icon: <Clock size={18} /> }
  ];

  const healthScoreValue = dashboard?.healthScore?.value ?? null;
  const streakDays = dashboard?.streaks?.medicationDays ?? 0;
  const alertItems = dashboard?.alerts || [];
  const quickStatsFromApi = dashboard?.quickStats || {};

  const resolveAlert = async (alertId) => {
    try {
      setResolvingAlertId(alertId);
      await axios.put(`${API_BASE_URL}/api/patient/${user.id}/alerts/${alertId}/resolve`);
      setDashboard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          alerts: (prev.alerts || []).filter((alert) => alert.id !== alertId)
        };
      });
    } catch (error) {
      console.error('Failed to resolve alert', error);
    } finally {
      setResolvingAlertId(null);
    }
  };

  return (
    <div className="px-5 py-4 min-h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 backdrop-blur-sm bg-white/30 p-4 rounded-3xl border border-white/50 shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold text-nephro-dark tracking-tight">Hi, {profile?.name || user?.name?.split(' ')[0]}</h1>
          <p className="text-sm text-nephro-primary font-bold mt-1 bg-nephro-accentLight/20 inline-block px-3 py-1 rounded-full border border-nephro-accentLight/50">
            {profile?.condition || 'Kidney Care'} • {profile?.stage || ''}
          </p>
        </div>
        <div className="w-14 h-14 bg-gradient-to-tr from-nephro-accentLight to-white rounded-full flex items-center justify-center text-nephro-primary shadow-[0_4px_15px_rgba(168,217,108,0.4)] border border-white">
          <Activity size={28} />
        </div>
      </div>

      {/* Reminders / Tasks */}
      <h3 className="font-bold text-lg mb-4 text-nephro-dark/90 px-1">Today's Focus</h3>
      <div className="space-y-4">
        <ReminderCard title="Drink Water (1L target)" time="All Day" icon={<Droplet size={22} />} theme="blue" />
        <ReminderCard title="Lisinopril 10mg" time="08:00 AM" icon={<Bell size={22} />} theme="green" />
        {(profile?.treatments?.toLowerCase().includes('dialysis') || true) && (
          <ReminderCard title="Dialysis Session" time="02:00 PM" icon={<Clock size={22} />} theme="orange" />
        )}
      </div>

      <h3 className="font-bold text-lg mb-4 mt-10 text-nephro-dark/90 px-1">Today's Priority Actions</h3>
      <div className="space-y-3">
        {priorityActions.map((action) => (
          <div key={action.title} className="bg-white/80 rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-nephro-bg text-nephro-primary flex items-center justify-center">
                {action.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-nephro-dark">{action.title}</p>
                <p className="text-xs text-gray-500">{action.note}</p>
              </div>
            </div>
            <button className="text-xs px-3 py-1.5 rounded-full bg-nephro-primary text-white font-semibold">Done</button>
          </div>
        ))}
      </div>

      <h3 className="font-bold text-lg mb-4 mt-10 text-nephro-dark/90 px-1">Health Score Card</h3>
      <div className="bg-white/80 rounded-3xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-extrabold text-nephro-dark">You are doing well this week</p>
            <p className="text-xs text-gray-500">
              {healthScoreValue !== null ? `Current score: ${healthScoreValue}/100` : 'Keep your consistency for better kidney outcomes.'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
        </div>
        <div className="space-y-2">
          {healthChecks.map((check) => (
            <div key={check.label} className="flex items-center justify-between text-sm">
              <span className="text-nephro-dark">{check.label}</span>
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${check.done ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {check.done ? 'Good' : 'Watch'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <h3 className="font-bold text-lg mb-4 mt-10 text-nephro-dark/90 px-1">Quick Stats</h3>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Weight Today" value={quickStats.weightToday !== null ? `${quickStats.weightToday} kg` : '--'} sub="Latest log" />
        <StatCard label="Yesterday" value={quickStats.weightYesterday !== null ? `${quickStats.weightYesterday} kg` : '--'} sub="Previous log" />
        <StatCard label="Change" value={quickStatsFromApi.weightDelta !== null && quickStatsFromApi.weightDelta !== undefined ? `${quickStatsFromApi.weightDelta} kg` : (quickStats.weightDelta !== null ? `${quickStats.weightDelta} kg` : '--')} sub="Today vs yesterday" />
        <StatCard label="Meds Tracked" value={quickStatsFromApi.medicationsTracked ?? 0} sub="Medication logs" />
      </div>

      <h3 className="font-bold text-lg mb-4 mt-10 text-nephro-dark/90 px-1">Motivation</h3>
      <div className="bg-gradient-to-r from-nephro-primary to-nephro-light text-white rounded-3xl p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">{streakDays}-day medication streak</p>
            <p className="text-xs text-white/80 mt-1">You are building excellent habits.</p>
          </div>
          <Sparkles size={20} />
        </div>
        <div className="mt-4 flex gap-2">
          <Badge label="Hydration Hero" />
          <Badge label="Stable Labs" />
          <Badge label="Track Champion" />
        </div>
      </div>

      <h3 className="font-bold text-lg mb-4 mt-10 text-nephro-dark/90 px-1">Care Alerts</h3>
      {alertItems.length > 0 ? (
        <div className="space-y-3">
          {alertItems.map((alert) => (
            <div key={alert.id} className="bg-white/80 rounded-2xl border border-gray-100 p-4 shadow-sm flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center mt-0.5">
                <AlertCircle size={16} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-nephro-dark">{alert.message}</p>
                <p className="text-xs text-gray-500 mt-1 capitalize">{alert.severity} priority</p>
              </div>
              <button
                type="button"
                onClick={() => resolveAlert(alert.id)}
                disabled={resolvingAlertId === alert.id}
                className="text-xs px-3 py-1.5 rounded-full bg-nephro-primary text-white font-semibold disabled:opacity-50"
              >
                {resolvingAlertId === alert.id ? 'Resolving...' : 'Resolve'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white/60 backdrop-blur-md rounded-[24px] p-5 shadow-sm border border-white text-center">
          <p className="text-sm font-medium text-gray-500">No active alerts. Keep up the consistency.</p>
        </div>
      )}

      {/* Recent Symptoms */}
      <h3 className="font-bold text-lg mb-4 mt-10 text-nephro-dark/90 px-1">Recent Symptoms</h3>
      {symptoms.length > 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-[24px] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-white">
          {symptoms.slice(-2).reverse().map((s, idx) => (
            <div key={s.id} className={`flex justify-between items-center py-3 ${idx === 0 ? 'border-b border-gray-100 mb-2' : ''}`}>
              <div>
                <p className="font-bold text-sm text-nephro-dark">{s.type}</p>
                <p className="text-xs text-gray-500 mt-0.5">{new Date(s.date).toLocaleDateString()}</p>
              </div>
              <span className={`text-[10px] px-3 py-1.5 rounded-full font-bold uppercase tracking-wider ${s.severity === 'High' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-yellow-50 text-yellow-600 border border-yellow-100'}`}>
                {s.severity}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white/60 backdrop-blur-md rounded-[24px] p-5 shadow-sm border border-white text-center">
          <p className="text-sm font-medium text-gray-500">No recent symptoms logged. Great!</p>
        </div>
      )}

      {/* Upcoming Appointments */}
      <h3 className="font-bold text-lg mb-4 mt-10 text-nephro-dark/90 px-1">Upcoming Appointments</h3>
      {appointments.length > 0 ? (
        <div className="space-y-4 pb-2">
          {appointments.map(a => (
            <div key={a.id} className="bg-white/80 backdrop-blur-xl p-5 rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-white flex items-center transition-transform hover:-translate-y-1 duration-300">
              <div className="bg-gradient-to-br from-nephro-bg to-nephro-accentLight/30 p-3.5 rounded-2xl text-nephro-primary mr-4 shadow-inner">
                <Calendar size={24} />
              </div>
              <div>
                <p className="font-bold text-nephro-dark">{a.title}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">{new Date(a.date).toLocaleString()} • {a.doctorName}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white/60 backdrop-blur-md rounded-[24px] p-6 shadow-sm border border-white flex items-center text-gray-500 mb-6">
          <Calendar size={24} className="mr-4 text-gray-400" />
          <p className="text-sm font-medium">No upcoming appointments.</p>
        </div>
      )}

      {/* Care Team Action */}
      <h3 className="font-bold text-lg mb-4 mt-8 text-nephro-dark/90 px-1">Your Care Team</h3>
      <Link to="/patient/care-team" className="block bg-gradient-to-r from-nephro-dark to-nephro-primary p-5 rounded-[24px] mb-8 shadow-lg shadow-nephro-primary/20 flex items-center justify-between transition-transform hover:scale-[1.02]">
        <div className="flex items-center space-x-4">
           <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md text-white"><Bell size={24} /></div>
           <div>
             <p className="font-extrabold text-white">Message Doctor</p>
             <p className="text-xs text-white/70 font-medium mt-1">Connect with registered Nephrologists</p>
           </div>
        </div>
      </Link>
    </div>
  );
};

const StatCard = ({ label, value, sub }) => (
  <div className="bg-white/80 rounded-2xl border border-gray-100 p-4 shadow-sm">
    <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
    <p className="text-lg font-extrabold text-nephro-dark mt-1">{value}</p>
    <p className="text-xs text-gray-500 mt-1">{sub}</p>
  </div>
);

const Badge = ({ label }) => (
  <div className="text-[11px] font-semibold bg-white/15 border border-white/20 px-3 py-1.5 rounded-full flex items-center gap-1">
    <Trophy size={12} />
    {label}
  </div>
);

const ReminderCard = ({ title, time, icon, theme }) => {
  const themes = {
    blue: 'from-blue-50 to-blue-100/50 text-blue-700 border-blue-200 shadow-[0_8px_20px_rgba(59,130,246,0.1)]',
    green: 'from-nephro-bg to-nephro-accentLight/30 text-nephro-primary border-nephro-accentLight/50 shadow-[0_8px_20px_rgba(26,107,74,0.1)]',
    orange: 'from-orange-50 to-orange-100/50 text-orange-700 border-orange-200 shadow-[0_8px_20px_rgba(249,115,22,0.1)]'
  };

  return (
    <div className={`bg-gradient-to-r ${themes[theme]} p-5 rounded-[24px] border transition-all duration-300 hover:scale-[1.02] flex items-center justify-between backdrop-blur-md`}>
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-white/80 rounded-2xl shadow-sm backdrop-blur-sm">{icon}</div>
        <div>
          <p className="font-extrabold text-sm tracking-tight">{title}</p>
          <p className="text-xs font-semibold opacity-70 mt-1">{time}</p>
        </div>
      </div>
      <div className="w-6 h-6 rounded-full border-[3px] border-current opacity-30 flex-shrink-0"></div>
    </div>
  );
};

export default Home;
