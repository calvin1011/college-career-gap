'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Smile, X } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

// Education-related emojis organized by category
const EDUCATION_EMOJIS = {
  'Academic': [
    '📚', '📖', '✏️', '📝', '📄', '📃', '📑', '🖊️', '✒️', '🖍️',
    '📏', '📐', '📊', '📈', '📉', '🗂️', '📋', '📌', '📍', '🔖'
  ],
  'Graduation & Success': [
    '🎓', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '⭐', '✨', '🌟',
    '💯', '💪', '👏', '🙌', '🎉', '🎊', '🥳', '🤩', '😊', '😃'
  ],
  'Science & Research': [
    '🔬', '🧬', '🧪', '⚗️', '🧮', '🔭', '🌡️', '💉', '🩺', '⚕️',
    '🧫', '🦠', '🔎', '🔍', '💡', '🔦', '🧲', '⚡', '🔋', '💻'
  ],
  'Business & Career': [
    '💼', '👔', '🏢', '📱', '💰', '💳', '💵', '💴', '📊', '📈',
    '🤝', '👨‍💼', '👩‍💼', '🎯', '📞', '📧', '✉️', '📬', '📮', '🗳️'
  ],
  'Technology': [
    '💻', '🖥️', '⌨️', '🖱️', '🖨️', '📱', '📲', '☎️', '📞', '📟',
    '📠', '💾', '💿', '📀', '🔌', '🔋', '📡', '🛰️', '🌐', '🔗'
  ],
  'Medical & Health': [
    '🩺', '💊', '💉', '🏥', '⚕️', '🧬', '🦷', '🧠', '🫀', '🫁',
    '🦴', '👨‍⚕️', '👩‍⚕️', '🧑‍⚕️', '🏃', '🏋️', '🧘', '🥗', '🍎', '💪'
  ],
  'Engineering': [
    '⚙️', '🔧', '🔨', '🛠️', '⚒️', '🏗️', '🏭', '🔩', '⚡', '🔌',
    '💡', '🧰', '📐', '📏', '🗜️', '🔗', '⛓️', '🧲', '🏗️', '🚧'
  ],
  'Arts & Education': [
    '🎨', '🖌️', '🖍️', '✏️', '🎭', '🎪', '🎬', '🎤', '🎧', '🎼',
    '🎹', '🎸', '🎺', '🎷', '🥁', '📸', '📷', '📹', '🎥', '🖼️'
  ],
  'Psychology & Social': [
    '🧠', '💭', '💬', '🗨️', '🗯️', '💡', '🤔', '😊', '😌', '🤗',
    '👥', '👫', '👬', '👭', '🤝', '💪', '❤️', '🧡', '💛', '💚'
  ],
  'Sports & Kinesiology': [
    '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸',
    '🏒', '🏑', '🥍', '🏏', '⛳', '🏹', '🎣', '🥊', '🥋', '⛷️'
  ],
  'Time & Scheduling': [
    '⏰', '⏱️', '⌚', '⏳', '⏲️', '🕐', '🕑', '🕒', '📅', '📆',
    '🗓️', '📋', '📌', '📍', '🔔', '🔕', '⏸️', '⏯️', '⏹️', '⏺️'
  ],
  'Communication': [
    '📧', '✉️', '📨', '📩', '📤', '📥', '📬', '📭', '📮', '📯',
    '📢', '📣', '📡', '💬', '💭', '🗨️', '🗯️', '💡', '🔔', '📞'
  ],
  'Achievement & Goals': [
    '🎯', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '⭐', '🌟', '✨',
    '💪', '👍', '👌', '✅', '✔️', '☑️', '🎉', '🎊', '📈', '🚀'
  ],
  'Common Reactions': [
    '👍', '👎', '❤️', '💚', '💙', '💛', '🧡', '💜', '🖤', '🤍',
    '😊', '😃', '😄', '🙂', '😌', '🤗', '🤔', '💡', '🔥', '✨'
  ]
};

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>(Object.keys(EDUCATION_EMOJIS)[0]);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    // Don't close picker so users can add multiple emojis
  };

  return (
    <div className="relative" ref={pickerRef}>
      {/* Emoji Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
        title="Add emoji"
      >
        <Smile className="w-5 h-5" />
      </button>

      {/* Emoji Picker Popup */}
      {isOpen && (
        <div className="absolute bottom-12 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-xl w-80 max-h-96">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Education Emojis</h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex overflow-x-auto border-b border-gray-200 scrollbar-thin scrollbar-thumb-gray-300">
            {Object.keys(EDUCATION_EMOJIS).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeCategory === category
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Emoji Grid */}
          <div className="p-3 overflow-y-auto max-h-64">
            <div className="grid grid-cols-8 gap-1">
              {EDUCATION_EMOJIS[activeCategory as keyof typeof EDUCATION_EMOJIS].map((emoji, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleEmojiClick(emoji)}
                  className="text-2xl p-2 hover:bg-gray-100 rounded transition-colors"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Tip */}
          <div className="p-2 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <p className="text-xs text-gray-500 text-center">
              Click an emoji to insert it into your message
            </p>
          </div>
        </div>
      )}
    </div>
  );
}