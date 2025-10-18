'use client';

import React from 'react';
import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="flex items-center justify-between h-20 px-4 sm:px-8 bg-white border-b border-gray-200">
      {/* Hamburger Menu Button - visible only on small screens */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 text-gray-600 hover:text-gray-900"
        aria-label="Open sidebar"
      >
        <Menu className="w-6 h-6" />
      </button>

      <div className="flex-1">
      </div>
    </header>
  );
}