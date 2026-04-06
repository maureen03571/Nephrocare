import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Send, Users } from 'lucide-react';

const Community = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    const fetchMsgs = async () => {
      try {
        const res = await axios.get('http://localhost:3001/api/community/messages');
        setMessages(res.data.messages || []);
      } catch (err) { }
    };
    fetchMsgs();
    const interval = setInterval(fetchMsgs, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const payload = { senderName: user?.name, senderId: user?.id, content: input, timestamp: new Date().toISOString() };
    
    // Optimistic Update
    setMessages(prev => [...prev, { id: 'temp-'+Date.now(), ...payload }]);
    setInput('');

    try {
      await axios.post('http://localhost:3001/api/community/messages', payload);
    } catch (err) { }
  };

  return (
    <div className="h-full flex flex-col bg-nephro-bg pb-2 mt-2">
      {/* Header */}
      <div className="flex px-5 pb-3 items-center justify-between border-b border-gray-200 backdrop-blur-md bg-white/40 mb-2 shadow-sm rounded-b-3xl">
         <div>
           <h2 className="font-extrabold text-2xl text-nephro-dark flex items-center"><Users className="mr-2 text-nephro-primary" /> Community</h2>
           <p className="text-xs font-semibold text-gray-500 mt-0.5">Share and support each other</p>
         </div>
         <div className="flex space-x-1">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse border border-white"></span>
            <span className="text-[10px] text-green-700 font-bold uppercase tracking-widest mt[-1px]">Live</span>
         </div>
      </div>
      
      {/* Chat Space */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-10 p-5 bg-white/50 rounded-2xl">
            <p className="text-sm font-medium">No messages yet. Be the first to say hello!</p>
          </div>
        )}
        {messages.map(m => {
          const isMine = m.senderId === user?.id || (!m.senderId && m.senderName === user?.name);
          return (
            <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}>
              {!isMine && <span className="text-[10px] text-gray-500 ml-2 mb-1 font-bold">{m.senderName}</span>}
              <div className={`max-w-[85%] rounded-[20px] p-4 text-[13px] font-medium leading-relaxed shadow-sm ${
                isMine
                  ? 'bg-gradient-to-br from-nephro-primary to-nephro-light text-white rounded-br-sm'
                  : 'bg-white text-nephro-dark border border-gray-100 rounded-bl-sm'
              }`}>
                {m.content}
                <div className={`text-[9px] mt-1.5 text-right font-bold ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
                  {new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3">
        <form onSubmit={handleSend} className="flex items-center bg-white/80 backdrop-blur-xl rounded-[24px] shadow-sm border border-gray-200 overflow-hidden px-2 py-1.5">
          <input
            type="text" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 py-3 px-4 focus:outline-none text-sm bg-transparent placeholder-gray-400 font-medium"
          />
          <button type="submit" disabled={!input} className="w-11 h-11 bg-nephro-primary hover:bg-nephro-light hover:-translate-y-0.5 text-white rounded-full disabled:opacity-50 flex items-center justify-center transition-all duration-300">
            <Send size={18} className="translate-x-[-1px] translate-y-[-1px]" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Community;
