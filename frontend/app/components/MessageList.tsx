import React, { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

import { QuickReplyPills } from "./QuickReplyPills";

import type { ChatMessage } from "@/types";

interface MessageListProps {
  messages: ChatMessage[];
  onQuickReply?: (preferenceType: string, value: string) => void;
}

export function MessageList({
  messages,
  onQuickReply,
}: MessageListProps): React.JSX.Element {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.timestamp}
          className={`flex ${
            message.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`max-w-2xl px-4 py-2 rounded-lg ${
              message.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            <div
              className={`markdown-content ${
                message.role === "user" ? "user-message" : ""
              }`}
            >
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
            {message.quick_reply_options && onQuickReply ? (
              <QuickReplyPills
                options={message.quick_reply_options}
                preferenceType={message.preference_type}
                selectionType={message.selection_type}
                onSelect={(value) =>
                  onQuickReply(message.preference_type ?? "", value)
                }
              />
            ) : null}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
