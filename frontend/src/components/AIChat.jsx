import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Bot, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AIChat = ({ customTitle = "AI Health Coach", customSubtitle = "Conversational guide to kidney health" }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    { id: 'init', role: 'ai', text: `Hello! I'm your NephroCare AI assistant. How can I help you today?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (user?.id) {
      axios.get(`http://localhost:3001/api/ai/chat/${user.id}`).then(res => {
        if (res.data.history && res.data.history.length > 0) {
          setMessages([
            { id: 'init', role: 'ai', text: "Welcome back! I remember our previous conversations." },
            ...res.data.history.map((h, i) => ({ id: `hist-${i}`, role: h.role, text: h.text }))
          ]);
        }
      });
    }
  }, [user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:3001/api/ai/chat', { userId: user?.id, message: userMsg.text });
      const aiMsg = { id: Date.now() + 1, role: 'ai', text: res.data.reply };
      setMessages(prev => [...prev, aiMsg]);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 pb-2">
      <div className="bg-nephro-primary p-4 rounded-b-3xl shadow-md z-10 sticky top-0">
        <h2 className="text-xl font-bold text-white flex items-center justify-center">
          <Bot className="mr-2" /> {customTitle}
        </h2>
        <p className="text-nephro-accentLight text-center text-xs mt-1 font-medium">{customSubtitle}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-nephro-light text-white flex items-center justify-center mr-2 flex-shrink-0">
                <Bot size={16} />
              </div>
            )}
            <div className={`max-w-[75%] rounded-2xl p-3 text-sm shadow-sm ${m.role === 'user' ? 'bg-nephro-primary text-white rounded-tr-sm' : 'bg-white text-nephro-dark border border-gray-100 rounded-tl-sm'}`}>
              {m.text}
            </div>
            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center ml-2 flex-shrink-0">
                <User size={16} className="text-gray-500" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-nephro-light text-white flex items-center justify-center mr-2"><Bot size={16}/></div>
            <div className="bg-white p-3 rounded-2xl rounded-tl-sm border border-gray-100 flex space-x-1 items-center">
              <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-2 bg-transparent">
        <form onSubmit={handleSend} className="flex items-center bg-white rounded-full shadow-md border border-gray-200 overflow-hidden pr-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 py-3 px-4 focus:outline-none text-sm"
          />
          <button type="submit" disabled={!input} className="p-2 bg-nephro-primary text-white rounded-full disabled:opacity-50">
            <Send size={18} className="translate-x-[-1px] translate-y-[1px]" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIChat;
