import React, { useState } from 'react';
import AIChat from '../../components/AIChat';

const Education = () => {
  const [ckdStage, setCkdStage] = useState('Stage 3a');

  const lessons = [
    { title: 'What is GFR?', duration: '60 sec', level: 'Beginner' },
    { title: 'Why limit potassium?', duration: '55 sec', level: 'Stage-focused' },
    { title: 'How to read your labs', duration: '75 sec', level: 'Practical' }
  ];

  const foodSwaps = [
    { from: 'Banana (high K)', to: 'Apple (lower K)' },
    { from: 'Tomato soup', to: 'Cauliflower soup' },
    { from: 'Cola', to: 'Lemon water' }
  ];

  const recommendedToday = {
    title: 'Recommended for you: Why limit potassium?',
    reason: 'Based on your Stage 3 focus and recent tracking patterns.'
  };

  const dailyTip = 'Daily Tip: If you feel unusually tired, check hydration and log symptoms before noon for better trend tracking.';
  const essentialsDone = 3;
  const essentialsTotal = 10;
  const essentialsPercent = Math.round((essentialsDone / essentialsTotal) * 100);

  return (
    <div className="p-5 space-y-4">
      <AIChat customTitle="AI Health Coach" customSubtitle="Get urgent answers about symptoms, labs, and diet choices" />

      <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-bold text-yellow-700">Daily actionable tip</p>
        <p className="text-sm text-yellow-900 mt-1">{dailyTip}</p>
      </div>

      <div className="bg-white/80 border border-gray-100 rounded-2xl p-4 shadow-sm">
        <p className="text-sm font-bold text-nephro-dark">{recommendedToday.title}</p>
        <p className="text-xs text-gray-500 mt-1">{recommendedToday.reason}</p>
      </div>

      <div className="bg-white/80 border border-gray-100 rounded-2xl p-4 shadow-sm">
        <p className="text-sm font-bold text-nephro-dark">Stage-Specific Learning</p>
        <div className="flex gap-2 mt-2">
          {['Stage 2', 'Stage 3a', 'Stage 3b', 'Stage 4'].map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => setCkdStage(stage)}
              className={`text-xs px-3 py-1.5 rounded-full border ${ckdStage === stage ? 'bg-nephro-primary text-white border-nephro-primary' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              {stage}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">Showing content relevant to {ckdStage}.</p>
        <p className="text-xs text-gray-600 mt-1">You have completed {essentialsDone}/{essentialsTotal} Stage essentials ({essentialsPercent}%).</p>
        <div className="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
          <div className="h-full bg-nephro-primary rounded-full" style={{ width: `${essentialsPercent}%` }} />
        </div>
      </div>

      <div className="bg-white/80 border border-gray-100 rounded-2xl p-4 shadow-sm">
        <p className="text-sm font-bold text-nephro-dark mb-2">Micro-Lessons</p>
        <div className="space-y-2">
          {lessons.map((lesson) => (
            <div key={lesson.title} className="rounded-xl border border-gray-100 p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-nephro-dark">{lesson.title}</p>
                <p className="text-xs text-gray-500">{lesson.level}</p>
              </div>
              <span className="text-xs font-semibold bg-nephro-bg px-2 py-1 rounded-full">{lesson.duration}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/80 border border-gray-100 rounded-2xl p-4 shadow-sm">
        <p className="text-sm font-bold text-nephro-dark mb-2">Food Swap Suggestions</p>
        <div className="space-y-2">
          {foodSwaps.map((swap) => (
            <p key={swap.from} className="text-xs text-gray-700">
              Instead of <span className="font-semibold">{swap.from}</span>, try <span className="font-semibold">{swap.to}</span>.
            </p>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Education;
