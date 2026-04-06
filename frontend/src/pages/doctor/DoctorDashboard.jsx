import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Users, LogOut, MessageCircle, Bot } from 'lucide-react';
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
           <button onClick={() => setActiveTab('overview')} className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'overview' ? 'bg-white text-nephro-dark shadow-md' : 'text-white/70'}`}>Overview</button>
           <button onClick={() => setActiveTab('messages')} className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'messages' ? 'bg-white text-nephro-dark shadow-md' : 'text-white/70'}`}>Messages</button>
           <button onClick={() => setActiveTab('ai')} className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all flex items-center justify-center ${activeTab === 'ai' ? 'bg-white text-nephro-dark shadow-md' : 'text-white/70'}`}>
             <Bot size={16} className="mr-1"/> AI Assist
           </button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        {activeTab === 'overview' && (
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
                         onClick={() => { setSelectedPatientId(p.id); setActiveTab('messages'); }}>
                      <div className="flex items-center">
                         <div className="w-10 h-10 rounded-full bg-nephro-bg text-nephro-primary flex items-center justify-center font-bold mr-3 group-hover:bg-nephro-primary group-hover:text-white transition-colors">{p.name.charAt(0)}</div>
                         <div>
                            <p className="font-bold text-nephro-dark text-sm">{p.name}</p>
                            <p className="text-[11px] font-semibold text-gray-500 mt-0.5">{p.profile?.condition || 'Pending Profile'}</p>
                         </div>
                      </div>
                      <MessageCircle size={18} className="text-gray-300 group-hover:text-nephro-primary" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-6 text-sm font-medium">No registered patients.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="h-full flex flex-col pt-2 relative">
             {selectedPatientId ? (
               <>
                 <div className="flex items-center mb-4 pb-4 border-b border-gray-200">
                    <button onClick={() => setSelectedPatientId(null)} className="text-nephro-primary font-bold mr-4 text-sm">← Back</button>
                    <h3 className="font-bold text-nephro-dark">{patients.find(p=>p.id === selectedPatientId)?.name}</h3>
                 </div>
                 <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                    {dmMessages.length === 0 && <p className="text-center text-sm text-gray-400 mt-4 font-medium">No messages yet.</p>}
                    {dmMessages.map(m => {
                      const isMe = m.fromId === user.id;
                      return (
                        <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[80%] rounded-[18px] p-3 text-sm shadow-sm ${isMe ? 'bg-nephro-primary text-white rounded-br-sm' : 'bg-white border border-gray-100 text-nephro-dark rounded-bl-sm'}`}>
                            {m.content}
                          </div>
                        </div>
                      )
                    })}
                 </div>
                 <form onSubmit={handleSendDM} className="flex gap-2">
                    <input type="text" value={dmInput} onChange={(e)=>setDmInput(e.target.value)} placeholder="Reply to patient..." className="flex-1 bg-white border border-gray-200 p-4 rounded-[20px] focus:outline-none focus:border-nephro-primary shadow-sm text-sm" />
                    <button type="submit" disabled={!dmInput.trim()} className="px-6 bg-nephro-dark hover:bg-nephro-primary text-white font-bold rounded-[20px] disabled:opacity-50 transition-all">Send</button>
                 </form>
               </>
             ) : (
               <div className="text-center mt-20">
                 <div className="w-16 h-16 bg-nephro-bg rounded-full flex items-center justify-center mx-auto mb-4 text-nephro-primary"><MessageCircle size={28} /></div>
                 <p className="text-gray-500 font-medium">Select a patient from the overview to <br/>view and send direct messages.</p>
                 <button onClick={() => setActiveTab('overview')} className="mt-6 text-nephro-primary font-bold text-sm bg-white px-6 py-2.5 rounded-full shadow-sm hover:shadow-md transition-all">Back to Overview</button>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};
export default DoctorDashboard;
