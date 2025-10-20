
import React from 'react';
import { MessageTag, TAG_CONFIG } from '@/types';
import { cn } from '@/utils/cn';

interface TagBadgeProps {
  tag: MessageTag;
  className?: string;
}

export function TagBadge({ tag, className }: TagBadgeProps) {
  const config = TAG_CONFIG[tag];

  if (!config) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border-2',
        config.bgColor,
        config.color,
        config.borderColor,
        className
      )}
    >
      {config.label}
    </span>
  );
}