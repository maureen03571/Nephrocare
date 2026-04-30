import { Users, HelpCircle, MessageSquarePlus } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';

const Community = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [dailyPrompt, setDailyPrompt] = useState('');

  useEffect(() => {
    const fetchMsgs = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/community/messages`);
        setMessages(res.data.messages || []);
      } catch (err) { }
    };
    const fetchPrompt = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/community/daily-prompt`);
        setDailyPrompt(res.data.prompt || '');
      } catch (err) { }
    };
    fetchMsgs();
    fetchPrompt();
  }, []);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    const payload = {
      senderName: user?.name,
      senderId: user?.id,
      topic: topic.trim() || 'Community discussion',
      content: content.trim(),
      type: 'thread',
      timestamp: new Date().toISOString()
    };

    try {
      await axios.post(`${API_BASE_URL}/api/community/messages`, payload);
      setMessages((prev) => [{ id: `temp-${Date.now()}`, ...payload }, ...prev]);
      setTopic('');
      setContent('');
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
      </div>
      
      {dailyPrompt && (
        <div className="mx-4 my-2 p-4 rounded-2xl bg-blue-50 border border-blue-100">
          <p className="text-xs font-bold text-blue-700 flex items-center"><HelpCircle size={14} className="mr-1" /> Question of the day</p>
          <p className="text-sm text-blue-900 mt-1">{dailyPrompt}</p>
        </div>
      )}

      <div className="mx-4 my-2 p-4 rounded-2xl bg-white border border-gray-100">
        <p className="text-xs font-bold text-nephro-dark flex items-center"><MessageSquarePlus size={14} className="mr-1 text-nephro-primary" /> Start a discussion</p>
        <form onSubmit={handlePost} className="mt-2 space-y-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Discussion topic (e.g. Best low potassium breakfast)"
            className="w-full p-3 rounded-lg border border-gray-200 text-sm outline-none"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your experience or ask a question..."
            rows="3"
            className="w-full p-3 rounded-lg border border-gray-200 text-sm outline-none resize-none"
          />
          <button type="submit" className="w-full py-2.5 rounded-lg bg-nephro-primary text-white text-sm font-bold">Post Discussion</button>
        </form>
      </div>

      {/* Forum Space */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-10 p-5 bg-white/50 rounded-2xl border border-gray-100">
            <p className="text-sm font-medium">Join your first discussion: introduce yourself and share one CKD tip.</p>
          </div>
        )}
        {[...messages].reverse().map(m => {
          const isMine = m.senderId === user?.id;
          return (
            <div key={m.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-gray-500 font-bold">{m.senderName || 'Member'}</span>
                <span className="text-[10px] text-gray-400 font-semibold">
                  {new Date(m.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {m.topic && <p className="text-sm font-bold text-nephro-dark mb-1">{m.topic}</p>}
              <p className={`text-sm leading-relaxed ${isMine ? 'text-nephro-primary font-medium' : 'text-nephro-dark'}`}>{m.content}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Community;
