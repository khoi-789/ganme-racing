'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function GameScreen({ 
  credentials, 
  question, 
  questionId, 
  startTime,
  clockOffset = 0
}: { 
  credentials: any; 
  question: any; 
  questionId: string;
  startTime: number;
  clockOffset?: number;
}) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  // Normalize startTime — stored as ms number in Firestore, but guard against edge cases
  const startTimeMs: number = typeof startTime === 'number' && startTime > 0
    ? startTime
    : (Date.now() + clockOffset);
  const [timeLeft, setTimeLeft] = useState(() => {
    const elapsed = (Date.now() + clockOffset - startTimeMs) / 1000;
    return Math.max(0, question.timeLimit - Math.floor(elapsed));
  });
  const [submitted, setSubmitted] = useState(false);
  const submittedRef = useRef(false);
  const [result, setResult] = useState<{ isCorrect: boolean, points: number } | null>(null);

  // Timer logic
  useEffect(() => {
    if (submitted) return;

    const interval = setInterval(() => {
      const now = Date.now() + clockOffset;
      const elapsed = (now - startTimeMs) / 1000;
      const remaining = Math.max(0, question.timeLimit - Math.floor(elapsed));
      
      setTimeLeft(remaining);

      if (remaining === 0) {
        handleSubmit(true); // Auto submit when time is up
      }
    }, 500);

    return () => clearInterval(interval);
  }, [startTimeMs, question.timeLimit, submitted, clockOffset]);

  const toggleOption = (id: string) => {
    if (submittedRef.current) return;
    
    // Nếu là multiple choice thì cho chọn nhiều, single thì thay thế
    // Tạm mặc định cho phép chọn nhiều, API sẽ check JSON.stringify mảng đã sort
    if (selectedOptions.includes(id)) {
      setSelectedOptions(selectedOptions.filter(o => o !== id));
    } else {
      setSelectedOptions([...selectedOptions, id]);
    }
  };

  const handleSubmit = async (isTimeUp = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);

    const submitTime = isTimeUp ? startTimeMs + (question.timeLimit * 1000) : (Date.now() + clockOffset);

    try {
      const res = await fetch('/api/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: credentials.roomId,
          employeeId: credentials.employeeId,
          questionId,
          selectedOptions,
          clientTime: submitTime
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResult({ isCorrect: data.isCorrect, points: data.pointsEarned });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Timer Bar — pure CSS animation, no React state driving the visual */}
      <div key={questionId} className="w-full bg-gray-200 rounded-full h-4 mb-8 overflow-hidden relative">
        <div
          className="timer-bar h-full bg-gradient-to-r from-red-500 to-yellow-500"
          style={{
            animationDuration: `${question.timeLimit}s`,
            // Negative delay fast-forwards animation to the elapsed position
            animationDelay: `-${Math.max(0, Math.min(question.timeLimit, (Date.now() + clockOffset - startTimeMs) / 1000))}s`,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
          {timeLeft}s
        </div>
      </div>

      <div className="glass rounded-3xl p-8 mb-8 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 leading-relaxed">
          {question.text}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {question.options.map((opt: any) => {
          const isSelected = selectedOptions.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggleOption(opt.id)}
              disabled={submitted}
              className={`p-6 rounded-2xl text-lg font-medium transition-all duration-200 text-left relative overflow-hidden ${
                isSelected 
                  ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/40 ring-2 ring-teal-300 scale-[1.02]' 
                  : 'glass hover:bg-white/60 text-gray-700 hover:scale-[1.02]'
              } ${submitted ? 'opacity-80 cursor-not-allowed' : ''}`}
            >
              {opt.text}
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex justify-center">
        {!submitted ? (
          <button
            onClick={() => handleSubmit()}
            disabled={selectedOptions.length === 0}
            className="px-12 py-4 rounded-xl font-bold text-lg text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-xl shadow-teal-500/30 transform transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            CHỐT ĐÁP ÁN
          </button>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-xl ${
              result?.isCorrect 
                ? 'bg-green-100 text-green-700 border border-green-200' 
                : 'bg-red-100 text-red-700 border border-red-200'
            }`}
          >
            {result?.isCorrect ? (
              <>
                <CheckCircle2 className="w-8 h-8" />
                Tuyệt vời! +{result.points} điểm
              </>
            ) : (
              <>
                <XCircle className="w-8 h-8" />
                {result === null ? 'Đang chấm điểm...' : 'Sai rồi! 0 điểm'}
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
