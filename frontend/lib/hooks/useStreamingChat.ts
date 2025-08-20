import { useState, useCallback, useRef, useEffect } from "react";

import { useNetworkAwareOperation } from "@/lib/hooks/useNetworkStatus";
import type { ChatMessage, UserPreferences } from "@/types";

interface UseStreamingChatReturn {
  messages: ChatMessage[];
  streamingMessage: string | null;
  isStreaming: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

// Helper function to format preference selection messages
function formatPreferenceMessage(message: string): string {
  if (!message.startsWith("PREFERENCE_SELECTION:")) {
    return message;
  }

  const parts = message.replace("PREFERENCE_SELECTION:", "").split(":");
  if (parts.length !== 2) {
    return message;
  }

  const [preferenceType, value] = parts;

  // Format preference type and value in a human-readable way
  const formatMap: Record<string, string> = {
    tone: "Preferred Tone of Voice",
    news_topics: "News Topic Interest",
    language: "Language Preference",
    region: "Region Preference",
    depth: "Content Depth Preference",
    source_type: "Source Type Preference",
    interaction_style: "Interaction Style",
    format: "Format Preference",
  };

  const formattedType =
    formatMap[preferenceType] ||
    preferenceType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

  // Handle comma-separated values (like topics) and ensure proper capitalization
  const formatValue = (val: string): string => {
    // Check if it's multiple values separated by commas
    if (val.includes(",")) {
      return val
        .split(",")
        .map((item) => item.trim())
        .map(
          (item) => item.charAt(0).toUpperCase() + item.slice(1).toLowerCase()
        )
        .join(", ");
    }

    // Handle special cases for better formatting
    const specialCases: Record<string, string> = {
      bullet_points: "Bullet Points",
      numbered_list: "Numbered List",
      q_and_a: "Q&A",
      api: "API",
      usa: "USA",
      uk: "UK",
      eu: "EU",
    };

    const lowerVal = val.toLowerCase();
    if (specialCases[lowerVal]) {
      return specialCases[lowerVal];
    }

    // Default capitalization
    return val
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const formattedValue = formatValue(value);

  return `${formattedType}: ${formattedValue}`;
}

export function useStreamingChat(
  initialMessages: ChatMessage[] = [],
  preferences: UserPreferences,
  onPreferencesUpdate: (prefs: UserPreferences) => void,
  conversationId: string
): UseStreamingChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const { networkStatus, getRecommendedTimeout } = useNetworkAwareOperation();

  const sendMessage = useCallback(
    async (content: string) => {
      // Cancel any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setIsStreaming(true);
      setError(null);
      setStreamingMessage("");

      // Add user message immediately (unless it's an init message)
      if (content !== "__INIT_CONVERSATION__") {
        const userMessage: ChatMessage = {
          role: "user",
          content: formatPreferenceMessage(content),
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
      }

      try {
        // Check network connectivity
        if (!networkStatus.isOnline) {
          throw new Error("You're offline. Please check your connection and try again.");
        }

        abortControllerRef.current = new AbortController();
        
        // Use network-aware timeout
        const timeout = getRecommendedTimeout('api');
        const timeoutId = setTimeout(() => {
          abortControllerRef.current?.abort();
        }, timeout);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/chat/stream`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: content,
              conversation_id: conversationId,
              preferences,
            }),
            signal: abortControllerRef.current.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorMessage = `Failed to send message: ${response.status} ${response.statusText}`;
          throw new Error(errorMessage);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let accumulatedMessage = "";

         
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6)) as {
                  type: string;
                  content?: string;
                  message?: ChatMessage;
                  preferences?: UserPreferences;
                  error?: string;
                };

                if (data.type === "chunk") {
                  accumulatedMessage += data.content;
                  setStreamingMessage(accumulatedMessage);
                } else if (data.type === "complete_message") {
                  // Handle preference questions with quick reply options
                  const assistantMessage: ChatMessage = {
                    role: "assistant",
                    content: data.message?.content ?? "",
                    timestamp:
                      data.message?.timestamp ?? new Date().toISOString(),
                    quick_reply_options: data.message?.quick_reply_options,
                    is_preference_question:
                      data.message?.is_preference_question,
                    preference_type: data.message?.preference_type,
                    selection_type: data.message?.selection_type,
                  };
                  setMessages((prev) => [...prev, assistantMessage]);
                  setStreamingMessage(null);

                  // Update preferences if changed
                  if (data.preferences) {
                    onPreferencesUpdate(data.preferences);
                  }
                } else if (data.type === "complete") {
                  // Add the complete assistant message
                  const assistantMessage: ChatMessage = {
                    role: "assistant",
                    content: accumulatedMessage,
                    timestamp: new Date().toISOString(),
                  };
                  setMessages((prev) => [...prev, assistantMessage]);
                  setStreamingMessage(null);

                  // Update preferences if changed
                  if (data.preferences) {
                    onPreferencesUpdate(data.preferences);
                  }
                } else if (data.type === "error") {
                  throw new Error(data.error ?? "Unknown error");
                }
              } catch (e) {
                if (e instanceof SyntaxError) {
                  // Ignore JSON parse errors for incomplete chunks
                  continue;
                }
                throw e;
              }
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          // Stream was cancelled
          setStreamingMessage(null);
        } else {
          console.error("Streaming error:", err);
          const errorMessage = err instanceof Error ? err.message : "Failed to stream message";
          
          // Use error context instead of local error state
          setError(errorMessage);
          
          // Remove the user message on error
          setMessages((prev) => prev.slice(0, -1));
          setStreamingMessage(null);
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [conversationId, preferences, onPreferencesUpdate, networkStatus, getRecommendedTimeout]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamingMessage(null);
    setError(null);
  }, []);

  // Auto-start conversation if no initial messages
  useEffect(() => {
    if (!hasInitialized && initialMessages.length === 0) {
      setHasInitialized(true);
      // Send a special initialization message to trigger preference collection
      void sendMessage("__INIT_CONVERSATION__");
    }
  }, [hasInitialized, initialMessages.length, sendMessage]);

  return {
    messages,
    streamingMessage,
    isStreaming,
    error,
    sendMessage,
    clearMessages,
  };
}
