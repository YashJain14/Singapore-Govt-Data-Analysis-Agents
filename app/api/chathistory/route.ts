import { NextRequest, NextResponse } from 'next/server';
import { getAllConversationsByUserId} from '@/lib/actions/db.actions';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { message: 'Missing required field: userId.' },
      { status: 400 }
    );
  }

  try {
    const conversations = await getAllConversationsByUserId(userId);
    
    if (!conversations) {
      return NextResponse.json(
        { message: `No conversations found for userId: ${userId}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ conversations });
  } catch (error: unknown) {
    console.error('Error fetching conversations:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred';

    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: errorMessage 
      },
      { status: 500 }
    );
  }
}