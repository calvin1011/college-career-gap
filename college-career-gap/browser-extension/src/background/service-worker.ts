// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({
      url: 'https://collegecareergap.com'
    });
  }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_PAGE_INFO') {
    handleGetPageInfo(sender, sendResponse);
    return true; // Keep channel open for async response
  }

  if (message.type === 'SHARE_SUCCESS') {
    handleShareSuccess(message.data);
  }

  return false;
});

// Handle getting page info
async function handleGetPageInfo(
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: any) => void
) {
  try {
    const tab = sender.tab;
    if (!tab) {
      sendResponse({ error: 'No tab found' });
      return;
    }

    // Try to extract meta description from page
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: () => {
        const metaDescription = document.querySelector('meta[name="description"]');
        const ogDescription = document.querySelector('meta[property="og:description"]');

        return {
          description: metaDescription?.getAttribute('content') ||
                      ogDescription?.getAttribute('content') ||
                      '',
          selectedText: window.getSelection()?.toString() || ''
        };
      }
    });

    sendResponse({
      url: tab.url,
      title: tab.title,
      ...results[0].result
    });
  } catch {
    sendResponse({ error: 'Failed to get page info' });
  }
}

// Handle successful share
function handleShareSuccess(data: { channelName: string; url: string }) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('assets/icon.svg'),
    title: 'Resource Shared!',
    message: `Successfully shared to ${data.channelName}`,
    priority: 1
  });

  chrome.action.setBadgeText({ text: '✓' });
  chrome.action.setBadgeBackgroundColor({ color: '#16a34a' });

  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, 3000);
}

// Keep service worker alive
chrome.runtime.onConnect.addListener(() => {
  // intentional no-op to keep port open
});

// Monitor auth state changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.authSession) {
    if (changes.authSession.newValue) {
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#16a34a' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  }
});
