'use client';

import React from 'react';
import { Info } from 'lucide-react';

interface TemplatePlaceholderHelperProps {
  content: string;
  templateUsed?: boolean;
}

export function TemplatePlaceholderHelper({ content, templateUsed }: TemplatePlaceholderHelperProps) {
  if (!templateUsed) return null;

  const placeholderMatches = content.match(/\[([^\]]+)]/g);
  const placeholderCount = placeholderMatches ? placeholderMatches.length : 0;

  if (placeholderCount === 0) {
    return (
      <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg text-sm">
        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <span className="text-green-700 font-medium">
          Template ready! All placeholders filled.
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-900 mb-1">
          {placeholderCount} placeholder{placeholderCount !== 1 ? 's' : ''} remaining
        </p>
        <p className="text-xs text-blue-700">
          Replace text in [brackets] with your information. You can remove any sections you don&#39;t need.
        </p>
        {placeholderCount <= 5 && (
          <div className="mt-2 space-y-1">
            <p className="text-xs font-semibold text-blue-800">Remaining:</p>
            {placeholderMatches?.slice(0, 5).map((placeholder, index) => (
              <div key={index} className="text-xs text-blue-700 font-mono bg-blue-100 px-2 py-1 rounded">
                {placeholder}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}