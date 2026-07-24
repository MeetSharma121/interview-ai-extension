# API Reference - Interview AI Autofill

Complete API documentation for extension developers and integrators.

## Message Passing Protocol

The extension uses Chrome's message passing API to communicate between popup, content script, and background service worker.

### Message Format

```javascript
// Sent from popup to content script
chrome.tabs.sendMessage(tabId, {
  action: 'actionName',
  param1: value1,
  param2: value2
  // ... other parameters
}, (response) => {
  // Handle response
});

// Response format
{
  success: true|false,
  data: Object,
  error: 'Error message if success is false',
  message: 'Additional info'
}
```

## Content Script APIs

### `generateAndFillReport`

Generate AI feedback and fill Interview.io form.

**Request:**
```javascript
{
  action: 'generateAndFillReport',
  transcript: string,        // Interview transcript
  feedback: string,          // Interviewer notes
  apiKey: string,           // OpenAI API key
  model: string             // OpenAI model (gpt-4-turbo, gpt-4, gpt-3.5-turbo)
}
```

**Response:**
```javascript
{
  success: true,
  message: 'Successfully filled 7 fields',
  data: {
    filled: [
      { field: 'overall_feedback', label: 'Overall feedback', element: 'DIV', content: '...' },
      { field: 'strengths', label: 'Strengths', element: 'DIV', content: '...' },
      // ... more filled fields
    ],
    failed: [
      { field: 'field_name', labels: ['Label variant 1', 'Label variant 2'] }
    ],
    feedback: { /* Generated feedback JSON */ }
  }
}
```

**Example:**
```javascript
const response = await chrome.tabs.sendMessage(tabId, {
  action: 'generateAndFillReport',
  transcript: 'Candidate discussed...',
  feedback: 'Good communication...',
  apiKey: 'sk-...',
  model: 'gpt-4-turbo'
});

if (response.success) {
  console.log(`Filled ${response.data.filled.length} fields`);
} else {
  console.error(response.error);
}
```

**Errors:**
- `"Transcript and feedback are required"` - Missing input
- `"Failed to generate feedback: [OpenAI error]"` - API call failed
- `"Interview.io page did not load"` - Page not detected
- `"No fields were filled"` - Form fields not found

---

### `testFill`

Fill report page with sample test data.

**Request:**
```javascript
{
  action: 'testFill'
}
```

**Response:**
```javascript
{
  success: true,
  message: 'Test fill completed. Filled 7 fields.',
  data: {
    filled: [ /* ... */ ],
    failed: [ /* ... */ ]
  }
}
```

**Example:**
```javascript
const response = await chrome.tabs.sendMessage(tabId, {
  action: 'testFill'
});

console.log('Test fill result:', response.data);
```

---

### `getPageState`

Get current state of Interview.io report page.

**Request:**
```javascript
{
  action: 'getPageState'
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    totalFields: 8,
    filledFields: 3,
    emptyFields: 5,
    fields: [
      { label: 'Overall feedback', isFilled: true, contentLength: 156 },
      { label: 'Strengths', isFilled: true, contentLength: 89 },
      { label: 'Weaknesses', isFilled: false, contentLength: 0 },
      // ... more fields
    ]
  }
}
```

**Example:**
```javascript
const response = await chrome.tabs.sendMessage(tabId, {
  action: 'getPageState'
});

console.log(`Page has ${response.data.totalFields} fields`);
console.log(`Filled: ${response.data.filledFields}, Empty: ${response.data.emptyFields}`);
```

---

### `clearFields`

Clear all filled fields on the page.

**Request:**
```javascript
{
  action: 'clearFields'
}
```

**Response:**
```javascript
{
  success: true,
  message: 'Cleared 7 fields',
  data: {
    cleared: 7
  }
}
```

**Example:**
```javascript
const response = await chrome.tabs.sendMessage(tabId, {
  action: 'clearFields'
});

console.log(`Cleared ${response.data.cleared} fields`);
```

---

## Storage API

Extension stores settings in Chrome's `storage.sync` (synced across devices).

### Get Settings

```javascript
chrome.storage.sync.get(['apiKey', 'model'], (items) => {
  console.log('API Key:', items.apiKey);
  console.log('Model:', items.model);
});
```

### Save Settings

```javascript
chrome.storage.sync.set({
  apiKey: 'sk-...',
  model: 'gpt-4-turbo'
}, () => {
  console.log('Settings saved');
});
```

### Available Settings

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `apiKey` | string | '' | OpenAI API key |
| `model` | string | 'gpt-4-turbo' | OpenAI model to use |
| `autoFill` | boolean | true | Auto-fill on page load |

---

## Utility Module - `src/utils.js`

### `findElementByLabel(labelText)`

Find form element by visible label text.

**Parameters:**
- `labelText` (string): Visible label text to search for

**Returns:** HTMLElement | null

**Example:**
```javascript
import { findElementByLabel } from './utils.js';

const field = findElementByLabel('Technical Skills');
if (field) {
  field.textContent = 'Strong technical foundation';
}
```

---

### `setEditableContent(element, content)`

Set content in textarea, input, or contenteditable element.

**Parameters:**
- `element` (HTMLElement): Element to fill
- `content` (string): Content to set

**Example:**
```javascript
import { setEditableContent } from './utils.js';

setEditableContent(field, 'New content');
// Automatically dispatches input/change events
```

---

### `isEditableElement(element)`

Check if element is editable.

**Parameters:**
- `element` (HTMLElement): Element to check

**Returns:** boolean

**Example:**
```javascript
import { isEditableElement } from './utils.js';

if (isEditableElement(field)) {
  field.textContent = 'Can edit this';
}
```

---

### `waitForElement(selector, timeout)`

Wait for element to appear in DOM.

**Parameters:**
- `selector` (string | Function): CSS selector or function returning element
- `timeout` (number): Timeout in milliseconds (default: 5000)

**Returns:** Promise<HTMLElement | null>

**Example:**
```javascript
import { waitForElement } from './utils.js';

const field = await waitForElement('[contenteditable]', 10000);
if (field) {
  field.textContent = 'Found and filled';
}
```

---

### `log(message, level)`

Log message with timestamp.

**Parameters:**
- `message` (string): Message to log
- `level` (string): 'log', 'info', 'warn', 'error' (default: 'log')

**Example:**
```javascript
import { log } from './utils.js';

log('Operation started', 'info');
log('Something went wrong', 'error');
```

---

## OpenAI Module - `src/openai.js`

### `generateFeedback(transcript, feedback, apiKey, model)`

Generate structured interview feedback.

**Parameters:**
- `transcript` (string): Interview transcript
- `feedback` (string): Interviewer notes
- `apiKey` (string): OpenAI API key
- `model` (string): Model name (default: 'gpt-4-turbo')

**Returns:** Promise<Object> - Structured feedback

**Example:**
```javascript
import { generateFeedback } from './openai.js';

const feedback = await generateFeedback(
  'Candidate discussed...',
  'Good communication...',
  'sk-...',
  'gpt-4-turbo'
);

console.log('Overall feedback:', feedback.overall_feedback);
console.log('Rating:', feedback.overall_rating);
```

**Feedback Structure:**
```javascript
{
  overall_feedback: string,
  strengths: string[],
  weaknesses: string[],
  suggestions: string[],
  technical_skills: string,
  communication: string,
  overall_rating: 'STRONG' | 'GOOD' | 'MODERATE' | 'WEAK',
  recommendation: 'HIRE' | 'MAYBE' | 'PASS'
}
```

---

### `callOpenAIAPI(apiKey, model, messages, temperature, maxTokens)`

Low-level OpenAI API call.

**Parameters:**
- `apiKey` (string): OpenAI API key
- `model` (string): Model name
- `messages` (Object[]): Chat messages
- `temperature` (number): 0-2, default 0.7
- `maxTokens` (number): Max response tokens, default 2000

**Returns:** Promise<string> - API response content

**Example:**
```javascript
import { callOpenAIAPI } from './openai.js';

const response = await callOpenAIAPI(
  'sk-...',
  'gpt-4-turbo',
  [
    { role: 'system', content: 'You are helpful.' },
    { role: 'user', content: 'What is 2+2?' }
  ],
  0.7,
  100
);

console.log('Response:', response);
```

---

### `validateAPIKey(apiKey)`

Validate API key by making test request.

**Parameters:**
- `apiKey` (string): API key to validate

**Returns:** Promise<boolean>

**Example:**
```javascript
import { validateAPIKey } from './openai.js';

const isValid = await validateAPIKey('sk-...');
if (isValid) {
  console.log('API key is valid');
}
```

---

### `getAvailableModels()`

Get list of available models.

**Returns:** string[]

**Example:**
```javascript
import { getAvailableModels } from './openai.js';

const models = getAvailableModels();
// Returns: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']
```

---

## Autofill Module - `src/autofill.js`

### `fillInterviewIOPage(feedback)`

Fill Interview.io report page with feedback.

**Parameters:**
- `feedback` (Object): Structured feedback object

**Returns:** Object

```javascript
{
  filled: [
    { field: string, label: string, element: string, content: string },
    // ...
  ],
  failed: [
    { field: string, labels: string[] },
    // ...
  ],
  errors: [
    { field: string, label: string, error: string },
    // ...
  ]
}
```

**Example:**
```javascript
import { fillInterviewIOPage } from './autofill.js';

const result = fillInterviewIOPage({
  overall_feedback: 'Strong candidate',
  strengths: ['Communication', 'Problem-solving'],
  weaknesses: ['Time management'],
  suggestions: ['Practice algorithms'],
  technical_skills: 'Solid fundamentals',
  communication: 'Clear articulation',
  overall_rating: 'GOOD',
  recommendation: 'HIRE'
});

console.log(`Filled ${result.filled.length} fields`);
if (result.failed.length > 0) {
  console.warn('Failed to fill:', result.failed);
}
```

---

### `findAllEditableFields()`

Find all editable fields on page.

**Returns:** Object[]

```javascript
[
  {
    element: HTMLElement,
    label: string,
    selector: string,
    type: string
  },
  // ...
]
```

**Example:**
```javascript
import { findAllEditableFields } from './autofill.js';

const fields = findAllEditableFields();
fields.forEach(field => {
  console.log(`${field.label}: ${field.type}`);
});
```

---

### `getPageState()`

Get current page state with all fields.

**Returns:** Object

```javascript
{
  totalFields: number,
  filledFields: number,
  emptyFields: number,
  fields: [
    { label: string, isFilled: boolean, contentLength: number },
    // ...
  ]
}
```

**Example:**
```javascript
import { getPageState } from './autofill.js';

const state = getPageState();
console.log(`${state.filledFields}/${state.totalFields} filled`);
```

---

## Prompt Module - `src/prompts.js`

### `getSystemPrompt()`

Get system prompt for AI.

**Returns:** string

---

### `getUserPrompt(transcript, feedback)`

Get user prompt for feedback generation.

**Parameters:**
- `transcript` (string): Interview transcript
- `feedback` (string): Interviewer notes

**Returns:** string

---

### `validateFeedbackStructure(feedback)`

Validate feedback JSON structure.

**Parameters:**
- `feedback` (Object): Feedback to validate

**Returns:** Object

```javascript
{
  isValid: boolean,
  errors: string[]
}
```

**Example:**
```javascript
import { validateFeedbackStructure } from './prompts.js';

const validation = validateFeedbackStructure(feedback);
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}
```

---

## Background Service Worker APIs

### Lifecycle Events

```javascript
// On extension install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First install
  } else if (details.reason === 'update') {
    // Updated
  }
});
```

### Message Handling

```javascript
// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'myAction') {
    sendResponse({ status: 'success' });
  }
});
```

---

## Error Handling

### Common Error Responses

| Error | Cause | Solution |
|-------|-------|----------|
| `"API key is required"` | No API key configured | Set API key in Settings |
| `"OpenAI API Error: 401"` | Invalid API key | Verify and update API key |
| `"OpenAI API Error: 429"` | Rate limit exceeded | Wait before retrying |
| `"Interview.io page did not load"` | Page not detected | Ensure on interview.io report page |
| `"No fields were filled"` | Form fields not found | Check page structure |
| `"Request timed out"` | API request too slow | Try shorter transcript |

---

## Best Practices

1. **Always validate input:** Check transcript and feedback are not empty
2. **Handle errors gracefully:** Wrap API calls in try-catch
3. **Use async/await:** Don't use callbacks for promises
4. **Test field detection:** Use `findAllEditableFields()` first
5. **Log appropriately:** Use `log()` function with proper levels
6. **Close popups:** Always send response from message handlers
7. **Check permissions:** Ensure host_permissions include target domain

---

## Rate Limiting

OpenAI API has rate limits:
- Requests per minute
- Tokens per minute
- Requests per day

Monitor using response headers or implement exponential backoff.

---

## Versioning

**Current Version:** 1.0.0
**Manifest Version:** 3
**Minimum Chrome:** 88

---

## Support

For API questions or issues, refer to:
- [Chrome Extension API Docs](https://developer.chrome.com/docs/extensions/)
- [OpenAI API Docs](https://platform.openai.com/docs/)
- Main README.md

---

Last Updated: 2024
