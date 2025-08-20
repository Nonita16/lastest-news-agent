"use client";

import { useState, memo } from "react";
import { usePreferences } from "@/lib/hooks/usePreferences";

interface QuickReplyOption {
  label: string;
  value: string;
}

interface QuickReplyPillsProps {
  options: QuickReplyOption[];
  onSelect: (value: string) => void;
  selectionType?: "single" | "multiple";
  preferenceType?: string;
  disabled?: boolean;
}

export const QuickReplyPills = memo(
  ({
    options,
    onSelect,
    selectionType = "single",
    preferenceType,
    disabled = false,
  }: QuickReplyPillsProps) => {
    const { preferences } = usePreferences();

    // Initialize state based on existing preferences
    const [selectedValues, setSelectedValues] = useState<string[]>(() => {
      if (!preferenceType) return [];

      switch (preferenceType) {
        case "tone":
          return preferences.tone ? [preferences.tone] : [];
        case "format":
          return preferences.format ? [preferences.format] : [];
        case "language":
          return preferences.language ? [preferences.language] : [];
        case "interaction_style":
          return preferences.interaction_style
            ? [preferences.interaction_style]
            : [];
        case "topics":
          // Handle topics as either array or comma-separated string
          if (Array.isArray(preferences.topics)) {
            return preferences.topics;
          } else if (typeof preferences.topics === "string") {
            return (preferences.topics as string)
              .split(",")
              .map((t: string) => t.trim());
          }
          return [];
        default:
          return [];
      }
    });

    const [isSubmitted, setIsSubmitted] = useState(() => {
      if (!preferenceType) return false;

      switch (preferenceType) {
        case "tone":
          return !!preferences.tone;
        case "format":
          return !!preferences.format;
        case "language":
          return !!preferences.language;
        case "interaction_style":
          return !!preferences.interaction_style;
        case "topics":
          // Handle topics as either array or comma-separated string
          if (Array.isArray(preferences.topics)) {
            return preferences.topics.length > 0;
          } else if (typeof preferences.topics === "string") {
            return (preferences.topics as string).trim().length > 0;
          }
          return false;
        default:
          return false;
      }
    });

    const handlePillClick = (value: string): void => {
      if (disabled || isSubmitted) {
        return;
      }

      if (selectionType === "single") {
        // Single selection - update selected values and send immediately
        setSelectedValues([value]);
        setIsSubmitted(true);
        onSelect(value);
      } else {
        // Multiple selection - toggle selection
        setSelectedValues((prev) => {
          if (prev.includes(value)) {
            return prev.filter((v) => v !== value);
          }
          return [...prev, value];
        });
      }
    };

    const handleDoneClick = (): void => {
      if (selectedValues.length > 0) {
        setIsSubmitted(true);
        // Send comma-separated values for multiple selection
        onSelect(selectedValues.join(","));
      }
    };

    if (isSubmitted) {
      return (
        <div className="flex flex-wrap gap-2 mt-3 opacity-80">
          {options.map((option) => (
            <div
              key={option.value}
              className={`px-4 py-1 rounded-full text-xs font-medium 
              ${
                selectedValues.includes(option.value)
                  ? "bg-blue-100 border-blue-300 text-blue-700"
                  : "bg-gray-100 border-gray-300 text-gray-500"
              }`}
            >
              {option.label}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {options.map((option) => (
          <button
            key={option.value}
            className={`px-4 py-1 rounded-full text-xs font-medium transition-all duration-200
            ${
              selectedValues.includes(option.value)
                ? "bg-blue-500 text-white border-2 border-blue-500 shadow-md transform scale-105"
                : "bg-white text-gray-500 border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50"
            }
            ${
              disabled
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer hover:shadow-md"
            }
            active:transform active:scale-95`}
            disabled={disabled}
            onClick={() => handlePillClick(option.value)}
          >
            {option.label}
            {selectionType === "multiple" &&
              selectedValues.includes(option.value) && (
                <span className="ml-1">✓</span>
              )}
          </button>
        ))}

        {selectionType === "multiple" && (
          <button
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-200
            ${
              selectedValues.length > 0
                ? "bg-green-500 text-white hover:bg-green-600 shadow-md"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            disabled={disabled || selectedValues.length === 0}
            onClick={handleDoneClick}
          >
            Done ({selectedValues.length} selected)
          </button>
        )}
      </div>
    );
  }
);
