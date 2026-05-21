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

    // Listen to personal score
    const userRef = doc(db, `rooms/${roomId}/users/${credentials.employeeId}`);
    const unsubscribeUser = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setUserScore(snapshot.data().score || 0);
      }
    });

    return () => {
      unsubscribeRoom();
      unsubscribeUser();
    };
  }, [credentials, roomId, router]);

  // Listen to leaderboard only when status is leaderboard
  useEffect(() => {
    if (roomState?.status === 'leaderboard') {
      const usersRef = collection(db, `rooms/${roomId}/users`);
      const q = query(usersRef, orderBy('score', 'desc'), limit(10));
      
      const unsubscribeLeaderboard = onSnapshot(q, (snapshot) => {
        const board = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLeaderboard(board);
      });
      
      return () => unsubscribeLeaderboard();
    }
  }, [roomState?.status, roomId]);

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
            <WaitingRoom roomId={roomId} />
          </motion.div>
        )}

        {roomState.status === 'active' && roomState.currentQuestionData && (
          <motion.div key={`game-${roomState.currentQuestionId}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="w-full">
            <GameScreen 
              credentials={credentials}
              question={roomState.currentQuestionData}
              questionId={roomState.currentQuestionId}
              startTime={roomState.questionStartTime}
            />
          </motion.div>
        )}

        {roomState.status === 'leaderboard' && (
          <motion.div key="leaderboard" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full">
            <Leaderboard leaderboard={leaderboard} currentUserId={credentials.employeeId} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
