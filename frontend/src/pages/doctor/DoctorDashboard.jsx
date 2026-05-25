import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Users, LogOut, MessageCircle, Bot, Phone, Activity, ClipboardList, ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import AIChat from '../../components/AIChat';
import { API_BASE_URL } from '../../config';

const DoctorDashboard = () => {
  const { user, logout } = useAuth();
  const [patients, setPatients] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview, messages
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [dmInput, setDmInput] = useState('');
  const [dmMessages, setDmMessages] = useState([]);

  useEffect(() => {
    // Fetch real patients
    axios.get(`${API_BASE_URL}/api/users/patients`).then(res => {
      setPatients(res.data.patients || []);
    });
  }, []);

  // Poll direct messages if a patient is selected
  useEffect(() => {
    if (activeTab === 'messages' && selectedPatientId) {
      const fetchDMs = async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/api/dm/${user.id}/${selectedPatientId}`);
          setDmMessages(res.data.messages || []);
        } catch (err) {}
      };
      fetchDMs();
      const intId = setInterval(fetchDMs, 3000);
      return () => clearInterval(intId);
    }
  }, [activeTab, selectedPatientId, user.id]);

  const handleSendDM = async (e) => {
    e.preventDefault();
    if (!dmInput.trim() || !selectedPatientId) return;
    const payload = { fromId: user.id, toId: selectedPatientId, content: dmInput, role: 'doctor' };
    setDmMessages(prev => [...prev, { id: 'dt'+Date.now(), ...payload, timestamp: new Date().toISOString() }]);
    setDmInput('');
    await axios.post(`${API_BASE_URL}/api/dm`, payload);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 relative overflow-hidden">
      {/* Aesthetic Header */}
      <div className="bg-nephro-dark text-white p-6 rounded-b-[40px] shadow-lg relative z-10">
         <div className="absolute top-0 right-0 w-64 h-64 bg-nephro-primary/20 rounded-full blur-[80px]" />
         <div className="flex justify-between items-center relative z-10">
           <div>
             <h2 className="text-2xl font-black tracking-tight drop-shadow-sm">Dr. {user.name}</h2>
             <p className="text-nephro-accentLight/80 text-sm font-semibold mt-1">Doctor Portal</p>
           </div>
           <button onClick={logout} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-all text-white border border-white/10">
             <LogOut size={20} />
           </button>
         </div>

         <div className="flex mt-6 bg-white/10 p-1 rounded-2xl backdrop-blur-md relative z-10 border border-white/20">
           <button onClick={() => { setActiveTab('overview'); setSelectedPatientId(null); }} className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'overview' ? 'bg-white text-nephro-dark shadow-md' : 'text-white/70'}`}>Patients</button>
           <button onClick={() => setActiveTab('messages')} className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'messages' ? 'bg-white text-nephro-dark shadow-md' : 'text-white/70'}`}>Messages</button>
           <button onClick={() => setActiveTab('ai')} className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all flex items-center justify-center ${activeTab === 'ai' ? 'bg-white text-nephro-dark shadow-md' : 'text-white/70'}`}>
             <Bot size={16} className="mr-1"/> AI Assist
           </button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        {activeTab === 'overview' && !selectedPatientId && (
          <div className="space-y-6">
            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-extrabold text-lg text-nephro-dark flex items-center"><Users size={20} className="mr-2 text-nephro-primary"/> Patient Directory</h3>
                <span className="text-xs bg-nephro-bg text-nephro-primary font-bold px-3 py-1 rounded-full">{patients.length} total</span>
              </div>
              
              {patients.length > 0 ? (
                <div className="space-y-3">
                  {patients.map(p => (
                    <div key={p.id} className="flex justify-between items-center p-4 bg-gray-50 border border-gray-100 rounded-[20px] hover:border-nephro-primary/30 transition-all cursor-pointer group"
                         onClick={() => setSelectedPatientId(p.id)}>
                      <div className="flex items-center">
                         <div className="w-10 h-10 rounded-full bg-nephro-bg text-nephro-primary flex items-center justify-center font-bold mr-3 group-hover:bg-nephro-primary group-hover:text-white transition-colors">{p.name.charAt(0)}</div>
                         <div>
                            <p className="font-bold text-nephro-dark text-sm">{p.name}</p>
                            <p className="text-[11px] font-semibold text-gray-500 mt-0.5">{p.profile?.condition || 'Pending Profile'}</p>
                         </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-300 group-hover:text-nephro-primary" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-6 text-sm font-medium">No registered patients.</div>
              )}
            </div>
          </div>
        )}

        {/* Patient Detail View */}
        {activeTab === 'overview' && selectedPatientId && (() => {
          const p = patients.find(pat => pat.id === selectedPatientId);
          if (!p) return null;
          return (
            <div className="space-y-6">
              <button onClick={() => setSelectedPatientId(null)} className="text-nephro-primary font-bold text-sm flex items-center mb-2">
                <ChevronLeft size={16} className="mr-1" /> Back to Directory
              </button>
              
              <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-16 h-16 rounded-full bg-nephro-bg text-nephro-primary flex items-center justify-center text-2xl font-black mr-4 shadow-inner">{p.name.charAt(0)}</div>
                  <div>
                    <h3 className="text-xl font-black text-nephro-dark">{p.name}</h3>
                    <p className="text-sm font-semibold text-nephro-primary">{p.profile?.condition || 'No Condition'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setActiveTab('messages')} className="p-3 bg-nephro-bg text-nephro-primary rounded-full hover:bg-nephro-primary hover:text-white transition-all shadow-sm">
                    <MessageCircle size={20} />
                  </button>
                  <a href={`tel:+254700000000`} className="p-3 bg-green-50 text-green-600 rounded-full hover:bg-green-600 hover:text-white transition-all shadow-sm">
                    <Phone size={20} />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-[20px] shadow-sm border border-gray-100">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Current Stage</h4>
                  <p className="text-lg font-black text-nephro-dark">{p.profile?.stage || 'Unknown'}</p>
                </div>
                <div className="bg-white p-5 rounded-[20px] shadow-sm border border-gray-100">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Health Score</h4>
                  <p className={`text-lg font-black ${p.dashboard?.healthScore?.value >= 80 ? 'text-green-500' : p.dashboard?.healthScore?.value >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                    {p.dashboard?.healthScore?.value || '--'}%
                  </p>
                </div>
              </div>

              {/* Medication and Progress Cards */}
              <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
                <h4 className="font-bold text-sm text-nephro-dark mb-4 border-b border-gray-50 pb-2 flex items-center">
                  <ClipboardList size={16} className="mr-2 text-nephro-primary" /> Medication List
                </h4>
                {p.meds?.length > 0 ? (
                  <div className="space-y-3">
                    {p.meds.map((m, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                        <p className="text-sm font-bold text-nephro-dark">{m.name} <span className="text-[10px] text-gray-400 ml-1 font-medium">{m.dose}</span></p>
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-gray-400 italic">No medications recorded.</p>}
              </div>

              <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
                <h4 className="font-bold text-sm text-nephro-dark mb-4 border-b border-gray-50 pb-2 flex items-center">
                   <Activity size={16} className="mr-2 text-nephro-primary" /> Progress Tracking
                </h4>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-3 bg-blue-50 rounded-2xl">
                      <p className="text-[10px] font-bold text-blue-500 uppercase">Fluid (Today)</p>
                      <p className="text-base font-black text-blue-700">{p.dashboard?.quickStats?.fluidTodayMl || 0} mL</p>
                   </div>
                   <div className="p-3 bg-purple-50 rounded-2xl">
                      <p className="text-[10px] font-bold text-purple-500 uppercase">Symptoms</p>
                      <p className="text-base font-black text-purple-700">{p.dashboard?.quickStats?.symptomsLogged || 0} Logged</p>
                   </div>
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === 'messages' && (
          <div className="h-full flex flex-col pt-2 relative">
             {selectedPatientId ? (
               <>
                 <div className="flex items-center mb-4 pb-4 border-b border-gray-200">
                    <button onClick={() => setSelectedPatientId(null)} className="p-2 bg-gray-100 rounded-full mr-4 text-gray-500 hover:text-nephro-primary transition-all">
                      <ChevronLeft size={20} />
                    </button>
                    <div>
                      <h3 className="font-bold text-nephro-dark">{patients.find(p=>p.id === selectedPatientId)?.name}</h3>
                      <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Active Connection</p>
                    </div>
                 </div>
                 <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
                    {dmMessages.length === 0 && <p className="text-center text-sm text-gray-400 mt-4 font-medium italic">No message history with this patient.</p>}
                    {dmMessages.map(m => {
                      const isMe = m.fromId === user.id;
                      return (
                        <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[85%] rounded-[20px] p-4 text-sm shadow-sm leading-relaxed ${isMe ? 'bg-nephro-primary text-white rounded-br-sm' : 'bg-white border border-gray-100 text-nephro-dark rounded-bl-sm'}`}>
                            {m.content}
                          </div>
                          <span className="text-[9px] text-gray-400 mt-1 font-bold px-1 uppercase tracking-tighter">
                            {new Date(m.timestamp || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      )
                    })}
                 </div>
                 <form onSubmit={handleSendDM} className="flex gap-2 bg-white p-2 rounded-[24px] border border-gray-100 shadow-md">
                    <input type="text" value={dmInput} onChange={(e)=>setDmInput(e.target.value)} placeholder="Type a message..." className="flex-1 bg-gray-50 p-4 rounded-[20px] focus:outline-none focus:bg-white transition-all text-sm font-medium border border-transparent focus:border-nephro-primary/10" />
                    <button type="submit" disabled={!dmInput.trim()} className="w-12 h-12 bg-nephro-dark hover:bg-nephro-primary text-white flex items-center justify-center rounded-full disabled:opacity-50 transition-all shadow-md">
                      <ChevronRight size={24} />
                    </button>
                 </form>
               </>
             ) : (
               <div className="text-center mt-20">
                 <div className="w-16 h-16 bg-nephro-bg rounded-full flex items-center justify-center mx-auto mb-4 text-nephro-primary shadow-sm"><MessageCircle size={28} /></div>
                 <p className="text-gray-500 font-bold">Encrypted Patient Messaging</p>
                 <p className="text-[11px] text-gray-400 mt-1 px-10 leading-relaxed font-semibold uppercase tracking-wider">Select a patient from the directory <br/>to view conversations</p>
                 <button onClick={() => setActiveTab('overview')} className="mt-8 text-white font-black text-sm bg-nephro-primary px-8 py-3.5 rounded-full shadow-lg shadow-nephro-primary/20 hover:scale-105 active:scale-95 transition-all">Go to Patient List</button>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};
export default DoctorDashboard;
