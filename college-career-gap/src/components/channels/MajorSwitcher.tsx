'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function MajorSwitcher() {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  if (!user?.major) return null;

  const hasTwoMajors = user.major && user.secondMajor;

  if (!hasTwoMajors) {
    // If only one major, just show it without dropdown
    return (
      <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">Your Major:</span> {user.major}
        </p>
      </div>
    );
  }

  const majors = [user.major, user.secondMajor].filter(Boolean);

  const handleMajorSwitch = (major: string) => {
    const majorSlug = major.toLowerCase().replace(/\s/g, '-');
    router.push(`/dashboard/channels/${majorSlug}`);
    setIsOpen(false);
  };

  return (
    <div className="relative px-4 py-2 bg-blue-50 border-b border-blue-100">
      <div className="flex items-center justify-between">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">Your Majors:</span>
        </p>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-200 rounded-md text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors"
        >
          Switch Major
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-4 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden">
            <div className="p-2">
              {majors.map((major) => (
                <button
                  key={major}
                  onClick={() => handleMajorSwitch(major as string)}
                  className="w-full text-left px-4 py-3 rounded-md hover:bg-blue-50 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 group-hover:text-blue-700">
                        {major}
                      </p>
                      <p className="text-xs text-gray-500">
                        View resources & sub-channels
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">
                        {(major as string).split(' ').map(w => w[0]).join('').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="border-t border-gray-200 p-2">
              <button
                onClick={() => {
                  router.push('/dashboard/profile');
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
              >
                Manage majors in Profile Settings
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}