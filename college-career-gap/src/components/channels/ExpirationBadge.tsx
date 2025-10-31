'use client';

import React from 'react';
import { Message, MessageTag } from '@/types';
import { Clock, AlertCircle } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface ExpirationBadgeProps {
  message: Message;
}

const EXPIRATION_DAYS: Record<string, number | null> = {
  'internship': 7,
  'full-time': 7,
  'graduate': null,
  'undergrad': null,
  'podcast': null,
  'advice-tip': null,
};

export function ExpirationBadge({ message }: ExpirationBadgeProps) {
  // Check if message has any expiring tags
  const tags = message.metadata?.tags as MessageTag[] || [];
  const expiringTag = tags.find(tag => EXPIRATION_DAYS[tag] !== null);

  if (!expiringTag) return null;

  const expirationDays = EXPIRATION_DAYS[expiringTag];
  if (!expirationDays) return null;

  // Calculate days remaining
  let createdAt: Date;

  if (message.createdAt instanceof Date) {
    createdAt = message.createdAt;
  } else if (message.createdAt instanceof Timestamp) {
    createdAt = message.createdAt.toDate();
  } else {
    return null;
  }

  const expiresAt = new Date(createdAt);
  expiresAt.setDate(expiresAt.getDate() + expirationDays);

  const now = new Date();
  const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) return null;

  // Show urgent warning if less than 3 days remaining
  if (daysRemaining <= 2) {
    return (
      <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border-2 border-red-400 animate-pulse">
        <AlertCircle className="w-3 h-3 mr-1" />
        Expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}!
      </div>
    );
  }

  // Show warning if less than 5 days remaining
  if (daysRemaining <= 4) {
    return (
      <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border-2 border-orange-400">
        <Clock className="w-3 h-3 mr-1" />
        Expires in {daysRemaining} days
      </div>
    );
  }

  // Show info badge for 5-7 days
  return (
    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-300">
      <Clock className="w-3 h-3 mr-1" />
      Expires in {daysRemaining} days
    </div>
  );
}