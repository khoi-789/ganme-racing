'use client';

import { useState, useEffect } from 'react';
import { questions as defaultQuestions, Question } from '@/lib/questions';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Play, Trophy, RotateCcw, Upload, Check, Edit2, Eye, EyeOff, Users, UserX } from 'lucide-react';

export default function AdminControl() {
  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isRoomConfirmed, setIsRoomConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>(defaultQuestions);
  const [roomExists, setRoomExists] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);
  const [maxUsers, setMaxUsers] = useState(50);
  const [maxUsersInput, setMaxUsersInput] = useState('50');
  const [joinedUsers, setJoinedUsers] = useState<any[]>([]);
  const [roomStatus, setRoomStatus] = useState<string>('waiting');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(-1);

  // Listen to Firestore Room to get dynamic questions list if available
  useEffect(() => {
    if (!isRoomConfirmed || !roomId) {
      setActiveQuestions(defaultQuestions);
      setJoinedUsers([]);
      return;
    }

    const roomRef = doc(db, 'rooms', roomId);
    const unsubscribeRoom = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        setRoomExists(true);
        const data = snapshot.data();
        if (data.questions && Array.isArray(data.questions)) {
          setActiveQuestions(data.questions);
        } else {
          setActiveQuestions(defaultQuestions);
        }
        if (data.maxUsers !== undefined) {
          setMaxUsers(data.maxUsers);
          setMaxUsersInput(String(data.maxUsers));
        }
        setRoomStatus(data.status || 'waiting');
        setCurrentQuestionIndex(data.currentQuestionIndex ?? -1);
      } else {
        setRoomExists(false);
        setActiveQuestions(defaultQuestions);
        setRoomStatus('waiting');
        setCurrentQuestionIndex(-1);
      }
    });

    const usersRef = collection(db, `rooms/${roomId}/users`);
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setJoinedUsers(usersList);
    });

    return () => {
      unsubscribeRoom();
      unsubscribeUsers();
    };
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

  const handleSaveLimit = async (newLimit: number) => {
    if (!roomId) return alert('Vui lòng nhập và xác nhận mã phòng');
    if (!newLimit || newLimit < 1) return alert('Giới hạn không hợp lệ');

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_user_limit', roomId, maxUsers: newLimit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('Cập nhật giới hạn thành công!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKickUser = async (employeeId: string, name: string) => {
    if (!roomId) return;
    if (!confirm(`Bạn có chắc chắn muốn kick người chơi "${name}" (${employeeId}) ra khỏi phòng?`)) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'kick_user', roomId, employeeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`Đã kick người chơi "${name}" khỏi phòng.`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
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
    <div className="min-h-screen p-4 md:p-8 max-w-[1400px] mx-auto">
      <div className="glass-dark rounded-3xl p-6 md:p-8 mb-8">
        <h1 className="text-3xl font-black text-teal-400 mb-6 tracking-wide text-center lg:text-left">
          BẢNG ĐIỀU KHIỂN ADMIN
        </h1>
        
        {/* Room ID section */}
        <div className="mb-6 p-5 bg-white/5 rounded-2xl border border-white/10">
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

            {/* Main 2-column Widescreen layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Actions & Questions (2/3 width on PC) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Admin Quick Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white/5 border border-white/5 p-4 rounded-2xl">
                  {roomStatus === 'leaderboard' ? (
                    <button
                      onClick={() => handleAction('resume_room')}
                      disabled={isLoading}
                      className="flex items-center justify-center gap-3 px-4 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 text-sm shadow-md"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      TIẾP TỤC
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction('show_leaderboard')}
                      disabled={isLoading}
                      className="flex items-center justify-center gap-3 px-4 py-3.5 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-xl transition-all disabled:opacity-50 text-sm shadow-md"
                    >
                      <Trophy className="w-4 h-4" />
                      BẢNG XẾP HẠNG
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      if (confirm('Chắc chắn muốn reset phòng? Mọi điểm số sẽ bị xóa!')) {
                        handleAction('reset_room');
                      }
                    }}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-3 px-4 py-3.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 text-sm shadow-md"
                  >
                    <RotateCcw className="w-4 h-4" />
                    RESET PHÒNG
                  </button>

                  <label className="flex items-center justify-center gap-3 px-4 py-3.5 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl transition-all cursor-pointer text-center text-sm shadow-md">
                    <Upload className="w-4 h-4" />
                    IMPORT (.XLSX)
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleExcelImport}
                      className="hidden"
                      disabled={isLoading}
                    />
                  </label>
                </div>

                {/* Question List Header & Info */}
                <div className="bg-white/5 border border-white/5 p-5 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <span>Danh sách câu hỏi</span>
                      <span className="text-xs bg-teal-500/20 border border-teal-500/30 text-teal-400 px-2.5 py-0.5 rounded-full font-mono font-bold">
                        {activeQuestions.length}
                      </span>
                    </h2>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowAnswers(!showAnswers)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-xs font-bold text-gray-300 transition-all"
                      >
                        {showAnswers ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            ẨN ĐÁP ÁN
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            HIỆN ĐÁP ÁN
                          </>
                        )}
                      </button>
                      {activeQuestions !== defaultQuestions && (
                        <span className="text-xs bg-teal-500/20 border border-teal-500/30 text-teal-400 px-3 py-1 rounded-full font-bold">
                          Đã Import Custom
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Scrollable Questions list */}
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {activeQuestions.map((q, index) => {
                      const alreadyPlayed = index < currentQuestionIndex;
                      const isCurrentlyActive = index === currentQuestionIndex && roomStatus === 'active';
                      const hideStart = roomStatus === 'leaderboard' || alreadyPlayed;
                      return (
                        <div
                          key={q.id || index}
                          className={`bg-white/5 border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                            alreadyPlayed ? 'border-white/5 opacity-50' :
                            isCurrentlyActive ? 'border-teal-500/60 bg-teal-500/5' :
                            'border-white/10 hover:border-white/25'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="font-bold text-teal-300 mb-1 text-sm flex items-center gap-2">
                              Câu {index + 1} ({q.timeLimit}s)
                              {alreadyPlayed && (
                                <span className="text-[10px] bg-gray-500/30 text-gray-400 px-2 py-0.5 rounded-full font-mono">Đã chạy</span>
                              )}
                              {isCurrentlyActive && (
                                <span className="text-[10px] bg-teal-500/30 text-teal-300 px-2 py-0.5 rounded-full font-mono animate-pulse">Đang chạy</span>
                              )}
                            </div>
                            <div className="text-gray-200 text-sm md:text-base">{q.text}</div>
                            {showAnswers && (
                              <div className="text-xs text-teal-400/80 mt-2 font-semibold bg-teal-500/5 border border-teal-500/10 px-2.5 py-1 rounded inline-block">
                                Đáp án đúng: {q.correctOptions.map(opt => opt.replace('opt_', '').toUpperCase()).join(', ')}
                              </div>
                            )}
                          </div>
                          {!hideStart && (
                            <button
                              onClick={() => handleAction('start_question', index)}
                              disabled={isLoading}
                              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl text-sm whitespace-nowrap transition-all disabled:opacity-50"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              BẮT ĐẦU CÂU NÀY
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Right Column: User Administration (1/3 width on PC) */}
              <div className="space-y-6">
                
                {/* Room configurations (Capacity Limit) */}
                <div className="bg-white/5 border border-white/5 p-5 rounded-2xl space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Cấu hình phòng</span>
                  </h3>
                  <div className="space-y-3">
                    <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Giới hạn số người chơi (max)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max="5000"
                        value={maxUsersInput}
                        onChange={(e) => setMaxUsersInput(e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 text-white font-bold text-center"
                      />
                      <button
                        onClick={() => handleSaveLimit(Number(maxUsersInput))}
                        disabled={isLoading}
                        className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl text-sm whitespace-nowrap transition-all"
                      >
                        LƯU
                      </button>
                    </div>
                    <div className="text-[10px] text-gray-400 italic">
                      Giới hạn hiện tại: <span className="font-bold text-teal-400">{maxUsers} người</span>
                    </div>
                  </div>
                </div>

                {/* Joined Users Panel */}
                <div className="bg-white/5 border border-white/5 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-teal-400" />
                      <span>Người chơi đã vào</span>
                    </h3>
                    <span className="text-xs bg-white/10 text-gray-300 px-2.5 py-0.5 rounded-full font-mono">
                      {joinedUsers.length}
                    </span>
                  </div>

                  {/* Users list scroll container */}
                  <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                    {joinedUsers.map((user) => (
                      <div 
                        key={user.id} 
                        className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-2xl select-none">{user.avatar}</span>
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-gray-200 truncate pr-1">
                              {user.name}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              {user.id} • <span className="text-teal-400 font-bold">{user.score || 0} pts</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleKickUser(user.id, user.name)}
                          disabled={isLoading}
                          className="p-2 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 text-red-400 rounded-lg transition-all flex items-center justify-center"
                          title="Kick người chơi này"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {joinedUsers.length === 0 && (
                      <div className="text-center text-gray-500 py-8 text-sm">
                        Chưa có người chơi nào.
                      </div>
                    )}
                  </div>
                </div>

              </div>

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
