'use client';

import React from 'react';
import { MessageTag, TAG_CONFIG } from '@/types';
import { cn } from '@/utils/cn';

interface TagSelectorProps {
  selectedTags: MessageTag[];
  onTagToggle: (tag: MessageTag) => void;
}

export function TagSelector({ selectedTags, onTagToggle }: TagSelectorProps) {
  const getTagStyle = (tag: MessageTag, isSelected: boolean) => {
    if (!isSelected) {
      return 'bg-white text-gray-600 border-gray-300 hover:border-gray-400';
    }

    switch(tag) {
      case 'graduate':
        return 'bg-purple-100 text-purple-700 border-purple-400'
      case 'undergrad':
        return 'bg-yellow-100 text-yellow-700 border-yellow-400';
      case 'podcast':
        return 'bg-pink-100 text-pink-700 border-pink-400';
      case 'advice-tip':
        return 'bg-yellow-100 text-yellow-700 border-yellow-400';
      case 'internship':
        return 'bg-blue-100 text-blue-700 border-blue-400';
      case 'full-time':
        return 'bg-green-100 text-green-700 border-green-400';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-400';
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Add Tags (Optional)
      </label>
      <div className="flex flex-wrap gap-2">
        {Object.entries(TAG_CONFIG).map(([tagKey, config]) => {
          const tag = tagKey as MessageTag;
          const isSelected = selectedTags.includes(tag);

          return (
            <button
              key={tag}
              type="button"
              onClick={() => onTagToggle(tag)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all duration-200',
                'hover:scale-105 active:scale-95',
                getTagStyle(tag, isSelected)
              )}
            >
              {config.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}