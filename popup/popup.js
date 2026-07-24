/**
 * Popup Script
 * Handles user interactions in the extension popup
 */

// DOM Elements
const transcriptInput = document.getElementById('transcript');
const feedbackInput = document.getElementById('feedback');
const generateBtn = document.getElementById('generateBtn');
const statusMessage = document.getElementById('status');
const spinner = document.getElementById('spinner');
const successMessage = document.getElementById('success');
const errorMessage = document.getElementById('error');
const errorText = document.getElementById('errorText');
const settingsLink = document.getElementById('settingsLink');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const apiKeyInput = document.getElementById('apiKey');
const modelSelect = document.getElementById('model');
const saveSettings = document.getElementById('saveSettings');
const cancelSettings = document.getElementById('cancelSettings');

/**
 * Initialize the popup
 */
function init() {
  loadSettings();
  attachEventListeners();
}

/**
 * Attach event listeners
 */
function attachEventListeners() {
  generateBtn.addEventListener('click', handleGenerateReport);
  settingsLink.addEventListener('click', openSettings);
  closeSettings.addEventListener('click', closeSettingsModal);
  saveSettings.addEventListener('click', saveSettingsHandler);
  cancelSettings.addEventListener('click', closeSettingsModal);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && settingsModal.style.display !== 'none') {
      closeSettingsModal();
    }
  });
}

/**
 * Load settings from Chrome storage
 */
function loadSettings() {
  chrome.storage.sync.get(['apiKey', 'model'], (items) => {
    if (items.apiKey) {
      apiKeyInput.value = items.apiKey;
    }
    if (items.model) {
      modelSelect.value = items.model;
    }
  });
}

/**
 * Handle generate report button click
 */
async function handleGenerateReport() {
  const transcript = transcriptInput.value.trim();
  const feedback = feedbackInput.value.trim();

  // Validation
  if (!transcript) {
    showError('Please enter the interview transcript.');
    return;
  }

  if (!feedback) {
    showError('Please enter interviewer notes or feedback.');
    return;
  }

  // Check if API key is configured
  chrome.storage.sync.get(['apiKey'], async (items) => {
    if (!items.apiKey) {
      showError('OpenAI API key not configured. Please set it in Settings.');
      return;
    }

    await generateAndFillReport(transcript, feedback, items.apiKey);
  });
}

/**
 * Generate report and fill the Intervue.io page
 */
async function generateAndFillReport(transcript, feedback, apiKey) {
  try {
    resetMessages();
    showSpinner();
    disableButton();

    // Get the model from storage
    chrome.storage.sync.get(['model'], async (items) => {
      const model = items.model || 'gpt-4-turbo';

      // Send message to content script to generate and fill report
      const tab = await getActiveWebTab();

      try {
        await ensureContentScriptInjected(tab.id);

        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'generateAndFillReport',
          transcript,
          feedback,
          apiKey,
          model
        });

        if (response.success) {
          hideSpinner();
          showSuccess();
          transcriptInput.value = '';
          feedbackInput.value = '';
          setTimeout(() => {
            resetMessages();
            enableButton();
          }, 3000);
        } else {
          throw new Error(response.error || 'Unknown error occurred');
        }
      } catch (error) {
        console.error('Content script error:', error);
        showError(`Failed to fill report: ${error.message}`);
        hideSpinner();
        enableButton();
      }
    });
  } catch (error) {
    console.error('Error:', error);
    showError(`Error: ${error.message}`);
    hideSpinner();
    enableButton();
  }
}

async function getActiveWebTab() {
  const tabs = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
    windowType: 'normal'
  });

  const tab = tabs[0];
  if (!tab || !tab.id) {
    throw new Error('No active browser tab found. Please open the Intervue report page in a normal window.');
  }

  if (!/^https?:\/\//.test(tab.url || '')) {
    throw new Error('Active tab is not a valid webpage. Please open https://www.intervue.io/generate-report/ in a browser tab.');
  }

  return tab;
}

async function ensureContentScriptInjected(tabId) {
  if (await pingContentScript(tabId)) {
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (contentScriptUrl) => {
        if (window.__interviewAiContentInitialized) {
          return;
        }

        const script = document.createElement('script');
        script.type = 'module';
        script.src = contentScriptUrl;
        script.onload = () => {
          window.__interviewAiContentInitialized = true;
        };
        script.onerror = () => {
          console.error('Failed to load extension content script module', contentScriptUrl);
        };
        document.documentElement.appendChild(script);
      },
      args: [chrome.runtime.getURL('src/content.js')]
    });

    await waitForContentScriptReady(tabId, 2000);
  } catch (error) {
    throw new Error(`Unable to inject content script: ${error.message}`);
  }
}

async function pingContentScript(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    return response && response.success;
  } catch (error) {
    return false;
  }
}

async function waitForContentScriptReady(tabId, timeout = 2000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await pingContentScript(tabId)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw new Error('Content script did not become ready after injection');
}

/**
 * Show status message
 */
function showStatus(message) {
  statusMessage.textContent = message;
  statusMessage.style.display = 'block';
}

/**
 * Show spinner
 */
function showSpinner() {
  spinner.style.display = 'flex';
}

/**
 * Hide spinner
 */
function hideSpinner() {
  spinner.style.display = 'none';
}

/**
 * Show success message
 */
function showSuccess() {
  successMessage.style.display = 'flex';
}

/**
 * Show error message
 */
function showError(message) {
  errorText.textContent = message;
  errorMessage.style.display = 'flex';
}

/**
 * Reset all messages
 */
function resetMessages() {
  statusMessage.style.display = 'none';
  successMessage.style.display = 'none';
  errorMessage.style.display = 'none';
}

/**
 * Disable generate button
 */
function disableButton() {
  generateBtn.disabled = true;
}

/**
 * Enable generate button
 */
function enableButton() {
  generateBtn.disabled = false;
}

/**
 * Open settings modal
 */
function openSettings(e) {
  e.preventDefault();
  settingsModal.style.display = 'flex';
}

/**
 * Close settings modal
 */
function closeSettingsModal() {
  settingsModal.style.display = 'none';
}

/**
 * Save settings
 */
function saveSettingsHandler() {
  const apiKey = apiKeyInput.value.trim();
  const model = modelSelect.value;

  if (!apiKey) {
    alert('Please enter an API key.');
    return;
  }

  chrome.storage.sync.set(
    { apiKey, model },
    () => {
      showStatus('Settings saved successfully!');
      closeSettingsModal();
      setTimeout(() => resetMessages(), 2000);
    }
  );
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
