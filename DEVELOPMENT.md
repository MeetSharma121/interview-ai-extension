# Development Guide - Interview AI Autofill

This guide helps developers understand, extend, and debug the Interview AI Autofill Chrome Extension.

## Table of Contents
1. [Project Architecture](#project-architecture)
2. [Development Setup](#development-setup)
3. [Debugging](#debugging)
4. [Adding New Features](#adding-new-features)
5. [Testing](#testing)
6. [Code Style](#code-style)

## Project Architecture

### Module Breakdown

```
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Browser                           │
├─────────────────────────────────────────────────────────────┤
│  Intervue.io Page                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Content Script (src/content.js)                     │   │
│  │ - Listens for messages                              │   │
│  │ - Calls autofill.js                                 │   │
│  │ - Communicates with popup                           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                Extension Popup                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ popup.js                                            │   │
│  │ - Form handling                                     │   │
│  │ - Settings management                              │   │
│  │ - Message passing to content script                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                Service Worker                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ background.js                                       │   │
│  │ - Extension lifecycle management                    │   │
│  │ - Context menu handling                             │   │
│  │ - Storage synchronization                           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Core Modules                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ openai.js        - OpenAI API communication           │   │
│  │ prompts.js       - AI prompt engineering             │   │
│  │ autofill.js      - DOM field detection & filling    │   │
│  │ utils.js         - Utility functions                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. User enters transcript & feedback in popup
   ↓
2. Popup sends message to content script
   ↓
3. Content script calls generateFeedback() (openai.js)
   ↓
4. OpenAI API returns structured JSON
   ↓
5. Content script calls fillInterviewIOPage() (autofill.js)
   ↓
6. autofill.js finds elements by label and fills them
   ↓
7. Popup shows success message
```

## Development Setup

### 1. Load Extension in Development Mode

```bash
1. Open chrome://extensions/
2. Toggle "Developer mode" (top right)
3. Click "Load unpacked"
4. Select interview-ai-extension folder
```

### 2. Watch for Changes

While developing, you'll need to reload the extension after changes:

```bash
# In chrome://extensions/:
- Click the refresh icon on the extension card
- Changes to content.js require page reload
- Changes to popup.js require popup refresh
```

### 3. Setting Up Environment

```bash
# Install any future dependencies (currently none)
npm install

# Generate icons (if needed)
npm run generate-icons
```

## Debugging

### View Logs

**Extension Logs:**
```
chrome://extensions/ → Interview AI Autofill → Details → Service worker
```

**Content Script Logs:**
```
1. Open DevTools on intervue.io (F12)
2. Go to Console tab
3. Logs will appear with [Interview AI timestamp] prefix
```

**Popup Logs:**
```
1. Right-click extension icon → Inspect popup
2. DevTools opens for popup
3. See all console output
```

### Using Chrome DevTools

**Breakpoints in Content Script:**
```
1. Open DevTools on intervue.io (F12)
2. Sources tab → Content scripts → src/content.js
3. Set breakpoints
4. Trigger action from popup
```

**Breakpoints in Popup:**
```
1. Right-click extension → Inspect popup
2. Sources tab → popup.js
3. Set breakpoints
4. Interact with popup
```

### Message Passing Debug

Add to content.js to log all messages:

```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  console.log('Sender tab:', sender.tab);
  // ... rest of handler
});
```

Add to popup.js to log sent messages:

```javascript
const response = await chrome.tabs.sendMessage(tab.id, {
  action: 'generateAndFillReport',
  transcript, feedback, apiKey, model
});
console.log('Response from content script:', response);
```

### Testing Field Detection

In browser console (on intervue.io):

```javascript
// Find all editable fields
import { findAllEditableFields } from 'autofill.js';
const fields = findAllEditableFields();
console.table(fields);

// Test finding a specific label
import { findElementByLabel } from 'utils.js';
const elem = findElementByLabel('Technical Skills');
console.log(elem);

// Log all fields with debug info
debugLogFields();
```

## Adding New Features

### Add a New Field Mapping

**Edit: `src/autofill.js`**

```javascript
const FIELD_MAPPING = {
  your_new_field: ['Label 1', 'Label 2'],
  // ...
};
```

**Then update feedback structure in `src/prompts.js`:**

```javascript
export function getUserPrompt(transcript, notes) {
  return `...
{
  "your_new_field": "Your description",
  ...
}`;
}
```

### Add a New OpenAI Model

**Edit: `src/openai.js`**

```javascript
export function getAvailableModels() {
  return ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4-vision'];
}
```

**Update popup settings dropdown in `popup/popup.html`:**

```html
<select id="model">
  <option value="gpt-4-vision">GPT-4 Vision</option>
  <!-- ... other options ... -->
</select>
```

### Add a New Message Handler

**In `src/content.js`:**

```javascript
async function handleMessage(request, sender, sendResponse) {
  if (request.action === 'myNewAction') {
    await handleMyNewAction(request, sendResponse);
  }
  // ...
}

async function handleMyNewAction(request, sendResponse) {
  try {
    // Your logic here
    sendResponse({ success: true, data: result });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}
```

**Call from popup `popup.js`:**

```javascript
const response = await chrome.tabs.sendMessage(tab.id, {
  action: 'myNewAction',
  param1: value1
});
```

### Add Settings

**Store in `popup.js`:**

```javascript
chrome.storage.sync.set({ newSetting: value });
```

**Load in `popup.js`:**

```javascript
chrome.storage.sync.get(['newSetting'], (items) => {
  console.log(items.newSetting);
});
```

## Testing

### Manual Test Checklist

- [ ] Extension loads without errors
- [ ] Popup opens without errors
- [ ] Settings save and persist
- [ ] API key validation works
- [ ] Transcript input accepts text
- [ ] Feedback input accepts text
- [ ] Generate button is disabled when fields empty
- [ ] Generate button works with sample text
- [ ] Autofill finds fields on intervue.io
- [ ] Fields are filled with generated content
- [ ] Error messages display correctly
- [ ] Success message shows after fill
- [ ] Content script loads on intervue.io

### Test with Sample Data

```javascript
// In content script console
const testFeedback = {
  overall_feedback: 'Test feedback',
  strengths: ['Test strength'],
  weaknesses: ['Test weakness'],
  suggestions: ['Test suggestion'],
  technical_skills: 'Test technical',
  communication: 'Test communication',
  overall_rating: 'GOOD',
  recommendation: 'MAYBE'
};

fillInterviewIOPage(testFeedback);
```

### Performance Testing

Monitor resource usage:

```javascript
// Time a function
console.time('functionName');
myFunction();
console.timeEnd('functionName');

// Profile memory
chrome://extensions/ → Details → View background page → DevTools
```

## Code Style

### Naming Conventions

- **Functions:** camelCase (`generateFeedback`, `fillInterviewIOPage`)
- **Constants:** UPPER_SNAKE_CASE (`DEFAULT_MODEL`, `OPENAI_API_ENDPOINT`)
- **Variables:** camelCase (`transcript`, `apiKey`)
- **Classes:** PascalCase (not used in this project)

### Documentation

All functions should have JSDoc comments:

```javascript
/**
 * Brief description of what the function does
 * @param {type} paramName - Description
 * @param {type} otherParam - Description
 * @returns {type} - Description
 */
function myFunction(paramName, otherParam) {
  // Implementation
}
```

### Error Handling

Always use try-catch and provide meaningful errors:

```javascript
try {
  const result = await someAsyncFunction();
  return result;
} catch (error) {
  log(`Specific operation failed: ${error.message}`, 'error');
  throw new Error('User-friendly error message');
}
```

### Logging

Use the logging utility:

```javascript
import { log } from './utils.js';

log('This is an info message', 'info');
log('This is a warning', 'warn');
log('This is an error', 'error');
```

## Building for Production

### Before Publishing

1. **Update version in manifest.json**
2. **Update version in package.json**
3. **Review all user-facing text**
4. **Test on multiple Chrome versions**
5. **Create proper PNG icons** (current ones are placeholders)
6. **Add privacy policy** if storing any data

### Chrome Web Store Submission

1. Create developer account at https://chrome.google.com/webstore/developer
2. Upload extension ZIP
3. Add store listing details
4. Submit for review

### Creating Distribution ZIP

```bash
zip -r interview-ai-extension.zip \
  manifest.json \
  package.json \
  README.md \
  src/ \
  popup/ \
  icons/ \
  -x "node_modules/*" ".git/*"
```

## Troubleshooting Development Issues

### Extension not loading
```
Solution:
- Check manifest.json syntax (copy to JSON validator)
- Verify all file paths exist
- Check for circular dependencies in imports
```

### Content script not running
```
Solution:
- Verify content_scripts in manifest.json
- Check host_permissions includes the URL
- Reload the page after extension reload
- Check content script errors in DevTools
```

### Popup not opening
```
Solution:
- Check action section in manifest.json
- Verify popup.html path is correct
- Check popup console for errors
```

### Fields not being found
```
Solution:
- Run debugLogFields() to see detected fields
- Check if label text matches exactly (case-sensitive by default)
- Verify element is contenteditable or textarea
- Check for page structure changes
```

### API calls failing
```
Solution:
- Verify API key is valid
- Check OpenAI API status
- Verify network connectivity
- Check API rate limits
```

## Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 API Reference](https://developer.chrome.com/docs/extensions/mv3/)
- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [Chrome Extension Best Practices](https://developer.chrome.com/docs/extensions/mv3/best_practices/)

## Support

For questions or issues, please refer to the main README.md or open an issue on GitHub.

---

Last Updated: 2024
