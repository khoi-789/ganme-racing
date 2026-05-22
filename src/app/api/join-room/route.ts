import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const { employeeId, roomId, name, avatar } = await request.json();

    if (!employeeId || !roomId || !name || !avatar) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const roomRef = adminDb.collection('rooms').doc(roomId);
    
    const result = await adminDb.runTransaction(async (transaction) => {
      // 1. PERFORM ALL READS FIRST
      const roomDoc = await transaction.get(roomRef);
      const usersRef = roomRef.collection('users');
      const usersSnapshot = await transaction.get(usersRef);
      const userRef = usersRef.doc(employeeId);
      const userDoc = await transaction.get(userRef);
      
      const currentUsersCount = usersSnapshot.size;

      // 2. PERFORM LOGIC AND WRITES
      const maxUsers = roomDoc.exists ? (roomDoc.data()?.maxUsers ?? 50) : 50;

      if (userDoc.exists) {
        const userData = userDoc.data();
        const lastActive = userData?.lastActive ?? 0;
        const now = new Date().getTime();

        if (now - lastActive < 30000) {
          throw new Error('Mã NV này đang được đăng nhập ở thiết bị khác.');
        }

        // Returning user — preserve score and old joinedAt, just refresh name/avatar
        transaction.set(userRef, {
          id: employeeId,
          name,
          avatar,
          score: userData?.score ?? 0,
          joinedAt: userData?.joinedAt ?? now,
          lastActive: now,
        }, { merge: true });
        return { success: true, message: 'Re-joined successfully' };
      }

      // Brand-new user joining — check room capacity first
      if (currentUsersCount >= maxUsers) {
        throw new Error(`Phòng đã đầy (tối đa ${maxUsers} người).`);
      }

      if (!roomDoc.exists) {
        transaction.set(roomRef, {
          id: roomId,
          status: 'waiting',
          currentQuestionIndex: -1,
          createdAt: new Date().getTime(),
          usersCount: 1,
        });
      } else {
        transaction.update(roomRef, {
          usersCount: (roomDoc.data()?.usersCount ?? 0) + 1,
        });
      }

      const now = new Date().getTime();
      transaction.set(userRef, {
        id: employeeId,
        name,
        avatar,
        score: 0,
        joinedAt: now,
        lastActive: now,
      });

      return { success: true, message: 'Joined successfully' };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Join room error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
