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

      if (currentUsersCount >= maxUsers && !userDoc.exists) {
        throw new Error(`Phòng đã đầy (tối đa ${maxUsers} người).`);
      }

      if (currentUsersCount >= maxUsers && userDoc.exists) {
        // Allow re-joining if already in the room
        return { success: true, message: 'Re-joined successfully' };
      }

      if (!roomDoc.exists) {
        // If room doesn't exist, we initialize it
        transaction.set(roomRef, {
          id: roomId,
          status: 'waiting',
          currentQuestionIndex: -1,
          createdAt: new Date().getTime(),
          usersCount: 1,
        });
      }

      // Add or update the user
      transaction.set(userRef, {
        id: employeeId,
        name,
        avatar,
        score: userDoc.exists ? userDoc.data()?.score : 0,
        joinedAt: userDoc.exists ? userDoc.data()?.joinedAt : new Date().getTime(),
      }, { merge: true });

      return { success: true, message: 'Joined successfully' };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Join room error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
