import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const { roomId, employeeId } = await request.json();

    if (!roomId || !employeeId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userRef = adminDb.collection('rooms').doc(roomId).collection('users').doc(employeeId);
    
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      await userRef.update({
        lastActive: new Date().getTime()
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Heartbeat error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
