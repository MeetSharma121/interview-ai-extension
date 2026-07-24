/**
 * Background Service Worker
 * Handles background tasks and manages extension state
 */

/**
 * Extension initialization
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // On first install, open settings page
    chrome.tabs.create({
      url: 'popup/popup.html'
    });

    // Initialize default settings
    chrome.storage.sync.set(
      {
        apiKey: '',
        model: 'gpt-4-turbo',
        autoFill: true
      },
      () => {
        console.log('Extension settings initialized');
      }
    );
  }

  if (details.reason === 'update') {
    console.log('Extension updated');
  }
});

/**
 * Message handler for background tasks
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'contentScriptReady') {
    console.log('Content script ready on tab:', sender.tab.id);
    sendResponse({ status: 'acknowledged' });
  } else if (request.action === 'logEvent') {
    console.log('[Extension Event]', request.data);
    sendResponse({ status: 'logged' });
  }

  return true;
});

/**
 * Handle extension icon click - opens popup
 * This is handled by the manifest.json action definition
 */

/**
 * Context menu for easy access
 */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'interview-ai-fill',
    title: 'Fill Interview Report',
    contexts: ['page'],
    documentUrlPatterns: ['https://*.intervue.io/*', 'https://www.intervue.io/*', 'https://intervue.io/*']
  });
});

/**
 * Handle context menu click
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'interview-ai-fill') {
    // Open popup
    chrome.action.openPopup();
  }
});

/**
 * Handle tab update - check if we're on intervue.io
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('intervue.io')) {
    // Optionally perform actions when Intervue.io page loads
    console.log('Intervue.io page detected:', tab.url);

    // Inject content script if needed (it's defined in manifest, but this is extra assurance)
    chrome.tabs.sendMessage(tabId, { action: 'ping' }).catch(() => {
      // Content script may not be ready yet
    });
  }
});

/**
 * Storage change listener - sync API key between devices
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    if ('apiKey' in changes) {
      console.log('API Key updated (sync)');
    }

    if ('model' in changes) {
      console.log('Model preference updated:', changes.model.newValue);
    }
  }
});

/**
 * Periodic check for extension health
 */
setInterval(() => {
  chrome.storage.sync.get(['apiKey', 'model'], (items) => {
    if (!items.apiKey) {
      console.warn('API Key not configured in Interview AI Autofill');
    }
  });
}, 3600000); // Check every hour

/**
 * Utility: Clear old logs (maintenance)
 */
function cleanupOldData() {
  chrome.storage.local.get(null, (items) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    for (const [key, value] of Object.entries(items)) {
      if (value.timestamp && value.timestamp < thirtyDaysAgo) {
        chrome.storage.local.remove(key);
      }
    }
  });
}

// Run cleanup weekly
setInterval(cleanupOldData, 7 * 24 * 60 * 60 * 1000);

console.log('Interview AI Autofill background service worker loaded');
