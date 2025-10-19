import React from 'react';

export default function ProfileSetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="h-full md:flex md:items-center md:justify-center md:p-4">
        {children}
      </main>
    </div>
  );
}