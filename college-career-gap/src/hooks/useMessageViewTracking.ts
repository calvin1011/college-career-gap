'use client';

import { useEffect, useRef, useState } from 'react';
import { recordMessageView } from '@/components/channels/ChannelService';

/**
 * A custom hook to track when a message is viewed by a student.
 * Uses Intersection Observer to fire when the element is 50% visible for 1 second.
 *
 * @param messageId The ID of the message to track.
 * @param userRole The role of the current user ('student' or 'admin').
 * @returns A ref to be attached to the message's container element.
 */
export function useMessageViewTracking(messageId: string, userRole?: 'student' | 'admin') {
  const ref = useRef<HTMLDivElement | null>(null);
  const [hasViewed, setHasViewed] = useState(false);

  useEffect(() => {
    // Only track views for students and only track once
    if (userRole !== 'student' || hasViewed) {
      return;
    }

    const currentRef = ref.current;
    if (!currentRef) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasViewed) {
          // Wait 1 second to ensure the user actually saw it
          const timer = setTimeout(() => {
            // Check again in case it scrolled out of view
            if (entry.isIntersecting && !hasViewed) {
              recordMessageView(messageId);
              setHasViewed(true);
              if (currentRef) {
                observer.unobserve(currentRef);
              }
            }
          }, 1000); // 1-second delay

          // Return a cleanup function for the timer
          return () => clearTimeout(timer);
        }
      },
      {
        threshold: 0.5, // 50% of the message must be visible
      }
    );

    observer.observe(currentRef);

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [messageId, userRole, hasViewed]);

  return ref;
}