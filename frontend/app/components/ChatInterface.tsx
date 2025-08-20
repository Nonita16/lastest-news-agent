'use client';

import React, { useEffect } from 'react';

import { usePersistence } from '@/lib/hooks/usePersistence';
import { useStreamingChat } from '@/lib/hooks/useStreamingChat';

import { MessageInput } from './MessageInput';
import { MessageList } from './MessageList';
import { StreamingMessageDisplay } from './StreamingMessageDisplay';

import type { ChatMessage, UserPreferences } from '@/types';

interface ChatInterfaceProps {
  initialMessages?: ChatMessage[];
  preferences: UserPreferences;
  onPreferencesUpdate: (prefs: UserPreferences) => void;
  conversationId: string;
}

export function ChatInterface({
  initialMessages = [],
  preferences,
  onPreferencesUpdate,
  conversationId,
}: ChatInterfaceProps): React.JSX.Element {
  const { saveMessages } = usePersistence();
  const {
    messages,
    streamingMessage,
    isStreaming,
    error,
    sendMessage,
  } = useStreamingChat(
    initialMessages,
    preferences,
    onPreferencesUpdate,
    conversationId,
  );

  const handleQuickReply = (preferenceType: string, value: string): void => {
    // Send preference selection in the format expected by backend
    void sendMessage(`PREFERENCE_SELECTION:${preferenceType}:${value}`);
  };

  // Save messages whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      void saveMessages(conversationId, messages);
    }
  }, [messages, conversationId, saveMessages]);

  return (
    <div className="flex flex-col h-full">

      <div className="flex-1 overflow-y-auto">
        <MessageList
          messages={messages}
          onQuickReply={handleQuickReply}
        />
        {streamingMessage !== null && (
          <StreamingMessageDisplay content={streamingMessage} />
        )}
      </div>

      {(error !== null && error !== '') ? <div className="px-6 py-2 bg-red-50 text-red-600 text-sm">
          {error}
        </div> : null}

      <MessageInput
        disabled={(preferences.language === null || preferences.language === '') || isStreaming}
        isLoading={isStreaming}
        onSend={sendMessage}
      />
    </div>
  );
}
