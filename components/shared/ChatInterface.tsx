"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import DatasetSelector from './DatasetSelector';
import Sidebar from './Sidebar';
import DatasetPanel from './DatasetPanel';
import ChatMessage from './ChatMessage';
import type { Message, Dataset, Conversation } from '@/lib/types';
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';

const MAX_DATASETS = 3;


const LoadingMessage = () => (
  <Card className="max-w-[80%] bg-white dark:bg-gray-800">
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Generating response...</span>
      </div>
    </CardContent>
  </Card>
);


const generateTitle = (datasets: Dataset[]): string => {
  if (datasets.length === 0) return 'New Conversation';
  if (datasets.length === 1) {
    return `${datasets[0].title.charAt(0).toUpperCase() + datasets[0].title.slice(1)} Analysis`;
  }
  const topics = datasets.map(d => d.topic);
  if (topics.every(t => t === topics[0])) {
    return `${topics[0].charAt(0).toUpperCase() + topics[0].slice(1)} Multi-Dataset Analysis`;
  }
  return `Cross-Domain Analysis: ${topics.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}`;
};

const ChatInterface: React.FC = () => {
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedDataset, setSelectedDataset] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [autoTitle, setAutoTitle] = useState<string>('New Conversation');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const previousChatId = useRef<string | null>(null);
  const previousUserId = useRef<string | null>(null);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true); // New state for welcome message

  
  // Hooks
  const params = useParams();
  const router = useRouter();
  const chatId = params?.chatId as string;
  const { userId } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch conversations on component mount
  useEffect(() => {
    const fetchConversations = async () => {
      if (!userId) return;
      setIsLoadingHistory(true);
      
      try {
        const response = await fetch(`/api/chathistory?userId=${userId}`);
        if (!response.ok) throw new Error('Failed to fetch conversations');
        
        const data = await response.json();
        if (data.conversations) {
          setConversations(data.conversations);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchConversations();
  }, [userId]);

  // Load specific conversation when chatId changes
  useEffect(() => {
    // Skip if same chatId and userId
    if (
      chatId === previousChatId.current && 
      userId === previousUserId.current
    ) {
      return;
    }

    // Skip if already loading
    if (isLoadingConversation) {
      return;
    }

    // Skip if missing required data
    if (!chatId || !userId) {
      return;
    }

    // Update refs
    previousChatId.current = chatId;
    previousUserId.current = userId;

    const loadConversation = async () => {
      setIsLoadingConversation(true);
      
      try {
        const response = await fetch(`/api/chathistory/${chatId}?userId=${userId}`);
        
        if (response.status === 404) {
          console.error('Conversation not found');
          
          return;
        }
        
        if (!response.ok) {
          throw new Error('Failed to load conversation');
        }
        
        const data = await response.json();
        
        // Only update state if we're still on the same conversation
        if (chatId === previousChatId.current) {
          if (data.conversation) {
            setShowWelcomeMessage(false); // Hide welcome message when a conversation is selected

            setMessages(data.conversation.messages || []);
            setSelectedDataset(data.conversation.selectedDataset || []);
            setAutoTitle(data.conversation.title || 'New Conversation');
            
            setConversations(prev => {
              const exists = prev.some(conv => conv.chatId === chatId);
              if (!exists) {
                return [...prev, data.conversation];
              }
              return prev.map(conv => 
                conv.chatId === chatId ? data.conversation : conv
              );
            });
          }
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
        // Only reset states if we're still on the same conversation
        if (chatId === previousChatId.current) {
          setMessages([]);
          setSelectedDataset([]);
          setAutoTitle('New Conversation');
        }
      } finally {
        if (chatId === previousChatId.current) {
          setIsLoadingConversation(false);
        }
      }
    };

    loadConversation();

    // Cleanup function
    return () => {
      // If we're navigating away, reset the previous refs
      if (chatId !== previousChatId.current) {
        previousChatId.current = null;
        previousUserId.current = null;
      }
    };
  }, [chatId, userId, router, isLoadingConversation]);
  // Create new conversation
  const handleCreateNewConversation = () => {
    // Generate a UUID v4
    const uuid = crypto.randomUUID();
    router.push(`/${uuid}`);
  };

  // Send message handler
  const handleSendMessage = async () => {
    setShowWelcomeMessage(false);
  
    if (!inputMessage.trim() || isLoading || !chatId || !userId) return;
  
    if (selectedDataset.length === 0) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Please select a dataset first by clicking the 'Add Dataset' button.",
      }]);
      return;
    }
  
    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };
  
    const isFirstMessage = messages.length === 0;
    if (isFirstMessage) {
      setAutoTitle(inputMessage);
    }
  
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
  
    try {
      // Update conversation with user message
      await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          chatId,
          messages: [...messages, userMessage],
          title: isFirstMessage ? inputMessage : autoTitle,
          selectedDataset
        })
      });
  
      // Get AI response
      const aiResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          datasets: selectedDataset,
        }),
      });
  
      if (!aiResponse.ok) throw new Error('Failed to get AI response');
      
      const data = await aiResponse.json();
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        ...(data.images?.length ? { images: data.images } : {}),
        timestamp: new Date(),
      };
  
      const updatedMessages = [...messages, userMessage, assistantMessage];
      setMessages(updatedMessages);
  
      // Update conversation with AI response
      await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          chatId,
          messages: updatedMessages,
          title: isFirstMessage ? inputMessage : autoTitle,
          selectedDataset
        })
      });
  
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I apologize, but I encountered an error processing your request. Please try again.",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Dataset selection handler
  const handleDatasetSelect = async (dataset: Dataset) => {
    if (!chatId || !userId) return;

    if (selectedDataset.some(d => d.url === dataset.url)) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Dataset "${dataset.title}" is already selected.`,
      }]);
      return;
    }

    if (selectedDataset.length >= MAX_DATASETS) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `You can select a maximum of ${MAX_DATASETS} datasets. Please remove a dataset before adding a new one.`,
      }]);
      return;
    }

    const newSelectedDatasets = [...selectedDataset, dataset];
    const newTitle = generateTitle(newSelectedDatasets);
    setSelectedDataset(newSelectedDatasets);
    setAutoTitle(newTitle);

    const systemMessage: Message = {
      role: 'assistant',
      content: `Dataset "${dataset.title}" has been added. ${
        MAX_DATASETS - selectedDataset.length - 1 > 0 
          ? `You can add ${MAX_DATASETS - selectedDataset.length - 1} more dataset${MAX_DATASETS - selectedDataset.length - 1 > 1 ? 's' : ''}.`
          : 'You have reached the maximum number of datasets.'
      } How can I help you analyze this data?`,
    };
    
    const updatedMessages = [...messages, systemMessage];
    setMessages(updatedMessages);

    try {
      await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          chatId,
          messages: updatedMessages,
          title: newTitle,
          selectedDataset: newSelectedDatasets
        })
      });
    } catch (error) {
      console.error('Error updating conversation:', error);
    }
  };

  // Dataset removal handler
  const handleRemoveDataset = async (datasetToRemove: Dataset) => {
    if (!chatId || !userId) return;

    const newSelectedDatasets = selectedDataset.filter(d => d.url !== datasetToRemove.url);
    const newTitle = generateTitle(newSelectedDatasets);
    setSelectedDataset(newSelectedDatasets);
    setAutoTitle(newTitle);

    const systemMessage: Message = {
      role: 'assistant',
      content: `Dataset "${datasetToRemove.title}" has been removed.`,
    };
    
    const updatedMessages = [...messages, systemMessage];
    setMessages(updatedMessages);

    try {
      await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          chatId,
          messages: updatedMessages,
          title: newTitle,
          selectedDataset: newSelectedDatasets
        })
      });
    } catch (error) {
      console.error('Error updating conversation:', error);
    }
  };

  // Render component
  return (
    <div className="flex h-full w-full">
      <Sidebar 
        conversations={conversations}
        isLoadingHistory={isLoadingHistory}
        currentChatId={chatId}
        onNewConversation={handleCreateNewConversation}
      />

      <div className="flex-1 flex flex-col w-full border-r">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">MIA: Market Intelligence Agent</h2>
          <DatasetSelector onDatasetSelect={handleDatasetSelect} />
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-auto p-4 space-y-4">

          {showWelcomeMessage && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 welcome-box place-content-center">
                <div className="text-center text-gray-600 dark:text-gray-400 rounded-lg xl:w-3/4 lg:w-10/12 place-self-center">
                  <div className="lg:text-2xl xl:text-4xl font-bold text-slate-800 pt-8 pb-2 pl-2 pr-2">Welcome to the MIA Chatbot!</div>
                  <div className="px-4 pb-6">Start a new conversation or select a previous chat from the sidebar.</div>
                </div>
              </div>
          )}

{messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <ChatMessage message={message} />
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <LoadingMessage />
          </div>
        )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask about your data..."
              className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? 'Sending...' : 'Send'}
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <DatasetPanel
        selectedDataset={selectedDataset}
        maxDatasets={MAX_DATASETS}
        onRemoveDataset={handleRemoveDataset}
      />
    </div>
  );
};

export default ChatInterface;