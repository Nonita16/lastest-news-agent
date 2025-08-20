import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";
import type { UserPreferences } from "@/types";

const defaultPreferences: UserPreferences = {
  tone: null,
  format: null,
  language: null,
  interaction_style: null,
  topics: null,
};

export function usePreferences(initial?: UserPreferences | null): {
  preferences: UserPreferences;
  setPreferences: (preferences: UserPreferences) => void;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  clearPreferences: () => void;
  isComplete: () => boolean;
} {
  const [preferences, setPreferences, clearPreferences] =
    useLocalStorage<UserPreferences>(
      "user_preferences",
      initial ?? defaultPreferences
    );

  const updatePreferences = useCallback(
    (updates: Partial<UserPreferences>) => {
      setPreferences((prev) => ({ ...prev, ...updates }));
    },
    [setPreferences]
  );

  const isComplete = useCallback(
    () =>
      !!(
        preferences.tone &&
        preferences.format &&
        preferences.language &&
        preferences.interaction_style &&
        preferences.topics?.length
      ),
    [preferences]
  );

  return {
    preferences,
    setPreferences,
    updatePreferences,
    clearPreferences,
    isComplete,
  };
}
