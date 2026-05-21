'use client';

import { motion } from 'framer-motion';
import { Users, Loader2 } from 'lucide-react';

export default function WaitingRoom({ roomId }: { roomId: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="glass rounded-full p-8 mb-8"
      >
        <Users className="w-20 h-20 text-teal-500 opacity-80" />
      </motion.div>
      
      <h2 className="text-3xl font-black text-gray-800 mb-4 text-center">
        Bạn đã vào phòng <span className="text-teal-600">{roomId}</span>
      </h2>
      
      <p className="text-gray-600 text-lg mb-8 text-center max-w-md">
        Hãy chuẩn bị sẵn sàng, cuộc đua trí tuệ sẽ bắt đầu ngay khi Admin ra hiệu lệnh!
      </p>

      <div className="flex items-center gap-3 text-teal-600 bg-teal-50/50 px-6 py-3 rounded-full border border-teal-100">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="font-medium">Đang chờ câu hỏi...</span>
      </div>
    </div>
  );
}
