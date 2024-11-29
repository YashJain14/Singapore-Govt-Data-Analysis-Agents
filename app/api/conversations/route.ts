import { NextRequest, NextResponse } from 'next/server';
import { 
  createConversation, 
  updateMessagesByChatId, 
  getConversationByChatId 
} from '@/lib/actions/db.actions';

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json(
      { message: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }

  const { userId, chatId, messages, title, selectedDataset } = body;

  // Check for required fields and their types
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json(
      { message: 'Invalid or missing userId' },
      { status: 400 }
    );
  }

  if (!chatId || typeof chatId !== 'string') {
    return NextResponse.json(
      { message: 'Invalid or missing chatId' },
      { status: 400 }
    );
  }

  if (!Array.isArray(messages)) {
    return NextResponse.json(
      { message: 'Messages must be an array' },
      { status: 400 }
    );
  }

  if (!title || typeof title !== 'string') {
    return NextResponse.json(
      { message: 'Invalid or missing title' },
      { status: 400 }
    );
  }

  try {
    const existingConversation = await getConversationByChatId(chatId, userId);
    
    if (existingConversation) {
      try {
        const updatedConversation = await updateMessagesByChatId(chatId, messages, selectedDataset);
        return NextResponse.json({
          message: 'Conversation updated successfully',
          conversation: updatedConversation
        });
      } catch (updateError: unknown) {
        return NextResponse.json(
          { message: 'Failed to update conversation' },
          { status: 500 }
        );
      }
    } else {
      try {
        const newConversation = await createConversation(userId, chatId, messages, title, selectedDataset);
        return NextResponse.json({
          message: 'Conversation created successfully',
          conversation: newConversation
        }, { status: 201 });
      } catch (createError: unknown) {
        if (createError instanceof Error && createError.message.includes('already exists')) {
          return NextResponse.json(
            { message: 'Conversation ID already in use' },
            { status: 409 }
          );
        }
        
        return NextResponse.json(
          { message: 'Failed to create conversation' },
          { status: 500 }
        );
      }
    }
  } catch (error: unknown) {
    const errorResponse = {
      message: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}