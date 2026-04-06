import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Droplet, Activity, Calendar, Clock, Bell } from 'lucide-react';
import axios from 'axios';

const Home = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [symptoms, setSymptoms] = useState([]);
  const [appointments, setAppointments] = useState([]);

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
        const [profRes, sympRes, apptRes] = await Promise.all([
          axios.get(`http://localhost:3001/api/patient/${user.id}/profile`),
          axios.get(`http://localhost:3001/api/patient/${user.id}/symptoms`),
          axios.get(`http://localhost:3001/api/patient/${user.id}/appointments`)
        ]);
        setProfile(profRes.data.profile);
        setSymptoms(sympRes.data.symptoms);
        setAppointments(apptRes.data.appointments);
      } catch (err) {
        console.error(err);
      }
    };
    if (user?.id) fetchData();
  }, [user?.id]);

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
