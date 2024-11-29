import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import ReactMarkdown from 'react-markdown';
import type { Message } from '@/lib/types';

const ChatMessage = ({ message }: { message: Message }) => {
  const [imageError, setImageError] = useState<Record<string, boolean>>({});

  return (
    <Card 
      className={`max-w-[80%] ${
        message.role === 'user' 
          ? 'bg-blue-500 text-white' 
          : 'bg-white dark:bg-gray-800'
      }`}
    >
      <CardContent className="p-4">
        <div className={message.role === 'user' ? 'text-white' : 'text-gray-900 dark:text-gray-100'}>
        <ReactMarkdown
  className="whitespace-pre-wrap break-words"
>
  {message.content.replace(/\n{2,}/g, '\n')}
</ReactMarkdown>
        </div>
        
        {message.images && message.images.length > 0 && message.images.map((imageName, index) => (
          !imageError[index] && (
            <div key={index} className="mt-4">
              <img
                src={`${imageName}`}
                alt={`Analysis visualization ${index + 1}`}
                className="rounded-lg w-full h-auto max-h-[400px] object-contain"
                onError={() => setImageError(prev => ({ ...prev, [index]: true }))}
              />
            </div>
          )
        ))}
      </CardContent>
    </Card>
  );
};

export default ChatMessage;