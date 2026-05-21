'use client';

import { useState } from 'react';
import { questions } from '@/lib/questions';
import { motion } from 'framer-motion';
import { Play, Trophy, RotateCcw } from 'lucide-react';

export default function AdminControl() {
  const [roomId, setRoomId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: string, questionIndex?: number) => {
    if (!roomId) return alert('Vui lòng nhập mã phòng');
    
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, roomId, questionIndex }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('Thành công!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="glass-dark rounded-3xl p-8 mb-8">
        <h1 className="text-3xl font-black text-teal-400 mb-6">BẢNG ĐIỀU KHIỂN ADMIN</h1>
        
        <div className="mb-8">
          <label className="block text-sm font-medium mb-2 text-gray-300">Mã phòng cần điều khiển</label>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full md:w-1/2 px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 font-bold uppercase text-white placeholder-gray-500"
            placeholder="VD: ROOM1"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => handleAction('show_leaderboard')}
            disabled={isLoading || !roomId}
            className="flex items-center justify-center gap-3 px-6 py-4 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-xl transition-all disabled:opacity-50"
          >
            <Trophy className="w-5 h-5" />
            HIỂN THỊ BẢNG XẾP HẠNG
          </button>
          
          <button
            onClick={() => {
              if(confirm('Chắc chắn muốn reset phòng? Mọi điểm số sẽ bị xóa!')) {
                handleAction('reset_room');
              }
            }}
            disabled={isLoading || !roomId}
            className="flex items-center justify-center gap-3 px-6 py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all disabled:opacity-50"
          >
            <RotateCcw className="w-5 h-5" />
            RESET PHÒNG
          </button>
        </div>

        <h2 className="text-xl font-bold mb-4 text-white">Danh sách câu hỏi</h2>
        <div className="space-y-4">
          {questions.map((q, index) => (
            <div key={q.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="font-bold text-teal-300 mb-1">Câu {index + 1} ({q.timeLimit}s)</div>
                <div className="text-gray-300">{q.text}</div>
              </div>
              <button
                onClick={() => handleAction('start_question', index)}
                disabled={isLoading || !roomId}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl whitespace-nowrap transition-all disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                BẮT ĐẦU CÂU NÀY
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
