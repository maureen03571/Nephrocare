import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, ChevronDown, ChevronUp, Newspaper, Clock, Star } from 'lucide-react';
import AIChat from '../../components/AIChat';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

const lessonContent = {
  'What is GFR?': {
    body: 'GFR (Glomerular Filtration Rate) is the best measure of kidney function. A GFR of 60+ is considered normal. Lower values indicate more kidney damage. Tracking your GFR over time is the most important thing you can do — ask your doctor for a copy of every lab result.',
    tip: 'Enter your GFR in the Labs tab after every blood test so you can see your personal trend.'
  },
  'Why limit potassium?': {
    body: 'Damaged kidneys cannot remove excess potassium from the blood. High potassium (hyperkalemia) can cause dangerous, even fatal, heart arrhythmias. High-potassium foods to limit: bananas, oranges, potatoes, tomatoes, dairy. Safer swaps: apples, berries, cauliflower, white rice.',
    tip: 'Ask your care team for a personalised potassium budget based on your latest blood tests.'
  },
  'How to read your labs': {
    body: 'Your lab report contains several key values: GFR (kidney filter rate), Creatinine (waste — higher is worse), BUN (blood urea nitrogen), Potassium, Phosphorus, Haemoglobin (anaemia), and Albumin (nutrition). A single value matters less than the trend — are things stable or trending down?',
    tip: 'Log your GFR and Creatinine in the Labs tab immediately after every appointment.'
  }
};

const Education = () => {
  const [ckdStage, setCkdStage] = useState('Stage 3a');
  const [openLesson, setOpenLesson] = useState(null);
  const [doneLessons, setDoneLessons] = useState({});
  const [articles, setArticles] = useState([]);
  const [openArticle, setOpenArticle] = useState(null);
  const [articlesWeek, setArticlesWeek] = useState(null);
  const [loadingArticles, setLoadingArticles] = useState(true);

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

  const dailyTip = 'Daily Tip: If you feel unusually tired, check hydration and log symptoms before noon for better trend tracking.';
  const essentialsDone = Object.values(doneLessons).filter(Boolean).length;
  const essentialsTotal = lessons.length;
  const essentialsPercent = Math.round((essentialsDone / essentialsTotal) * 100);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/education/articles`);
        setArticles(res.data.articles || []);
        setArticlesWeek(res.data.week || null);
      } catch (err) {
        console.error('Failed to load articles', err);
      } finally {
        setLoadingArticles(false);
      }
    };
    fetchArticles();
  }, []);

  const toggleLesson = (title) => {
    setOpenLesson(prev => (prev === title ? null : title));
  };

  const markDone = (title) => {
    setDoneLessons(prev => ({ ...prev, [title]: true }));
    setOpenLesson(null);
  };

  const toggleArticle = (id) => {
    setOpenArticle(prev => (prev === id ? null : id));
  };

  return (
    <div className="p-5 space-y-4 pb-24">
      <AIChat customTitle="AI Health Coach" customSubtitle="Get urgent answers about symptoms, labs, and diet choices" />

      {/* Daily Tip */}
      <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-bold text-yellow-700">Daily actionable tip</p>
        <p className="text-sm text-yellow-900 mt-1">{dailyTip}</p>
      </div>

      {/* Stage filter */}
      <div className="bg-white/80 border border-gray-100 rounded-2xl p-4 shadow-sm">
        <p className="text-sm font-bold text-nephro-dark">Stage-Specific Learning</p>
        <div className="flex gap-2 mt-2 flex-wrap">
          {['Stage 2', 'Stage 3a', 'Stage 3b', 'Stage 4'].map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => setCkdStage(stage)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${ckdStage === stage ? 'bg-nephro-primary text-white border-nephro-primary' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              {stage}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">Showing content relevant to {ckdStage}.</p>
        <p className="text-xs text-gray-600 mt-1">
          You have completed {essentialsDone}/{essentialsTotal} micro-lessons ({essentialsPercent}%).
        </p>
        <div className="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-nephro-primary rounded-full transition-all duration-500"
            style={{ width: `${essentialsPercent}%` }}
          />
        </div>
      </div>

      {/* Micro-Lessons */}
      <div className="bg-white/80 border border-gray-100 rounded-2xl p-4 shadow-sm">
        <p className="text-sm font-bold text-nephro-dark mb-3 flex items-center">
          <BookOpen size={16} className="mr-2 text-nephro-primary" /> Micro-Lessons
        </p>
        <div className="space-y-2">
          {lessons.map((lesson) => {
            const isDone = doneLessons[lesson.title];
            const isOpen = openLesson === lesson.title;
            const content = lessonContent[lesson.title];
            return (
              <div
                key={lesson.title}
                className={`rounded-xl border transition-all duration-300 overflow-hidden ${isDone ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-white'}`}
              >
                <button
                  type="button"
                  onClick={() => toggleLesson(lesson.title)}
                  className="w-full p-3 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2">
                    {isDone
                      ? <CheckCircle size={16} className="text-green-500 shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-nephro-primary shrink-0" />
                    }
                    <div>
                      <p className={`text-sm font-semibold ${isDone ? 'text-green-700 line-through' : 'text-nephro-dark'}`}>
                        {lesson.title}
                      </p>
                      <p className="text-xs text-gray-500">{lesson.level}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold bg-nephro-bg px-2 py-1 rounded-full text-nephro-primary">
                      {lesson.duration}
                    </span>
                    {isOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                  </div>
                </button>

                {isOpen && content && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                    <p className="text-sm text-gray-700 leading-relaxed">{content.body}</p>
                    <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-2">
                      <p className="text-xs text-yellow-700 font-semibold">💡 Tip: {content.tip}</p>
                    </div>
                    {!isDone && (
                      <button
                        type="button"
                        onClick={() => markDone(lesson.title)}
                        className="w-full py-2 rounded-lg bg-nephro-primary text-white text-sm font-bold flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={15} /> Mark as Done
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Food Swap Suggestions */}
      <div className="bg-white/80 border border-gray-100 rounded-2xl p-4 shadow-sm">
        <p className="text-sm font-bold text-nephro-dark mb-2">Food Swap Suggestions</p>
        <div className="space-y-2">
          {foodSwaps.map((swap) => (
            <p key={swap.from} className="text-xs text-gray-700">
              Instead of <span className="font-semibold">{swap.from}</span>, try <span className="font-semibold text-nephro-primary">{swap.to}</span>.
            </p>
          ))}
        </div>
      </div>

      {/* Weekly Articles */}
      <div className="bg-white/80 border border-gray-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-bold text-nephro-dark flex items-center">
            <Newspaper size={15} className="mr-2 text-nephro-primary" /> Kidney Health Articles
          </p>
          <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Star size={9} /> Week {articlesWeek} picks
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-3">Refreshes every Monday with 5 new articles</p>

        {loadingArticles ? (
          <p className="text-xs text-gray-400 text-center py-4">Loading articles…</p>
        ) : articles.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No articles available right now.</p>
        ) : (
          <div className="space-y-4">
            {articles.map((article, index) => {
              const isOpen = openArticle === article.id;
              // Map index to one of the 5 generated images
              const imageMap = ['/img_kidney.png', '/img_diet.png', '/img_exercise.png', '/img_labs.png', '/img_lifestyle.png'];
              const heroImage = imageMap[index % imageMap.length];

              return (
                <div key={article.id} className={`rounded-[24px] overflow-hidden transition-all duration-300 ${isOpen ? 'bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] bg-opacity-100 border border-gray-100 scale-[1.02]' : 'bg-white/60 backdrop-blur-sm shadow-sm border border-white/50 hover:bg-white/90'}`}>
                  {/* Hero Image */}
                  <div 
                    className="w-full h-32 bg-gray-100 relative cursor-pointer group overflow-hidden"
                    onClick={() => toggleArticle(article.id)}
                  >
                    <img 
                      src={heroImage} 
                      alt="Article hero" 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                      <span className="text-[10px] font-bold bg-white/20 backdrop-blur-md text-white border border-white/30 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                        <Clock size={10} /> {article.readTime}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleArticle(article.id)}
                    className="w-full px-4 py-4 flex items-start justify-between text-left gap-3"
                  >
                    <div className="flex-1">
                      <p className={`text-[15px] font-extrabold leading-tight ${isOpen ? 'text-nephro-primary' : 'text-nephro-dark'}`}>
                        {article.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1.5 leading-relaxed font-medium line-clamp-2">
                        {article.summary}
                      </p>
                    </div>
                    <div className="shrink-0 mt-1">
                      {isOpen ? <ChevronUp size={18} className="text-nephro-primary" /> : <ChevronDown size={18} className="text-gray-400" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 animate-slide-up">
                      <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-4" />
                      <p className="text-[13px] text-gray-700 leading-relaxed font-medium">
                        {article.content}
                      </p>
                      <button 
                        onClick={() => toggleArticle(article.id)}
                        className="mt-4 w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-xs font-bold transition-colors"
                      >
                        Close Article
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Education;
