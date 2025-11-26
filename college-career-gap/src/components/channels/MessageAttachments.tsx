import React from 'react';
import { MessageAttachment } from '@/types';
import { Paperclip, FileText, Image as ImageIcon, Download } from 'lucide-react';
import Image from 'next/image';

interface MessageAttachmentsProps {
  attachments: MessageAttachment[];
}

export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-600" />;
      default:
        return <Paperclip className="w-4 h-4" />;
    }
  };

  return (
    <div className="mt-3 space-y-2">
      {attachments.map((attachment) => (
        <div key={attachment.id}>
          {attachment.type === 'image' ? (
            /* FIX: Added opening <a> tag here */
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block relative w-full max-w-md rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-colors group"
            >
              <Image
                src={attachment.url}
                alt={attachment.name}
                width={400}
                height={300}
                className="object-cover w-full h-auto"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center">
                <Download className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>
          ) : (
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              download={attachment.name}
              className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-blue-400 transition-colors group"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200 group-hover:border-blue-400 transition-colors">
                {getFileIcon(attachment.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {attachment.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(attachment.size)}
                </p>
              </div>
              <Download className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}