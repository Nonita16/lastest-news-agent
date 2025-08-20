import React from "react";
import ReactMarkdown from "react-markdown";

interface StreamingMessageDisplayProps {
  content: string;
}

export function StreamingMessageDisplay({
  content,
}: StreamingMessageDisplayProps): React.JSX.Element {
  return (
    <div className="px-6 py-4">
      <div className="flex justify-start">
        <div className="max-w-2xl px-4 py-2 rounded-lg bg-gray-100 text-gray-800">
          <div className="markdown-content">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full" />
            <span className="text-sm text-blue-600">Thinking...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
