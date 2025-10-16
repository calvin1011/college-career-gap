import React from 'react';

interface MessageContentRendererProps {
  content: string;
}

export function MessageContentRenderer({ content }: MessageContentRendererProps) {
  // Regular expression to find URLs in text
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);

  return (
    <p className="text-gray-800 leading-relaxed mt-1 whitespace-pre-wrap break-words">
      {parts.map((part, index) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </p>
  );
}