// Content script that runs on job board pages
console.log('College Career Gap - Content script loaded');

// Detect if we're on a job posting page
function isJobPostingPage(): boolean {
  const url = window.location.href.toLowerCase();
  const title = document.title.toLowerCase();

  // Job board specific detection
  const jobKeywords = ['job', 'career', 'position', 'opening', 'internship', 'hiring'];
  const hasJobKeyword = jobKeywords.some(keyword =>
    url.includes(keyword) || title.includes(keyword)
  );

  // Check for job board domains
  const jobBoards = [
    'linkedin.com/jobs',
    'indeed.com',
    'handshake.com',
    'glassdoor.com',
    'monster.com',
    'ziprecruiter.com'
  ];

  const isJobBoard = jobBoards.some(board => url.includes(board));

  return isJobBoard && hasJobKeyword;
}

// Create floating share button
function createShareButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = 'ccg-share-button';
  button.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
      <polyline points="16 6 12 2 8 6"></polyline>
      <line x1="12" y1="2" x2="12" y2="15"></line>
    </svg>
    <span>Share to Students</span>
  `;

  // Styling
  Object.assign(button.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '999999',
    padding: '12px 20px',
    background: '#16a34a',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
  });

  // Hover effect
  button.onmouseenter = () => {
    button.style.background = '#15803d';
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
  };

  button.onmouseleave = () => {
    button.style.background = '#16a34a';
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  };

  // Click handler
  button.onclick = async () => {
    button.disabled = true;
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
      </svg>
      <span>Opening...</span>
    `;

    // Open extension popup
    chrome.runtime.sendMessage({
      type: 'OPEN_POPUP',
      data: {
        url: window.location.href,
        title: document.title
      }
    });

    // Reset button after 2 seconds
    setTimeout(() => {
      button.disabled = false;
      button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
          <polyline points="16 6 12 2 8 6"></polyline>
          <line x1="12" y1="2" x2="12" y2="15"></line>
        </svg>
        <span>Share to Students</span>
      `;
    }, 2000);
  };

  return button;
}

// Add button to page
function injectShareButton() {
  // Check if button already exists
  if (document.getElementById('ccg-share-button')) {
    return;
  }

  // Only show on job posting pages
  if (!isJobPostingPage()) {
    return;
  }

  const button = createShareButton();
  document.body.appendChild(button);

  console.log('Share button injected');
}

// Wait for page to load, then inject button
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectShareButton);
} else {
  injectShareButton();
}

// Re-inject on navigation (for single-page apps like LinkedIn)
let lastUrl = window.location.href;
new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;

    // Remove old button
    const oldButton = document.getElementById('ccg-share-button');
    if (oldButton) {
      oldButton.remove();
    }

    // Re-inject if still on job page
    setTimeout(injectShareButton, 500);
  }
}).observe(document.body, { childList: true, subtree: true });

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SHARE_COMPLETE') {
    // Show success feedback on page
    showSuccessToast();
  }
  return false;
});

// Show success toast
function showSuccessToast() {
  const toast = document.createElement('div');
  toast.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
    <span>Shared successfully!</span>
  `;

  Object.assign(toast.style, {
    position: 'fixed',
    top: '24px',
    right: '24px',
    zIndex: '999999',
    padding: '12px 20px',
    background: '#16a34a',
    color: 'white',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    animation: 'slideInRight 0.3s ease',
  });

  document.body.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);