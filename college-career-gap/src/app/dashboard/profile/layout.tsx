import React from 'react';

export default function ProfileSetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      {children}
    </div>
  );
}