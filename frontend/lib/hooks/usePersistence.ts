import { useEffect, useState, useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { usePreferences } from "./usePreferences";
import type { ChatMessage, UserPreferences } from "@/types";

interface SessionState {
  conversationId: string;
  lastActivity: number;
  pendingMessage?: string;
}

interface UsePersistenceReturn {
  saveMessages: (conversationId: string, messages: ChatMessage[]) => void;
  savePreferences: (preferences: UserPreferences) => void;
  saveSession: (conversationId: string) => void;
  recoverData: () => {
    messages: ChatMessage[];
    preferences: UserPreferences | null;
    conversationId: string | null;
  };
  clearData: () => void;
  isLoading: boolean;
}

export function usePersistence(): UsePersistenceReturn {
  const [isLoading] = useState(false); // Always false for localStorage operations
  const { clearPreferences } = usePreferences();
  const [sessionState, setSessionState, clearSession] =
    useLocalStorage<SessionState | null>("session_state", null);

  // Auto-cleanup old data on mount and periodically
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const cleanupOldData = () => {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
      const keys = Object.keys(localStorage);

      keys.forEach((key) => {
        if (key.startsWith("chat_messages_")) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              const parsed = JSON.parse(data);
              if (parsed.timestamp && parsed.timestamp < cutoff) {
                localStorage.removeItem(key);
              }
            }
          } catch {
            localStorage.removeItem(key);
          }
        }
      });

      // Check if session is expired (>24 hours)
      if (
        sessionState &&
        Date.now() - sessionState.lastActivity > 24 * 60 * 60 * 1000
      ) {
        clearSession();
      }
    };

    cleanupOldData();

    const interval = setInterval(cleanupOldData, 24 * 60 * 60 * 1000); // Daily cleanup
    return () => clearInterval(interval);
  }, [sessionState, clearSession]);

  const saveMessages = useCallback(
    (conversationId: string, messages: ChatMessage[]) => {
      if (typeof window === "undefined") {
        return;
      }

      try {
        const limitedMessages = messages.slice(-100); // Keep last 100 messages
        const data = {
          conversationId,
          messages: limitedMessages,
          timestamp: Date.now(),
        };
        localStorage.setItem(
          `chat_messages_${conversationId}`,
          JSON.stringify(data)
        );
      } catch (error) {
        console.error("Failed to save messages:", error);
      }
    },
    []
  );

  const savePreferences = useCallback((preferences: UserPreferences) => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.setItem("user_preferences", JSON.stringify(preferences));
    } catch (error) {
      console.error("Failed to save preferences:", error);
    }
  }, []);

  const saveSession = useCallback(
    (conversationId: string) => {
      try {
        const sessionData: SessionState = {
          conversationId,
          lastActivity: Date.now(),
        };
        setSessionState(sessionData);
      } catch (error) {
        console.error("Failed to save session:", error);
      }
    },
    [setSessionState]
  );

  const recoverData = useCallback(() => {
    if (typeof window === "undefined") {
      return {
        messages: [],
        preferences: null,
        conversationId: null,
      };
    }

    try {
      // Recover preferences directly from localStorage to avoid circular dependency
      let recoveredPreferences: UserPreferences | null = null;
      try {
        const prefsData = localStorage.getItem("user_preferences");
        if (prefsData) {
          recoveredPreferences = JSON.parse(prefsData);
        }
      } catch (error) {
        console.warn("Failed to recover preferences:", error);
      }

      const recoveredSession = sessionState;

      let recoveredMessages: ChatMessage[] = [];
      let conversationId = recoveredSession?.conversationId;

      // If no session state, try to find the most recent conversation
      if (!conversationId) {
        try {
          const keys = Object.keys(localStorage);
          const messageKeys = keys.filter((key) =>
            key.startsWith("chat_messages_")
          );

          if (messageKeys.length > 0) {
            // Find the most recent conversation by timestamp
            let mostRecentKey = "";
            let mostRecentTimestamp = 0;

            for (const key of messageKeys) {
              try {
                const data = localStorage.getItem(key);
                if (data) {
                  const parsed = JSON.parse(data);
                  if (parsed.timestamp > mostRecentTimestamp) {
                    mostRecentTimestamp = parsed.timestamp;
                    mostRecentKey = key;
                  }
                }
              } catch (error) {
                console.warn(`Failed to parse ${key}:`, error);
              }
            }

            if (mostRecentKey) {
              conversationId = mostRecentKey.replace("chat_messages_", "");
            }
          }
        } catch (error) {
          console.warn("Failed to scan for conversations:", error);
        }
      }

      // Now try to recover messages with the conversation ID
      if (conversationId) {
        try {
          const data = localStorage.getItem(`chat_messages_${conversationId}`);
          if (data) {
            const parsed = JSON.parse(data);
            recoveredMessages = parsed.messages || [];
          }
        } catch (error) {
          console.warn("Failed to recover messages:", error);
        }
      }

      return {
        messages: recoveredMessages,
        preferences: recoveredPreferences,
        conversationId: conversationId ?? null,
      };
    } catch (error) {
      console.error("Failed to recover data:", error);
      return {
        messages: [],
        preferences: null,
        conversationId: null,
      };
    }
  }, [sessionState]);

  const clearData = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      // Clear preferences
      clearPreferences();

      // Clear session
      clearSession();

      // Clear all message keys
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith("chat_messages_")) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error("Failed to clear data:", error);
    }
  }, [clearPreferences, clearSession]);

  return {
    saveMessages,
    savePreferences,
    saveSession,
    recoverData,
    clearData,
    isLoading,
  };
}
