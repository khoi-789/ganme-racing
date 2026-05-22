'use client';

import { motion } from 'framer-motion';
import { Trophy, Medal } from 'lucide-react';

export default function Leaderboard({ leaderboard, currentUserId }: { leaderboard: any[], currentUserId: string }) {
  // Find maximum score to calculate relative positions
  const maxScore = leaderboard.reduce((max, user) => Math.max(max, user.score || 0), 0) || 1;

  return (
    <div className="w-full max-w-4xl mx-auto py-4">
      {/* Title Header */}
      <div className="text-center mb-6">
        <div className="inline-block p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-full mb-2 shadow-inner">
          <Trophy className="w-8 h-8 text-yellow-500" />
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 drop-shadow-sm tracking-wider">
          BẢNG XẾP HẠNG CUỘC ĐUA
        </h2>
        <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Top 10 Tay Đua Dẫn Đầu</p>
      </div>

      {/* Racetrack Arena */}
      <div className="glass-dark rounded-3xl p-4 md:p-6 shadow-2xl border border-white/10 space-y-3 relative overflow-hidden">
        {leaderboard.map((user, index) => {
          const isMe = user.id === currentUserId;
          
          // Calculate relative percentage position (Max 80% to leave room for finish line and name card)
          const positionPercent = maxScore > 0 ? (user.score / maxScore) * 78 : 0;
          
          // Rank icons and styling
          let rankLabel = `#${index + 1}`;
          let rankColor = 'text-gray-400';
          let trackBorder = 'border-white/5';
          let rowBg = 'bg-slate-950/20';

          if (index === 0) {
            rankColor = 'text-yellow-400';
            trackBorder = 'border-yellow-500/10';
            rowBg = 'bg-yellow-500/5';
          } else if (index === 1) {
            rankColor = 'text-slate-300';
            trackBorder = 'border-slate-300/10';
            rowBg = 'bg-slate-300/5';
          } else if (index === 2) {
            rankColor = 'text-amber-500';
            trackBorder = 'border-amber-500/10';
            rowBg = 'bg-amber-500/5';
          }

          if (isMe) {
            trackBorder = 'border-teal-500/30';
            rowBg = 'bg-teal-500/10 shadow-[inset_0_0_15px_rgba(20,184,166,0.05)]';
          }

          return (
            <div 
              key={user.id} 
              className={`flex items-center gap-3 p-1 rounded-2xl border ${trackBorder} ${rowBg} transition-all duration-300`}
            >
              {/* Rank Badge */}
              <div className="w-10 flex-shrink-0 flex items-center justify-center font-black text-lg">
                {index === 0 ? (
                  <Medal className="w-6 h-6 text-yellow-400 filter drop-shadow-[0_2px_4px_rgba(234,179,8,0.3)]" />
                ) : index === 1 ? (
                  <Medal className="w-6 h-6 text-slate-300 filter drop-shadow-[0_2px_4px_rgba(203,213,225,0.3)]" />
                ) : index === 2 ? (
                  <Medal className="w-6 h-6 text-amber-600 filter drop-shadow-[0_2px_4px_rgba(217,119,6,0.3)]" />
                ) : (
                  <span className={`${rankColor} font-mono`}>{rankLabel}</span>
                )}
              </div>

              {/* Racetrack Lane */}
              <div className="flex-1 relative h-14 md:h-16 bg-black/30 rounded-xl overflow-hidden flex items-center">
                
                {/* Lane Divider (dashed line in middle) */}
                <div className="absolute left-0 right-0 h-[1px] border-t border-dashed border-white/10"></div>
                
                {/* Lane score markings */}
                <div className="absolute left-4 text-[10px] text-gray-600 font-mono select-none">START</div>
                
                {/* Checkered Finish Line on far right */}
                <div 
                  className="absolute right-0 top-0 bottom-0 w-8 md:w-12 border-l border-white/10 flex items-center justify-center opacity-85 select-none"
                  style={{
                    background: 'repeating-conic-gradient(#1e293b 0% 25%, #cbd5e1 0% 50%) 0/8px 8px'
                  }}
                >
                  <span className="text-xs md:text-sm font-bold text-slate-900 bg-white/95 px-1 py-0.5 rounded shadow-sm border border-slate-300">
                    🏁
                  </span>
                </div>

                {/* Racer Avatar & Tag (Framer Motion slides it from left to right) */}
                <motion.div
                  className={`absolute flex items-center gap-2 md:gap-3 pl-3 pr-4 py-1 rounded-xl backdrop-blur-sm select-none ${
                    isMe 
                      ? 'bg-teal-500/25 border border-teal-400/50 shadow-[0_0_12px_rgba(20,184,166,0.25)]' 
                      : 'bg-white/5 border border-white/10'
                  }`}
                  style={{ left: 0 }}
                  animate={{ left: `${positionPercent}%` }}
                  transition={{ type: 'spring', stiffness: 45, damping: 14 }}
                >
                  {/* Duck/Car racer bouncing animation */}
                  <motion.span
                    className="text-2xl md:text-3xl block"
                    animate={{ 
                      y: [0, -3, 0],
                      rotate: [0, -2, 2, 0]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.5 + (index % 4) * 0.08,
                      ease: 'easeInOut'
                    }}
                  >
                    {user.avatar}
                  </motion.span>
                  
                  {/* Details Card next to emoji */}
                  <div className="flex flex-col min-w-[50px] md:min-w-[70px]">
                    <span className="text-[10px] md:text-xs font-bold text-white truncate max-w-[80px] md:max-w-[120px]" title={user.name}>
                      {user.name} 
                      {isMe && <span className="ml-1 text-[8px] bg-teal-400 text-teal-950 font-black px-1 rounded-full text-center inline-block">BẠN</span>}
                    </span>
                    <span className="text-[8px] md:text-[9px] text-gray-400 font-mono leading-none mb-0.5" title={`Mã NV: ${user.id}`}>
                      {user.id}
                    </span>
                    <span className={`text-[10px] md:text-xs font-black tracking-wider ${isMe ? 'text-teal-300' : 'text-gray-300'}`}>
                      {user.score} pts
                    </span>
                  </div>
                </motion.div>
              </div>
            </div>
          );
        })}

        {leaderboard.length === 0 && (
          <div className="text-center text-gray-500 py-12 bg-black/10 rounded-2xl border border-white/5">
            Chưa có người chơi nào tham gia phòng đua.
          </div>
        )}
      </div>
    </div>
  );
}
