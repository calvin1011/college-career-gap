'use client';

import React from 'react';

export default function Header() {
  return (
    <header className="flex items-center justify-between h-20 px-8 bg-white border-b border-gray-200">
      <div className="flex-1">
        {/* The header will be enhanced later to show dynamic titles */}
        <h1 className="text-2xl font-semibold text-gray-800">Resource Hub</h1>
      </div>
    </header>
  );
}