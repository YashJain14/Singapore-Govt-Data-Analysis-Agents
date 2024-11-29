import React from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { UserButton, useUser } from "@clerk/nextjs";
import type { Conversation } from '@/lib/types';

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

interface SidebarProps {
  conversations: Conversation[];
  isLoadingHistory: boolean;
  currentChatId: string;
  onNewConversation: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  conversations, 
  isLoadingHistory, 
  currentChatId, 
  onNewConversation
}) => {
  const router = useRouter();
  const { user } = useUser();

  return (
    <div className="w-64 flex-shrink-0 bg-gray-50 border-r flex flex-col h-full">
      {/* Fixed Header */}
      <div className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-700">Conversations</h3>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8"
            onClick={onNewConversation}
            title="Create new conversation"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable Conversations */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          {isLoadingHistory ? (
            <p className="text-center text-gray-500">Loading conversations...</p>
          ) : conversations.length === 0 ? (
            <p className="text-center text-gray-500">No conversations yet</p>
          ) : (
            conversations
              .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
              .map((conv) => (
                <div
                  key={conv.chatId}
                  onClick={() => router.push(`/${conv.chatId}`)}
                  className={`
                    p-3 rounded-lg cursor-pointer transition-colors
                    flex items-start gap-3
                    ${conv.chatId === currentChatId 
                      ? 'bg-blue-100 text-blue-900' 
                      : 'hover:bg-gray-100'}
                  `}
                >
                  <MessageSquare className="h-4 w-4 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">
                      {conv.title || 'Untitled Conversation'}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(new Date(conv.lastUpdated))}
                    </p>
                    {/* <p className="text-xs text-gray-500">
                      {conv.messages.length} messages
                    </p> */}
                  </div>
                </div>
            ))
          )}
        </div>
      </div>
      
      {/* Fixed Footer */}
      <div className=" p-4">
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
          <span className="text-sm font-medium text-gray-700 truncate">
            {user?.firstName || user?.username || user?.emailAddresses?.[0]?.emailAddress}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;