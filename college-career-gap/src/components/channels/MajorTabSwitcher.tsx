'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/utils/cn';

interface MajorTabSwitcherProps {
  primaryMajor: string;
  secondMajor?: string;
  primaryMajorSlug: string;
  secondMajorSlug?: string;
}

export function MajorTabSwitcher({
  primaryMajor,
  secondMajor,
  primaryMajorSlug,
  secondMajorSlug,
}: MajorTabSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Determine which tab is active based on current URL
  const isOnPrimaryMajor = pathname.includes(primaryMajorSlug);
  const isOnSecondMajor = secondMajorSlug && pathname.includes(secondMajorSlug);

  // If no second major, don't render tabs
  if (!secondMajor || !secondMajorSlug) {
    return null;
  }

  const handleTabSwitch = (slug: string) => {
    router.push(`/dashboard/channels/${slug}`);
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center px-4 overflow-x-auto">
        {/* Primary Major Tab */}
        <button
          onClick={() => handleTabSwitch(primaryMajorSlug)}
          className={cn(
            'relative px-6 py-4 font-medium text-sm whitespace-nowrap transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500',
            isOnPrimaryMajor
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          {primaryMajor}
          {isOnPrimaryMajor && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 animate-pulse" />
          )}
        </button>

        {/* Second Major Tab */}
        <button
          onClick={() => handleTabSwitch(secondMajorSlug)}
          className={cn(
            'relative px-6 py-4 font-medium text-sm whitespace-nowrap transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500',
            isOnSecondMajor
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          {secondMajor}
          {isOnSecondMajor && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
}