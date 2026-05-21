'use client';

import { useState, useEffect } from 'react';
import { questions as defaultQuestions, Question } from '@/lib/questions';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Play, Trophy, RotateCcw, Upload, Check, Edit2 } from 'lucide-react';

export default function AdminControl() {
  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isRoomConfirmed, setIsRoomConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>(defaultQuestions);
  const [roomExists, setRoomExists] = useState(true);

  // Listen to Firestore Room to get dynamic questions list if available
  useEffect(() => {
    if (!isRoomConfirmed || !roomId) {
      setActiveQuestions(defaultQuestions);
      return;
    }

    const roomRef = doc(db, 'rooms', roomId);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        setRoomExists(true);
        const data = snapshot.data();
        if (data.questions && Array.isArray(data.questions)) {
          setActiveQuestions(data.questions);
        } else {
          setActiveQuestions(defaultQuestions);
        }
      } else {
        setRoomExists(false);
        setActiveQuestions(defaultQuestions);
      }
    });

    return () => unsubscribe();
  }, [isRoomConfirmed, roomId]);

  const handleConfirmRoom = () => {
    const cleaned = roomIdInput.trim().toUpperCase();
    if (!cleaned) return alert('Vui lòng nhập mã phòng');
    setRoomId(cleaned);
    setIsRoomConfirmed(true);
  };

  const handleChangeRoom = () => {
    setIsRoomConfirmed(false);
    setRoomId('');
  };

  const handleAction = async (action: string, questionIndex?: number) => {
    if (!roomId) return alert('Vui lòng nhập và xác nhận mã phòng');
    
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

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) return;
        
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        if (sheetData.length < 2) {
          alert('File Excel không có dữ liệu câu hỏi!');
          return;
        }
        
        const headers = sheetData[0].map(h => String(h || '').trim());
        const rows = sheetData.slice(1);
        
        // Find header indices
        const qIdx = headers.findIndex(h => h.toLowerCase() === 'câu hỏi');
        const sttIdx = headers.findIndex(h => h.toLowerCase() === 'stt');
        const diffIdx = headers.findIndex(h => h.toLowerCase() === 'độ khó');
        const correctIdx = headers.findIndex(h => h.toLowerCase() === 'đáp án đúng');
        
        if (qIdx === -1 || correctIdx === -1) {
          alert('File Excel không đúng định dạng. Cần có cột "Câu hỏi" và "Đáp án Đúng".');
          return;
        }
        
        // Find indices of "Đáp án A", "Đáp án B", etc.
        const optIndices: { idx: number; name: string }[] = [];
        headers.forEach((h, idx) => {
          if (h.toLowerCase().startsWith('đáp án ')) {
            const optName = h.substring(7).trim(); // e.g., "A", "B", "C", "D"
            if (optName.length === 1 && optName.toLowerCase() !== 'đúng') {
              optIndices.push({ idx, name: optName.toUpperCase() });
            }
          }
        });
        
        if (optIndices.length === 0) {
          alert('File Excel không đúng định dạng. Cần có các cột đáp án như "Đáp án A", "Đáp án B",...');
          return;
        }
        
        const parsedQuestions = rows.map((row, rIndex) => {
          const text = String(row[qIdx] || '').trim();
          if (!text) return null;
          
          const id = `q_${row[sttIdx] || (rIndex + 1)}`;
          
          const options = optIndices
            .map(optInfo => {
              const optVal = String(row[optInfo.idx] || '').trim();
              if (!optVal) return null;
              return {
                id: `opt_${optInfo.name.toLowerCase()}`, // "opt_a", "opt_b"
                text: optVal
              };
            })
            .filter(Boolean) as { id: string; text: string }[];
            
          const correctVal = String(row[correctIdx] || '').trim().toUpperCase();
          // Split by comma, semicolon, space
          const correctLetters = correctVal.split(/[,\s;]+/).filter(Boolean);
          const correctOptions = correctLetters.map(letter => `opt_${letter.toLowerCase()}`);
          
          const difficulty = diffIdx !== -1 ? String(row[diffIdx] || '').trim().toLowerCase() : '';
          let timeLimit = 15;
          if (difficulty === 'trung bình') {
            timeLimit = 20;
          } else if (difficulty === 'khó') {
            timeLimit = 30;
          }
          
          return {
            id,
            text,
            options,
            correctOptions,
            timeLimit
          };
        }).filter(Boolean);
        
        if (parsedQuestions.length === 0) {
          alert('Không tìm thấy câu hỏi hợp lệ nào trong file Excel!');
          return;
        }
        
        if (confirm(`Tìm thấy ${parsedQuestions.length} câu hỏi. Bạn có muốn nhập vào phòng ${roomId} không?`)) {
          setIsLoading(true);
          const res = await fetch('/api/admin-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'import_questions',
              roomId,
              questions: parsedQuestions
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          alert('Nhập danh sách câu hỏi thành công!');
        }
      } catch (err: any) {
        alert('Lỗi khi đọc file Excel: ' + err.message);
      } finally {
        setIsLoading(false);
        // Reset file input
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="glass-dark rounded-3xl p-8 mb-8">
        <h1 className="text-3xl font-black text-teal-400 mb-6 tracking-wide">BẢNG ĐIỀU KHIỂN ADMIN</h1>
        
        {/* Room ID section */}
        <div className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
          <label className="block text-sm font-medium mb-3 text-gray-300">Mã phòng cần điều khiển</label>
          
          {!isRoomConfirmed ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmRoom()}
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 font-bold uppercase text-white placeholder-gray-500"
                placeholder="VD: ROOM1, GMP..."
              />
              <button
                onClick={handleConfirmRoom}
                className="px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                XÁC NHẬN
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-teal-500/10 border border-teal-500/20 px-5 py-4 rounded-xl">
              <div>
                <span className="text-gray-400 text-xs uppercase block">Đang kết nối tới phòng</span>
                <span className="text-2xl font-black text-teal-400 tracking-wider">{roomId}</span>
              </div>
              <button
                onClick={handleChangeRoom}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all flex items-center gap-2 text-sm font-bold"
              >
                <Edit2 className="w-4 h-4" />
                ĐỔI PHÒNG
              </button>
            </div>
          )}
        </div>

        {/* Admin Controls */}
        {isRoomConfirmed && (
          <>
            {!roomExists && (
              <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl text-sm">
                ⚠️ Phòng này chưa được khởi tạo. Bạn có thể nhấn <strong>RESET PHÒNG</strong> để tạo mới hoặc import danh sách câu hỏi.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <button
                onClick={() => handleAction('show_leaderboard')}
                disabled={isLoading}
                className="flex items-center justify-center gap-3 px-6 py-4 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-xl transition-all disabled:opacity-50"
              >
                <Trophy className="w-5 h-5" />
                HIỂN THỊ BẢNG XẾP HẠNG
              </button>
              
              <button
                onClick={() => {
                  if (confirm('Chắc chắn muốn reset phòng? Mọi điểm số sẽ bị xóa!')) {
                    handleAction('reset_room');
                  }
                }}
                disabled={isLoading}
                className="flex items-center justify-center gap-3 px-6 py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all disabled:opacity-50"
              >
                <RotateCcw className="w-5 h-5" />
                RESET PHÒNG
              </button>

              <label className="flex items-center justify-center gap-3 px-6 py-4 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl transition-all cursor-pointer text-center">
                <Upload className="w-5 h-5" />
                IMPORT CÂU HỎI (.XLSX)
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleExcelImport}
                  className="hidden"
                  disabled={isLoading}
                />
              </label>
            </div>

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                Danh sách câu hỏi ({activeQuestions.length})
              </h2>
              {activeQuestions !== defaultQuestions && (
                <span className="text-xs bg-teal-500/20 border border-teal-500/30 text-teal-400 px-3 py-1 rounded-full font-bold">
                  Đã Import Custom
                </span>
              )}
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {activeQuestions.map((q, index) => (
                <div key={q.id || index} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-teal-300 mb-1">Câu {index + 1} ({q.timeLimit}s)</div>
                    <div className="text-gray-300">{q.text}</div>
                    <div className="text-xs text-gray-500 mt-2">
                      Đáp án đúng: {q.correctOptions.map(opt => opt.replace('opt_', '').toUpperCase()).join(', ')}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAction('start_question', index)}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl whitespace-nowrap transition-all disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    BẮT ĐẦU CÂU NÀY
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {!isRoomConfirmed && (
          <div className="text-center py-12 text-gray-500 text-sm">
            Vui lòng nhập và xác nhận mã phòng để hiển thị bảng điều khiển và danh sách câu hỏi.
          </div>
        )}
      </div>
    </div>
  );
}
