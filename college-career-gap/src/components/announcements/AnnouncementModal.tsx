'use client';

import React from 'react';
import { Announcement } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Sparkles, X } from 'lucide-react';

interface AnnouncementModalProps {
  announcement: Announcement;
  onDismiss: () => void;
}

export function AnnouncementModal({ announcement, onDismiss }: AnnouncementModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md relative animate-in fade-in zoom-in duration-200">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">What&apos;s New!</h2>
                <p className="text-sm text-gray-500">College Career Gap Update</p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close announcement"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {announcement.title}
            </h3>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {announcement.message}
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <Button
              onClick={onDismiss}
              className="w-full"
            >
              Got it!
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}