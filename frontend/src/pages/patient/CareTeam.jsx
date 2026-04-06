import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Send, UserPlus, Info } from 'lucide-react';

const CareTeam = () => {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    // Fetch available doctors
    axios.get('http://localhost:3001/api/users/doctors').then(res => {
      setDoctors(res.data.doctors || []);
    });
  }, []);

  useEffect(() => {
    if (selectedDoctor) {
      const fetchMsgs = async () => {
        const res = await axios.get(`http://localhost:3001/api/dm/${user.id}/${selectedDoctor.id}`);
        setMessages(res.data.messages || []);
      };
      fetchMsgs();
      const interval = setInterval(fetchMsgs, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedDoctor, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedDoctor) return;

    const payload = { fromId: user.id, toId: selectedDoctor.id, content: input, role: 'patient' };
    
    // Optimistic Update
    setMessages(prev => [...prev, { id: 'temp-'+Date.now(), ...payload, timestamp: new Date().toISOString() }]);
    setInput('');

    try {
      await axios.post('http://localhost:3001/api/dm', payload);
    } catch (err) { }
  };

  if (!selectedDoctor) {
    return (
      <div className="p-5 h-full flex flex-col bg-gray-50">
        <h2 className="text-2xl font-bold mb-4 text-nephro-dark">Your Care Team</h2>
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start mb-6">
          <Info className="text-blue-500 mt-0.5 mr-3 flex-shrink-0" size={20} />
          <p className="text-sm text-blue-800">Select a verified nephrologist to ask questions regarding your treatment or symptoms securely.</p>
        </div>
        
        <div className="space-y-3">
          {doctors.map(doc => (
            <div key={doc.id} onClick={() => setSelectedDoctor(doc)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:border-nephro-primary transition-all">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-nephro-accentLight/30 rounded-full flex items-center justify-center text-nephro-primary mr-4 font-bold text-lg">
                  {doc.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-nephro-dark">Dr. {doc.name}</h4>
                  <p className="text-xs text-gray-500">Nephrologist</p>
                </div>
              </div>
              <UserPlus size={20} className="text-gray-400" />
            </div>
          ))}
          {doctors.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-10">No doctors available on NephroCare yet.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-nephro-bg pb-2 pt-2">
      <div className="flex border-b border-gray-200 pb-3 items-center px-4">
         <button onClick={() => setSelectedDoctor(null)} className="mr-3 text-nephro-primary font-bold">← Back</button>
         <div>
           <h3 className="font-bold text-lg">Dr. {selectedDoctor.name}</h3>
         </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(m => {
          const isMine = m.fromId === user?.id;
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl p-3 text-sm shadow-sm ${
                isMine
                  ? 'bg-nephro-primary text-white rounded-br-sm'
                  : 'bg-white text-nephro-dark border border-gray-100 rounded-bl-sm'
              }`}>
                {m.content}
                <div className={`text-[10px] mt-1 text-right ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                  {new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-3">
        <form onSubmit={handleSend} className="flex items-center bg-white rounded-full shadow-md border border-gray-200 overflow-hidden px-2 py-1">
          <input
            type="text" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={`Message Dr. ${selectedDoctor.name.split(' ')[0]}...`}
            className="flex-1 py-3 px-4 focus:outline-none text-sm"
          />
          <button type="submit" disabled={!input} className="w-10 h-10 bg-nephro-primary text-white rounded-full disabled:opacity-50 flex items-center justify-center">
            <Send size={18} className="translate-x-[-1px] translate-y-[-1px]" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default CareTeam;
