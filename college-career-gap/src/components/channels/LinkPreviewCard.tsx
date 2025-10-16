import React from 'react';
import { LinkPreview } from '@/types';
import { Link } from 'lucide-react';

interface LinkPreviewCardProps {
  preview: LinkPreview;
}

export function LinkPreviewCard({ preview }: LinkPreviewCardProps) {
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 block bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg overflow-hidden transition-colors"
    >
      <div className="flex">
        {preview.image && (
          <div className="flex-shrink-0 w-32 h-32 bg-cover bg-center" style={{ backgroundImage: `url(${preview.image})` }} />
        )}
        <div className="p-4 flex flex-col justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800 line-clamp-2">{preview.title}</p>
            <p className="text-xs text-gray-600 mt-1 line-clamp-3">{preview.description}</p>
          </div>
          <div className="flex items-center text-xs text-gray-500 mt-2">
            <Link className="w-3 h-3 mr-1.5" />
            <span>{preview.domain}</span>
          </div>
        </div>
      </div>
    </a>
  );
}