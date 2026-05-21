'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, LogIn, KeyRound } from 'lucide-react';

const AVATARS = ['🦊', '🐼', '🐯', '🐰', '🐶', '🐱', '🦄', '🐸'];

export default function Home() {
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/join-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, roomId, name, avatar: selectedAvatar }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to join room');
      }

      // Store credentials locally for reconnection
      localStorage.setItem('gameCredentials', JSON.stringify({ employeeId, roomId, name, avatar: selectedAvatar }));
      
      router.push(`/play/${roomId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-400 drop-shadow-sm">
            Brain Race
          </h1>
          <p className="text-gray-600 mt-2 font-medium">Sẵn sàng đua trí tuệ?</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100 text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                required
                placeholder="Tên hiển thị"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all placeholder-gray-400 font-medium"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <KeyRound className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                required
                placeholder="Mã nhân viên (vd: NV001)"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all placeholder-gray-400 font-medium uppercase"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <LogIn className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                required
                placeholder="Mã phòng"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all placeholder-gray-400 font-medium uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
              Chọn Avatar
            </label>
            <div className="flex justify-center gap-3 flex-wrap">
              {AVATARS.map((avatar) => (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`text-3xl p-2 rounded-2xl transition-all ${
                    selectedAvatar === avatar 
                      ? 'bg-teal-100 scale-110 shadow-md ring-2 ring-teal-400' 
                      : 'hover:bg-white/40 hover:scale-105'
                  }`}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-teal-500/30 transform transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Đang vào phòng...' : 'VÀO PHÒNG NGAY'}
          </button>
        </form>
      </motion.div>
    </main>
  );
}
