'use client';

import { motion } from 'framer-motion';
import { Trophy, Medal } from 'lucide-react';

export default function Leaderboard({ leaderboard, currentUserId }: { leaderboard: any[], currentUserId: string }) {
  return (
    <div className="w-full max-w-2xl mx-auto py-8">
      <div className="text-center mb-10">
        <div className="inline-block p-4 bg-yellow-100 rounded-full mb-4 shadow-inner">
          <Trophy className="w-12 h-12 text-yellow-600" />
        </div>
        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-orange-500 drop-shadow-sm">
          BẢNG XẾP HẠNG
        </h2>
      </div>

      <div className="space-y-4">
        {leaderboard.map((user, index) => {
          const isMe = user.id === currentUserId;
          let rankColor = 'text-gray-500';
          let bgColor = 'glass';
          
          if (index === 0) { rankColor = 'text-yellow-500'; bgColor = 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 shadow-yellow-500/20'; }
          else if (index === 1) { rankColor = 'text-gray-400'; bgColor = 'bg-gradient-to-r from-gray-50 to-slate-100 border-gray-200 shadow-gray-500/20'; }
          else if (index === 2) { rankColor = 'text-amber-700'; bgColor = 'bg-gradient-to-r from-orange-50 to-amber-100 border-amber-200 shadow-amber-500/20'; }
          
          if (isMe) bgColor += ' ring-2 ring-teal-400';

          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${bgColor} rounded-2xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 text-center font-black text-2xl ${rankColor}`}>
                  {index < 3 ? <Medal className="w-8 h-8 mx-auto" /> : `#${index + 1}`}
                </div>
                <div className="text-4xl">{user.avatar}</div>
                <div>
                  <div className="font-bold text-lg text-gray-800">
                    {user.name} {isMe && <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full ml-2">BẠN</span>}
                  </div>
                  <div className="text-sm text-gray-500 uppercase">{user.id}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500">
                  {user.score}
                </div>
                <div className="text-xs font-bold text-gray-400">ĐIỂM</div>
              </div>
            </motion.div>
          );
        })}

        {leaderboard.length === 0 && (
          <div className="text-center text-gray-500 py-10 glass rounded-2xl">
            Chưa có dữ liệu người chơi
          </div>
        )}
      </div>
    </div>
  );
}
