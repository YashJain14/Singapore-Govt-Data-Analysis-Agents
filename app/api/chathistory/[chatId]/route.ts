import { NextRequest, NextResponse } from 'next/server';
import { getConversationByChatId } from '@/lib/actions/db.actions';

export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const chatId = params.chatId;
  const userId = request.nextUrl.searchParams.get('userId');

  if (!chatId || !userId) {
    return NextResponse.json(
      { message: 'Missing required fields: chatId or userId.' },
      { status: 400 }
    );
  }

  try {
    const conversation = await getConversationByChatId(chatId, userId);

    if (!conversation) {
      return NextResponse.json(
        { message: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ conversation });
  } catch (error: unknown) {
    if (error instanceof Error) {
      // If the error is about conversation not found, return 404
      if (error.message === 'Conversation not found') {
        return NextResponse.json(
          { message: 'Conversation not found' },
          { status: 404 }
        );
      }
      
      // For all other Error instances, return 500 with the error message
      return NextResponse.json(
        { message: `Error fetching conversation: ${error.message}` },
        { status: 500 }
      );
    }
    
    // For non-Error objects, return a generic error message
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}