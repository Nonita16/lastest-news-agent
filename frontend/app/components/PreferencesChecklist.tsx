'use client';

import { memo } from 'react';

import type { UserPreferences } from '@/types';

interface PreferencesChecklistProps {
  preferences: UserPreferences;
}

export const PreferencesChecklist = memo(({
  preferences,
}: PreferencesChecklistProps) => {

  const items = [
    {
      key: 'tone',
      label: 'Preferred Tone of Voice',
      value: preferences.tone,
      icon: '🎭',
      options: ['formal', 'casual', 'enthusiastic'],
    },
    {
      key: 'format',
      label: 'Response Format',
      value: preferences.format,
      icon: '📝',
      options: ['bullet points', 'paragraphs'],
    },
    {
      key: 'language',
      label: 'Language Preference',
      value: preferences.language,
      icon: '🌐',
      options: ['English', 'Spanish', 'French', 'German', 'Italian'],
    },
    {
      key: 'interaction_style',
      label: 'Interaction Style',
      value: preferences.interaction_style,
      icon: '💬',
      options: ['concise', 'detailed'],
    },
    {
      key: 'topics',
      label: 'Preferred News Topics',
      value: preferences.topics?.length ? preferences.topics.join(', ') : null,
      icon: '📰',
      options: ['technology', 'sports', 'politics', 'science', 'business', 'entertainment'],
      isMultiple: true,
    },
  ];


  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.key}>
          <div
            className={`p-3 rounded-lg border ${
              (item.value !== null && item.value !== '')
                ? 'border-green-300 bg-green-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              {(item.value !== null && item.value !== '') ? (
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    clipRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    fillRule="evenodd"
                  />
                </svg>
              ) : (
                <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
              )}
            </div>
            {(item.value !== null && item.value !== '') ? <div className="mt-1 text-xs text-gray-600">{item.value}</div> : null}
          </div>
        </div>
      ))}

     
    </div>
  );
});
