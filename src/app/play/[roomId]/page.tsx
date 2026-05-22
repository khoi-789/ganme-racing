'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';

// --- Sub-components ---
import WaitingRoom from './WaitingRoom';
import GameScreen from './GameScreen';
import Leaderboard from './Leaderboard';

type UserCredentials = {
  employeeId: string;
  roomId: string;
  name: string;
  avatar: string;
};

type RoomState = {
  status: 'waiting' | 'active' | 'leaderboard';
  currentQuestionIndex: number;
  currentQuestionId: string;
  questionStartTime: number;
  currentQuestionData: {
    text: string;
    options: { id: string; text: string }[];
    timeLimit: number;
  };
};

export default function PlayRoom() {
  const { roomId } = useParams() as { roomId: string };
  const router = useRouter();
  
  const [credentials, setCredentials] = useState<UserCredentials | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [userScore, setUserScore] = useState(0);
  const [hasAnsweredCurrentQuestion, setHasAnsweredCurrentQuestion] = useState(false);

  // Initialize credentials
  useEffect(() => {
    const creds = localStorage.getItem('gameCredentials');
    if (!creds) {
      router.push('/');
      return;
    }
    const parsed = JSON.parse(creds);
    if (parsed.roomId !== roomId) {
      router.push('/');
      return;
    }
    setCredentials(parsed);
  }, [roomId, router]);

  // Listen to Room State
  useEffect(() => {
    if (!credentials) return;

    const roomRef = doc(db, 'rooms', roomId);
    const unsubscribeRoom = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        setRoomState(snapshot.data() as RoomState);
      } else {
        // Room deleted or invalid
        router.push('/');
      }
    });

    // Listen to personal score & kick-out presence
    const userRef = doc(db, `rooms/${roomId}/users/${credentials.employeeId}`);
    const unsubscribeUser = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setUserScore(snapshot.data().score || 0);
      } else {
        // User kicked by admin
        localStorage.removeItem('gameCredentials');
        alert('Bạn đã bị kick khỏi phòng chơi bởi Admin.');
        router.push('/');
      }
    });

    return () => {
      unsubscribeRoom();
      unsubscribeUser();
    };
  }, [credentials, roomId, router]);

  // Listen to leaderboard continuously
  useEffect(() => {
    if (!credentials) return;
    const usersRef = collection(db, `rooms/${roomId}/users`);
    const q = query(usersRef, orderBy('score', 'desc'), limit(10));
    
    const unsubscribeLeaderboard = onSnapshot(q, (snapshot) => {
      const board = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLeaderboard(board);
    });
    
    return () => unsubscribeLeaderboard();
  }, [credentials, roomId]);

  // Listen to answer submission for the current active question
  useEffect(() => {
    if (!credentials || !roomState || roomState.status !== 'active' || !roomState.currentQuestionId) {
      setHasAnsweredCurrentQuestion(false);
      return;
    }

    const answerRef = doc(db, `rooms/${roomId}/answers/${credentials.employeeId}_${roomState.currentQuestionId}`);
    const unsubscribeAnswer = onSnapshot(answerRef, (snapshot) => {
      setHasAnsweredCurrentQuestion(snapshot.exists());
    });

    return () => unsubscribeAnswer();
  }, [credentials, roomState?.status, roomState?.currentQuestionId, roomId]);

  if (!credentials || !roomState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 flex flex-col items-center">
      {/* Header bar */}
      <div className="w-full max-w-4xl flex justify-between items-center glass rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl bg-white/50 p-2 rounded-xl">{credentials.avatar}</span>
          <div>
            <div className="font-bold text-gray-800">{credentials.name}</div>
            <div className="text-xs text-gray-500 uppercase">{credentials.employeeId}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500 font-medium uppercase tracking-wider">Điểm số</div>
          <div className="text-2xl font-black text-teal-600">{userScore}</div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {roomState.status === 'waiting' && (
          <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="flex items-center gap-3 text-teal-600 bg-teal-50/50 px-6 py-2.5 rounded-full border border-teal-100/50 text-sm font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-ping"></span>
                <span>Đang chờ Admin bắt đầu câu hỏi...</span>
              </div>
            </div>
            <Leaderboard leaderboard={leaderboard} currentUserId={credentials.employeeId} />
          </motion.div>
        )}

        {roomState.status === 'active' && roomState.currentQuestionData && (
          !hasAnsweredCurrentQuestion ? (
            <motion.div key={`game-${roomState.currentQuestionId}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="w-full">
              <GameScreen 
                credentials={credentials}
                question={roomState.currentQuestionData}
                questionId={roomState.currentQuestionId}
                startTime={roomState.questionStartTime}
              />
            </motion.div>
          ) : (
            <motion.div key={`game-leaderboard-${roomState.currentQuestionId}`} initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="w-full">
              <div className="flex flex-col items-center justify-center mb-6">
                <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50/50 px-6 py-2.5 rounded-full border border-emerald-100/50 text-sm font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Đã ghi nhận đáp án! Chờ câu hỏi tiếp theo...</span>
                </div>
              </div>
              <Leaderboard leaderboard={leaderboard} currentUserId={credentials.employeeId} />
            </motion.div>
          )
        )}

        {roomState.status === 'leaderboard' && (
          <motion.div key="leaderboard" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full">
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="flex items-center gap-3 text-amber-600 bg-amber-50/50 px-6 py-2.5 rounded-full border border-amber-100/50 text-sm font-semibold">
                <span>🏆 KẾT QUẢ CUỘC ĐUA</span>
              </div>
            </div>
            <Leaderboard leaderboard={leaderboard} currentUserId={credentials.employeeId} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
