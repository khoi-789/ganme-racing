import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { questions } from '@/lib/questions';

export async function POST(request: Request) {
  try {
    const { roomId, employeeId, questionId, selectedOptions, clientTime } = await request.json();

    if (!roomId || !employeeId || !questionId || !selectedOptions) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const roomRef = adminDb.collection('rooms').doc(roomId);
    
    let pointsEarned = 0;
    let isCorrect = false;

    await adminDb.runTransaction(async (transaction) => {
      // 1. ALL READS FIRST
      const roomDoc = await transaction.get(roomRef);
      const answerRef = roomRef.collection('answers').doc(`${employeeId}_${questionId}`);
      const answerDoc = await transaction.get(answerRef);
      const userRef = roomRef.collection('users').doc(employeeId);
      const userDoc = await transaction.get(userRef);

      // 2. LOGIC AND WRITES
      if (!roomDoc.exists) {
        throw new Error('Room not found');
      }

      const roomData = roomDoc.data();
      const activeQuestions = roomData?.questions || questions;
      const question = activeQuestions.find((q: any) => q.id === questionId);
      if (!question) {
        throw new Error('Question not found');
      }
      
      // Ensure the room is currently accepting answers for THIS question
      if (roomData?.status !== 'active' || roomData?.currentQuestionId !== questionId) {
        throw new Error('Question is not active');
      }

      // Check if user already answered this question
      if (answerDoc.exists) {
        throw new Error('User already answered this question');
      }

      // Check answer correctness
      const sortedSelected = [...selectedOptions].sort();
      const sortedCorrect = [...question.correctOptions].sort();
      isCorrect = JSON.stringify(sortedSelected) === JSON.stringify(sortedCorrect);

      const questionStartTime = roomData?.questionStartTime || 0;
      
      if (isCorrect) {
        // Calculate points
        const timeTakenMs = Math.max(0, clientTime - questionStartTime);
        const timeTakenSec = timeTakenMs / 1000;
        const limitSec = question.timeLimit;
        
        if (timeTakenSec > limitSec) {
          pointsEarned = 0; // Quá thời gian
        } else {
          const ratio = timeTakenSec / limitSec; // 0 to 1
          pointsEarned = Math.round(100 - (ratio * 70));
        }
      }

      // Save answer
      transaction.set(answerRef, {
        employeeId,
        questionId,
        isCorrect,
        pointsEarned,
        timeTaken: clientTime - questionStartTime,
        submittedAt: new Date().getTime(),
      });

      // Update user score
      if (pointsEarned > 0) {
        const currentScore = userDoc.data()?.score || 0;
        transaction.update(userRef, {
          score: currentScore + pointsEarned
        });
      }
    });

    return NextResponse.json({ success: true, isCorrect, pointsEarned });
  } catch (error: any) {
    console.error('Submit answer error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
