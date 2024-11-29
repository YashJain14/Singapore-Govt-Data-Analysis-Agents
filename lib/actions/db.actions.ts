// lib/actions/db.actions.ts
import { connectToDatabase } from '@/lib/database/connect';
import Conversation from '@/lib/models/Conversation';
import type { Message, Dataset } from '@/lib/types';

const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export const createConversation = async (
  userId: string,
  chatId: string,
  messages: Message[],
  title: string,
  selectedDataset: Dataset[] = []
) => {
  try {
    await connectToDatabase();
    
    const existingConversation = await Conversation.findOne({ chatId });
    if (existingConversation) {
      throw new Error(`Conversation with chatId: ${chatId} already exists`);
    }

    const newConversation = new Conversation({
      userId,
      chatId,
      messages,
      selectedDataset,
      title,
      lastUpdated: new Date()
    });

    const savedConversation = await newConversation.save();
    return savedConversation.toObject();
  } catch (error: unknown) {
    console.error('Error creating conversation:', error);
    throw new Error(`Error creating conversation: ${formatError(error)}`);
  }
};

export const getConversationByChatId = async (chatId: string, userId: string) => {
  try {
    await connectToDatabase();
    const conversation = await Conversation.findOne({ 
      chatId,
      userId
    }).lean();
    
    return conversation || null;
  } catch (error: unknown) {
    console.error('Database error fetching conversation:', error);
    throw new Error(`Database error: ${formatError(error)}`);
  }
};

export const updateMessagesByChatId = async (
  chatId: string,
  newMessages: Message[],
  selectedDataset: Dataset[] = []
) => {
  try {
    await connectToDatabase();
    const updatedConversation = await Conversation.findOneAndUpdate(
      { chatId },
      {
        $set: {
          messages: newMessages,
          selectedDataset,
          lastUpdated: new Date()
        }
      },
      { 
        new: true,
        lean: true 
      }
    );

    if (!updatedConversation) {
      throw new Error(`No conversation found with chatId: ${chatId}`);
    }

    return updatedConversation;
  } catch (error: unknown) {
    console.error('Error updating conversation:', error);
    throw new Error(`Error updating messages by chatId: ${formatError(error)}`);
  }
};

export const getAllConversationsByUserId = async (userId: string) => {
  try {
    await connectToDatabase();
    const conversations = await Conversation
      .find({ userId })
      .sort({ lastUpdated: -1 })
      .lean();
    return conversations;
  } catch (error: unknown) {
    console.error('Error fetching conversations:', error);
    throw new Error(`Error fetching conversations by userId: ${formatError(error)}`);
  }
};