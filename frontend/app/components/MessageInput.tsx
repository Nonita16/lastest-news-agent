import React, { useState, useCallback, useRef, useEffect } from "react";
import type { FormEvent } from "react";

interface MessageInputProps {
  onSend: (message: string) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
}

export function MessageInput({
  onSend,
  isLoading,
  disabled,
}: MessageInputProps): React.JSX.Element {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      if (input.trim() === "" || isLoading || (disabled ?? false)) {
        return;
      }

      const message = input.trim();
      setInput("");

      try {
        await onSend(message);
      } catch {
        // Silent error handling, restore input on error
        setInput(message); // Restore input on error
      }
    },
    [input, isLoading, disabled, onSend]
  );

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const canSubmit = !isLoading && !(disabled ?? false) && input.trim() !== "";

  return (
    <form
      className="border-t border-gray-200 px-6 py-4"
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
    >
      <div className="flex space-x-4">
        <input
          ref={inputRef}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
          disabled={isLoading || (disabled ?? false)}
          maxLength={500}
          placeholder="Type your message..."
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          disabled={canSubmit !== true}
          type="submit"
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </div>

      <div className="flex justify-between items-center mt-1">
        <div className="text-xs text-gray-500">
          {input.length}/500 characters
        </div>
      </div>
    </form>
  );
}
