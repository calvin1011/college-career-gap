import React from 'react';
import { createRoot } from 'react-dom/client';
import Popup from './Popup';
import { initializeFirebase } from '../shared/firebase';

initializeFirebase();

// Initialize React app
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);