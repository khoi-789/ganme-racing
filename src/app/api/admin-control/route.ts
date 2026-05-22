import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { questions } from '@/lib/questions';
import * as admin from 'firebase-admin';

export async function POST(request: Request) {
  try {
    // Parse body ONCE and destructure all fields
    const body = await request.json();
    const { action, roomId, questionIndex, questions: importedQuestions } = body;

    if (!roomId || !action) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const roomRef = adminDb.collection('rooms').doc(roomId);

    switch (action) {
      case 'start_question':
        if (questionIndex === undefined) throw new Error('Missing questionIndex');
        
        // Read custom questions from the room doc if they exist, fallback to default questions
        const roomDocForStart = await roomRef.get();
        let activeQuestionsList = questions;
        if (roomDocForStart.exists) {
          const roomData = roomDocForStart.data();
          if (roomData?.questions && Array.isArray(roomData.questions)) {
            activeQuestionsList = roomData.questions;
          }
        }

        const question = activeQuestionsList[questionIndex];
        if (!question) throw new Error('Invalid question index');
        
        await roomRef.update({
          status: 'active',
          currentQuestionIndex: questionIndex,
          currentQuestionId: question.id,
          questionStartTime: new Date().getTime(),
          currentQuestionData: {
            text: question.text,
            options: question.options,
            timeLimit: question.timeLimit
          }
        });
        break;

      case 'show_leaderboard':
        await roomRef.update({
          status: 'leaderboard'
        });
        break;

      case 'resume_room':
        await roomRef.update({
          status: 'waiting'
        });
        break;

      case 'import_questions':
        if (!Array.isArray(importedQuestions)) throw new Error('Invalid questions format');
        await roomRef.set({
          questions: importedQuestions
        }, { merge: true });
        break;

      case 'set_user_limit':
        const { maxUsers } = body;
        if (maxUsers === undefined || typeof maxUsers !== 'number' || maxUsers < 1) {
          throw new Error('Giới hạn số người chơi không hợp lệ.');
        }
        await roomRef.set({
          maxUsers: maxUsers
        }, { merge: true });
        break;

      case 'kick_user':
        const { employeeId } = body;
        if (!employeeId) throw new Error('Thiếu mã nhân viên để kick.');
        
        const userRef = roomRef.collection('users').doc(employeeId);
        const answersSnapshot = await roomRef.collection('answers').where('employeeId', '==', employeeId).get();
        
        const kickBatch = adminDb.batch();
        kickBatch.delete(userRef);
        answersSnapshot.forEach(doc => {
          kickBatch.delete(doc.ref);
        });
        
        kickBatch.update(roomRef, {
          usersCount: admin.firestore.FieldValue.increment(-1)
        });
        await kickBatch.commit();
        break;

      case 'reset_room':
        const usersSnapshot = await roomRef.collection('users').get();
        const rAnswersSnapshot = await roomRef.collection('answers').get();
        
        // Firestore batch limit is 500 writes — chunk if needed
        const allDeletes = [
          ...usersSnapshot.docs.map(d => d.ref),
          ...rAnswersSnapshot.docs.map(d => d.ref),
        ];

        // Process in batches of 499 (leave 1 slot for room update)
        const CHUNK = 499;
        for (let i = 0; i < allDeletes.length; i += CHUNK) {
          const chunk = allDeletes.slice(i, i + CHUNK);
          const b = adminDb.batch();
          chunk.forEach(ref => b.delete(ref));
          await b.commit();
        }

        // Reset room to fresh state — preserve imported questions
        const roomSnap = await roomRef.get();
        const existingQuestions = roomSnap.exists ? (roomSnap.data()?.questions ?? []) : [];

        await roomRef.set({
          status: 'waiting',
          currentQuestionIndex: -1,
          currentQuestionId: '',
          currentQuestionData: null,
          usersCount: 0,
          questions: existingQuestions,
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin control error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
