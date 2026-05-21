import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { questions } from '@/lib/questions';

export async function POST(request: Request) {
  try {
    const { action, roomId, questionIndex } = await request.json();

    if (!roomId || !action) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const roomRef = adminDb.collection('rooms').doc(roomId);

    switch (action) {
      case 'start_question':
        if (questionIndex === undefined) throw new Error('Missing questionIndex');
        const question = questions[questionIndex];
        if (!question) throw new Error('Invalid question index');
        
        await roomRef.update({
          status: 'active',
          currentQuestionIndex: questionIndex,
          currentQuestionId: question.id,
          questionStartTime: new Date().getTime(),
          // We can also send limited question info to the room document so clients can read it
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

      case 'import_questions':
        const { questions: importedQuestions } = await request.json();
        if (!Array.isArray(importedQuestions)) throw new Error('Invalid questions format');
        await roomRef.set({
          questions: importedQuestions
        }, { merge: true });
        break;

      case 'reset_room':
        await roomRef.set({
          id: roomId,
          status: 'waiting',
          currentQuestionIndex: -1,
          createdAt: new Date().getTime(),
          usersCount: 0,
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
