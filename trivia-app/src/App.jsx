import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { ref, onValue, set, push, update, get } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Settings, Plus, Trash2, Edit2, Check, X, ArrowRight } from 'lucide-react';

const UNITS = ['פלוגה א', 'פלוגה ב', 'פלוגה ג', 'פלוגה ד', 'פלס"ם', 'אג"ם'];

const INITIAL_QUESTIONS = [
  {
    text: 'מדוע נקרא היישוב גן נר בשם זה?',
    options: [
      'על שם נדיב בריטי בשם בארנט ג\'אנר',
      'על שם אבנר בן נר',
      'בגלל שגובה היישוב הוא 250 מטר מעל פני הים (נר בגימטריה)'
    ],
    correctAnswer: 0
  },
  {
    text: 'מאיפה הגיע השם "מגן שאול"?',
    options: [
      'מקינת דוד על שאול בספר שמואל',
      'על שם שאול טשרניחובסקי',
      'על שם התנא אבא שאול שחי באזור'
    ],
    correctAnswer: 0
  },
  {
    text: 'מהי הפסגה הגבוהה ביותר בהר הגלבוע?',
    options: [
      'הר ברקן',
      'הר מלכישוע',
      'הר שאול'
    ],
    correctAnswer: 1
  },
  {
    text: 'גשם שיורד בצד המערבי של הרי הגלבוע זורם ומגיע לאיזה ים?',
    options: [
      'ים המלח',
      'הים התיכון',
      'ים הכינרת'
    ],
    correctAnswer: 1
  }
];

export default function App() {
  const [screen, setScreen] = useState('start'); // start, game, end, admin
  const [unit, setUnit] = useState('');
  const [questions, setQuestions] = useState([]);
  const [scores, setScores] = useState([]);

  useEffect(() => {
    // Check if initial items exist, if not seed DB
    const qRef = ref(db, 'questions');
    get(qRef).then((snapshot) => {
      if (!snapshot.exists() || Object.keys(snapshot.val()).length === 0) {
        set(qRef, INITIAL_QUESTIONS);
      }
    });

    // Listen to questions
    const unsubQ = onValue(qRef, (snapshot) => {
      if (snapshot.exists()) {
        const qData = snapshot.val();
        if (Array.isArray(qData)) {
          setQuestions(qData.filter(q => q != null && q.text));
        } else {
          setQuestions(Object.keys(qData).map(k => ({ id: k, ...qData[k] })).filter(q => q != null && q.text));
        }
      } else {
        setQuestions([]);
      }
    });

    // Listen to scores
    const sRef = ref(db, 'games');
    const unsubS = onValue(sRef, (snapshot) => {
      if (snapshot.exists()) {
        const sData = snapshot.val();
        const gamesList = Object.values(sData);
        
        // Aggregate scores per unit
        const agg = {};
        UNITS.forEach(u => agg[u] = { totalScore: 0, count: 0 });
        
        gamesList.forEach(g => {
          if (agg[g.unit]) {
            agg[g.unit].totalScore += g.score;
            agg[g.unit].count += 1;
          }
        });
        
        const leaderboard = UNITS.map(u => ({
          unit: u,
          avgScore: agg[u].count > 0 ? Math.round(agg[u].totalScore / agg[u].count) : 0,
          totalScore: agg[u].totalScore,
          count: agg[u].count
        })).sort((a, b) => b.avgScore - a.avgScore); // Sort by average score
        
        setScores(leaderboard);
      } else {
        setScores(UNITS.map(u => ({ unit: u, avgScore: 0, totalScore: 0, count: 0 })));
      }
    });

    return () => {
      unsubQ();
      unsubS();
    };
  }, []);

  const [gameScore, setGameScore] = useState(0);

  const startGame = () => {
    if (!unit) return alert('אנא בחר פלוגה לפני שמתחילים!');
    setGameScore(0);
    setScreen('game');
  };

  const endGame = async (finalScore) => {
    setGameScore(finalScore);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#1e3a8a', '#3b82f6', '#f59e0b', '#10b981']
    });
    setScreen('end');
    
    // Save to DB
    const sRef = ref(db, 'games');
    await push(sRef, {
      unit,
      score: finalScore,
      timestamp: Date.now()
    });
  };

  // Secret admin code logic
  const handleAdminAccess = () => {
    const code = prompt('הכנס קוד סודי לעריכה:');
    if (code === '1891') {
      setScreen('admin');
    } else if (code) {
      alert('קוד שגוי');
    }
  };

  return (
    <div className="app-container">
      {screen === 'start' && (
        <StartScreen unit={unit} setUnit={setUnit} onStart={startGame} onAdmin={handleAdminAccess} scores={scores} />
      )}
      {screen === 'game' && (
        <GameScreen questions={questions} onEnd={endGame} />
      )}
      {screen === 'end' && (
        <EndScreen score={gameScore} onRestart={() => setScreen('start')} scores={scores} unit={unit} />
      )}
      {screen === 'admin' && (
        <AdminScreen questions={questions} onClose={() => setScreen('start')} />
      )}
    </div>
  );
}

function StartScreen({ unit, setUnit, onStart, onAdmin, scores }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel text-center">
      <img src="./logo.png" alt="לוגו מגיני יואב" className="unit-logo" onClick={onAdmin} />
      <h1>חידון מגיני יואב 1891</h1>
      <p>ברוכים הבאים לחידון הגדוד! לפניכם 20 שאלות על גזרת התעסוקה ועל אזורנו. ככל שתענו מהר ונכון יותר - כך תצברו יותר נקודות עבור הפלוגה שלכם. 20 שניות זוז!</p>
      
      <div className="mb-3">
        <select className="input-control" value={unit} onChange={(e) => setUnit(e.target.value)}>
          <option value="" disabled>בחר פלוגה כעת...</option>
          {UNITS.map(u => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>
      
      <button className="btn mb-3" onClick={onStart}>התחל משחק</button>
      
      <h2 className="mt-3">טבלת מובילים</h2>
      <Leaderboard scores={scores} />
    </motion.div>
  );
}

function GameScreen({ questions, onEnd }) {
  // Select up to 20 random questions
  const [shuffledQuestions] = useState(() => {
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 20);
  });
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const timerRef = useRef(null);

  const currentQ = shuffledQuestions[currentIndex];

  useEffect(() => {
    if (!currentQ) return;
    if (!showFeedback && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && !showFeedback) {
      handleAnswer(-1); // Timeout -> wrong answer
    }
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, showFeedback, currentQ]);

  const handleAnswer = (optionIndex) => {
    if (showFeedback) return;
    clearTimeout(timerRef.current);
    setSelectedOption(optionIndex);
    setShowFeedback(true);

    let pointsEarned = 0;
    if (optionIndex === currentQ.correctAnswer) {
      // 50 points flat + up to 50 for speed (20s = 50, 0s = 0 -> 2.5 * timeLeft)
      pointsEarned = 50 + Math.round(timeLeft * 2.5);
      setScore(prev => prev + pointsEarned);
    }

    setTimeout(() => {
      if (currentIndex + 1 < shuffledQuestions.length) {
        setCurrentIndex(prev => prev + 1);
        setTimeLeft(20);
        setSelectedOption(null);
        setShowFeedback(false);
      } else {
        onEnd(score + pointsEarned);
      }
    }, 2500); // Wait 2.5s to show correct answer
  };

  if (!currentQ) return <div className="text-center">טוען שאלות...</div>;

  const isWarning = timeLeft <= 5;

  return (
    <motion.div key={currentIndex} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="glass-panel">
      <div className="flex justify-between items-center mb-2">
        <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--secondary)' }}>
          שאלה {currentIndex + 1} / {shuffledQuestions.length}
        </span>
        <span style={{ fontSize: '1.2rem', fontWeight: 600, color: isWarning ? 'var(--error)' : 'var(--success)' }}>
          {timeLeft}s
        </span>
      </div>
      
      <div className="timer-bar-container">
        <div className={`timer-bar ${isWarning ? 'warning' : ''}`} style={{ width: `${(timeLeft / 20) * 100}%` }} />
      </div>

      <h2 style={{ marginBottom: '2rem', lineHeight: '1.4' }}>{currentQ.text}</h2>

      <div className="options-container">
        {currentQ.options.map((opt, idx) => {
          let btnClass = "option-btn";
          if (showFeedback) {
            if (idx === currentQ.correctAnswer) btnClass += " correct";
            else if (idx === selectedOption) btnClass += " wrong";
          }
          return (
            <button 
              key={idx} 
              className={btnClass} 
              disabled={showFeedback}
              onClick={() => handleAnswer(idx)}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {showFeedback && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mt-3" style={{ fontSize: '1.2rem', fontWeight: 'bold', color: selectedOption === currentQ.correctAnswer ? 'var(--success)' : 'var(--error)' }}>
          {selectedOption === currentQ.correctAnswer ? 'כל הכבוד! תשובה נכונה!' : 'התשובה הנכונה הודגשה בירוק.'}
        </motion.div>
      )}
    </motion.div>
  );
}

function EndScreen({ score, onRestart, scores, unit }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel text-center">
      <h2>המשחק הסתיים!</h2>
      <p style={{ fontSize: '1.2rem', margin: '1rem 0' }}>הבאת כבוד ל<span>{unit}</span></p>
      <div style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '2rem' }}>
        {score}
      </div>
      
      <button className="btn mb-3" onClick={onRestart}>שחק שוב</button>

      <h2>טבלת מובילים</h2>
      <Leaderboard scores={scores} />
    </motion.div>
  );
}

function Leaderboard({ scores }) {
  return (
    <table className="leaderboard-table">
      <thead>
        <tr>
          <th>מיקום</th>
          <th>פלוגה</th>
          <th>ממוצע חייל</th>
          <th>משתתפים</th>
        </tr>
      </thead>
      <tbody>
        {scores.map((s, idx) => (
          <tr key={s.unit}>
            <td>{idx + 1}</td>
            <td style={{ fontWeight: 600 }}>{s.unit}</td>
            <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>{s.avgScore.toLocaleString()}</td>
            <td style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{s.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AdminScreen({ questions, onClose }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ text: '', options: ['', '', '', ''], correctAnswer: 0 });

  const startEdit = (q) => {
    setEditingId(q.id || null);
    setEditForm({
      text: q.text || '',
      options: [...(q.options || []), '', '', '', ''].slice(0, Math.max(q.options?.length || 2, 4)),
      correctAnswer: q.correctAnswer || 0
    });
  };

  const handleSave = () => {
    if (!editForm.text.trim()) return alert('יש למלא שאלת חובה');
    const filteredOptions = editForm.options.filter(o => o.trim() !== '');
    if (filteredOptions.length < 2) return alert('חובה לפחות 2 תשובות אופציונליות');
    if (editForm.correctAnswer >= filteredOptions.length) {
      return alert('התשובה הנכונה לא יכולה להיות מחוץ לטווח התשובות');
    }

    const payload = {
      text: editForm.text,
      options: filteredOptions,
      correctAnswer: parseInt(editForm.correctAnswer, 10)
    };

    if (editingId && editingId !== '__new__') {
      // Update
      const qRef = ref(db, `questions/${editingId}`);
      update(qRef, payload).then(() => setEditingId(null));
    } else {
      // Create new
      const newRef = push(ref(db, 'questions'));
      set(newRef, payload).then(() => setEditingId(null));
    }
  };

  const handleDelete = (id, text) => {
    if (window.confirm(`למחוק את השאלה: "${text}"?`)) {
      set(ref(db, `questions/${id}`), null);
    }
  };

  const handleResetScores = () => {
    if (window.confirm('האם אתה בטוח שברצונך לאפס את כל תוצאות המשחקים בטבלת המובילים? פעולה זו תמחק את היסטוריית המשחקים ולא ניתן יהיה לשחזר אותה!')) {
      set(ref(db, 'games'), null);
      alert('התוצאות אופסו בהצלחה!');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel">
      <div className="flex justify-between items-center mb-3">
        <h2>אזור עריכה</h2>
        <button className="btn-secondary" style={{ padding: '0.5rem', width: 'auto' }} onClick={onClose}><X size={20} /></button>
      </div>

      {editingId !== null ? (
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem' }}>
          <h3>{editingId === '__new__' ? 'שאלה חדשה' : 'עריכת שאלה'}</h3>
          <input 
            type="text" 
            className="input-control mt-2 mb-2" 
            placeholder="הכנס את השאלה כאן..." 
            value={editForm.text}
            onChange={e => setEditForm({...editForm, text: e.target.value})}
          />
          {editForm.options.map((opt, i) => (
            <div key={i} className="flex items-center mb-1">
              <input 
                type="radio" 
                name="correct" 
                checked={editForm.correctAnswer === i} 
                onChange={() => setEditForm({...editForm, correctAnswer: i})}
                style={{ marginLeft: '10px' }}
              />
              <input 
                type="text" 
                className="input-control mb-0" 
                style={{ flex: 1, marginBottom: 0 }}
                placeholder={`תשובה אופציונלית ${i+1}`}
                value={opt}
                onChange={e => {
                  const newOpts = [...editForm.options];
                  newOpts[i] = e.target.value;
                  setEditForm({...editForm, options: newOpts});
                }}
              />
            </div>
          ))}
          <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>* סמן את העיגול ליד התשובה הנכונה. שדות ריקים יתעלמו מהם.</p>
          
          <div className="flex" style={{ gap: '10px', marginTop: '1rem' }}>
            <button className="btn" onClick={handleSave} style={{ flex: 2 }}><Check size={18} style={{marginLeft:'8px'}}/> שמור שאלה</button>
            <button className="btn btn-secondary" onClick={() => setEditingId(null)} style={{ flex: 1 }}>ביטול</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '10px' }} className="mb-3">
          <button className="btn" onClick={() => { setEditingId('__new__'); setEditForm({ text: '', options: ['', '', '', ''], correctAnswer: 0 }); }}>
            <Plus size={18} style={{marginLeft:'8px'}}/> הוסף שאלה חדשה
          </button>
          <button className="btn" style={{ background: 'var(--error)' }} onClick={handleResetScores}>
            <Trash2 size={18} style={{marginLeft:'8px'}}/> אפס תוצאות משחקים
          </button>
        </div>
      )}

      <div>
        {questions.map((q, i) => (
          <div key={q.id || i} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '10px', marginBottom: '1rem' }}>
            <div className="flex justify-between items-center mb-1">
              <h4 style={{ margin: 0, padding: 0 }}>{q.text}</h4>
              <div className="flex" style={{ gap: '10px' }}>
                <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => startEdit({...q, id: q.id || i})}>
                  <Edit2 size={18} />
                </button>
                <button style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer' }} onClick={() => handleDelete(q.id || i, q.text)}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <ul style={{ paddingRight: '20px', margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>
              {q.options.map((opt, idx) => (
                <li key={idx} style={{ color: idx === q.correctAnswer ? 'var(--success)' : 'inherit' }}>
                  {opt} {idx === q.correctAnswer && '(נכון)'}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
