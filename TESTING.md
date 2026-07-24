# Testing Guide - Interview AI Autofill

This document provides comprehensive testing procedures for the Interview AI Autofill extension.

## Test Environment Setup

### Prerequisites
- Chrome 88+ browser
- OpenAI API key
- Interview.io account with test access to report generation page

### Initial Setup
1. Load extension in Developer Mode (chrome://extensions)
2. Configure API key in Settings
3. Open interview.io in another tab

## Test Categories

## 1. Unit Tests - Core Functionality

### Test: OpenAI API Integration

**Test File:** `src/openai.js`

```javascript
// Manual test in console
import { generateFeedback, callOpenAIAPI } from 'src/openai.js';

// Test with valid credentials
const apiKey = 'your-test-api-key';
const transcript = 'Candidate discussed their experience with React...';
const feedback = 'Good technical knowledge, could improve on system design';

generateFeedback(transcript, feedback, apiKey, 'gpt-4-turbo')
  .then(result => console.log('Success:', result))
  .catch(error => console.log('Error:', error.message));
```

**Expected Result:**
- Returns valid JSON with all required fields
- No API errors

### Test: Prompt Generation

**Test File:** `src/prompts.js`

```javascript
import { getUserPrompt, validateFeedbackStructure } from 'src/prompts.js';

const transcript = 'Sample interview text...';
const notes = 'Sample interviewer notes...';

const prompt = getUserPrompt(transcript, notes);
console.log('Prompt length:', prompt.length);
console.log('Contains JSON structure:', prompt.includes('"overall_feedback"'));

// Test validation
const mockFeedback = {
  overall_feedback: 'Good candidate',
  strengths: ['Communication'],
  weaknesses: ['Time management'],
  suggestions: ['Practice algorithms'],
  technical_skills: 'Solid fundamentals',
  communication: 'Clear articulation',
  overall_rating: 'GOOD',
  recommendation: 'HIRE'
};

const validation = validateFeedbackStructure(mockFeedback);
console.log('Validation result:', validation);
```

**Expected Result:**
- Prompts contain required field names
- Validation passes for correct structure
- Validation fails for incomplete structure

### Test: Field Detection

**Test File:** `src/autofill.js`

```javascript
import { findElementByLabel, findAllEditableFields } from 'src/autofill.js';

// On interview.io report page:
const fields = findAllEditableFields();
console.log('Found fields:', fields.length);

const overallFeedbackField = findElementByLabel('Overall feedback');
console.log('Overall feedback field found:', overallFeedbackField !== null);

// Test different label variants
const strengthsVariants = ['Strengths', 'STRENGTHS', 'strengths'];
strengthsVariants.forEach(label => {
  const field = findElementByLabel(label);
  console.log(`Found "${label}":`, field !== null);
});
```

**Expected Result:**
- Fields correctly detected by label
- Case-insensitive matching works
- Returns null for non-existent labels

### Test: Utils Functions

```javascript
import { 
  isEditableElement, 
  setEditableContent, 
  formatTextForCKEditor,
  parseJSON 
} from 'src/utils.js';

// Test isEditableElement
const textarea = document.querySelector('textarea');
console.log('Textarea is editable:', isEditableElement(textarea)); // true

const div = document.querySelector('div[contenteditable]');
console.log('Contenteditable div is editable:', isEditableElement(div)); // true

// Test setEditableContent
const testElement = document.querySelector('[contenteditable]');
setEditableContent(testElement, 'Test content');
console.log('Content set:', testElement.textContent === 'Test content');

// Test formatTextForCKEditor
const formatted = formatTextForCKEditor('Line 1\nLine 2');
console.log('Formatted:', formatted.includes('<br>'));

// Test parseJSON
const jsonString = '{"key": "value"}';
const parsed = parseJSON(jsonString);
console.log('Parsed:', parsed.key === 'value');
```

**Expected Result:**
- All utility functions return expected results
- No errors thrown with valid inputs

## 2. Integration Tests

### Test: Popup Form Submission

**Steps:**
1. Click extension icon to open popup
2. Enter sample transcript in first textarea
3. Enter sample feedback in second textarea
4. Click "Generate Report"

**Expected Results:**
- Spinner appears
- Generate button becomes disabled
- After ~10-30 seconds, spinner disappears
- Success message appears
- Text areas are cleared

**Failure Scenarios:**
- No API key: Shows error "API key not configured"
- Invalid API key: Shows error "Invalid OpenAI API key"
- Empty fields: Shows error "Please enter transcript"

### Test: Settings Panel

**Steps:**
1. Click extension icon
2. Click "Settings" link at bottom
3. Enter OpenAI API key
4. Select different model (GPT-3.5-turbo)
5. Click "Save Settings"

**Expected Results:**
- Settings modal appears
- API key input accepts text
- Model dropdown shows options
- Settings save successfully
- Settings persist after page reload

### Test: Autofill on Interview.io

**Steps:**
1. Navigate to interview.io report generation page
2. Open extension popup
3. Enter test transcript and feedback
4. Click "Generate Report"
5. Wait for completion

**Expected Results:**
- Report page fields are filled with generated content
- Specific fields populated:
  - [ ] Overall feedback
  - [ ] Strengths (as bullet list)
  - [ ] Weaknesses (as bullet list)
  - [ ] Suggestions (as bullet list)
  - [ ] Technical Skills
  - [ ] Communication
- Page remains on interview.io
- No JavaScript errors in console

## 3. UI/UX Tests

### Test: Popup UI Elements

**Checklist:**
- [ ] Extension icon displays correctly in toolbar
- [ ] Popup opens on icon click
- [ ] Popup has correct dimensions (500px width)
- [ ] Dark theme applied correctly
- [ ] Text areas have proper styling
- [ ] "Generate Report" button is prominent
- [ ] Settings link visible at bottom
- [ ] Version number displayed

### Test: Responsive Messages

**Test Success Message:**
1. Generate a valid report
2. Verify success message shows:
   - Green background with checkmark
   - "Report generated and page filled successfully!" text

**Test Error Message:**
1. Use invalid API key
2. Verify error message shows:
   - Red background with X mark
   - Specific error message

**Test Loading State:**
1. Generate report
2. Verify loading spinner:
   - Rotating animation
   - "Generating feedback..." text
   - Button disabled

## 4. API Integration Tests

### Test: OpenAI API Call

```javascript
// In content script console
import { callOpenAIAPI } from 'src/openai.js';

const messages = [
  { role: 'system', content: 'You are helpful.' },
  { role: 'user', content: 'What is 2+2?' }
];

callOpenAIAPI('your-api-key', 'gpt-4-turbo', messages)
  .then(response => console.log('API Response:', response))
  .catch(error => console.log('API Error:', error));
```

**Test Cases:**
- [ ] Valid API key returns response
- [ ] Invalid API key returns 401 error
- [ ] Missing API key throws error
- [ ] Rate limited returns 429 error
- [ ] Server error returns 500 error

### Test: Response Format

Verify generated feedback has correct structure:

```javascript
{
  "overall_feedback": "string",
  "strengths": ["string", "string"],
  "weaknesses": ["string"],
  "suggestions": ["string", "string"],
  "technical_skills": "string",
  "communication": "string",
  "overall_rating": "STRONG|GOOD|MODERATE|WEAK",
  "recommendation": "HIRE|MAYBE|PASS"
}
```

## 5. Cross-Browser Compatibility Tests

### Browser Versions to Test
- [ ] Chrome 88 (Manifest V3 minimum)
- [ ] Chrome 100+
- [ ] Chrome 110+ (latest)
- [ ] Chrome Beta
- [ ] Chromium-based browsers (Edge, Brave)

### Test: Extension Functionality
For each browser:
1. Load extension
2. Configure API key
3. Test popup submission
4. Test autofill on interview.io

## 6. Performance Tests

### Test: Response Time

**Measurement:**
```javascript
// In console
const startTime = performance.now();

// Generate feedback
await generateFeedback(transcript, feedback, apiKey);

const endTime = performance.now();
console.log('Time taken:', endTime - startTime, 'ms');
```

**Expected Results:**
- API call: 10-30 seconds (depends on transcript length)
- Field population: < 1 second
- Total: 15-35 seconds

### Test: Memory Usage

**Monitor:**
1. Open DevTools
2. Performance tab
3. Record while:
   - Opening popup
   - Filling form
   - Generating report
   - Filling page

**Expected Results:**
- No memory leaks
- Memory released after operation

### Test: Large Transcripts

**Test with:**
- [ ] 500-word transcript
- [ ] 2000-word transcript
- [ ] 5000-word transcript

**Verify:**
- No crashes
- No timeouts
- Response generated correctly

## 7. Edge Cases and Error Handling

### Test: Empty/Invalid Input

```javascript
// Test empty transcript
await generateAndFillReport('', 'feedback', apiKey);
// Expected: Error "Please enter the interview transcript"

// Test empty feedback
await generateAndFillReport('transcript', '', apiKey);
// Expected: Error "Please enter interviewer notes or feedback"

// Test very long input
const longText = 'a'.repeat(50000);
await generateAndFillReport(longText, 'feedback', apiKey);
// Expected: Process or timeout error
```

### Test: Network Failures

1. Disconnect internet
2. Click "Generate Report"
3. Expected: Timeout error after ~30 seconds

### Test: Page Not Found

1. Close interview.io page
2. Try to generate report
3. Expected: Error "Interview.io page did not load"

### Test: Field Not Found

1. Navigate to interview.io but with different page layout
2. Generate report
3. Expected: Error or partial filling, no crash

## 8. Security Tests

### Test: API Key Security

```javascript
// Verify API key is not exposed in:
// 1. Console logs
chrome.runtime.onMessage.addListener((...args) => {
  console.log(args); // Verify apiKey not logged
});

// 2. Network requests (non-OpenAI)
// Open DevTools > Network, check no keys sent to other domains

// 3. Storage
chrome.storage.sync.get(null, (items) => {
  console.log(items); // Only encrypted by Chrome
});
```

**Expected Results:**
- API key never logged to console
- API key only sent to api.openai.com
- API key stored in Chrome's encrypted storage

### Test: XSS Prevention

Verify no HTML injection:

```javascript
const maliciousFeedback = {
  overall_feedback: '<script>alert("XSS")</script>',
  strengths: ['<img src=x onerror=alert("XSS")>']
};

fillInterviewIOPage(maliciousFeedback);
// Expected: Script tags escaped, no execution
```

## 9. Accessibility Tests

### Test: Keyboard Navigation

- [ ] Tab through popup controls
- [ ] Enter key submits form
- [ ] Escape closes settings modal
- [ ] All buttons focusable

### Test: Screen Reader

- [ ] All inputs have associated labels
- [ ] Error messages announced
- [ ] Loading state announced
- [ ] Success message announced

## 10. Regression Tests

Run these tests after each code change:

```
[ ] Extension loads without errors
[ ] Popup form accepts input
[ ] API key saves and loads
[ ] Basic autofill works
[ ] Error handling works
[ ] No console errors
[ ] No memory leaks
```

## Test Results Template

```markdown
## Test Run: [Date] [Model]

### Passed
- [ ] Test name
- [ ] Test name

### Failed
- [ ] Test name
  - Issue: Description
  - Steps to reproduce: ...

### Notes
- ...

### Status
- Overall: PASS / FAIL
- Ready for release: YES / NO
```

## Continuous Testing Checklist

Before each release:

- [ ] Run all unit tests
- [ ] Test on multiple Chrome versions
- [ ] Test with sample transcript
- [ ] Verify autofill on interview.io
- [ ] Check for console errors
- [ ] Verify API error handling
- [ ] Test settings persistence
- [ ] Check icon display
- [ ] Verify README accuracy
- [ ] Test on clean Chrome profile

---

Last Updated: 2024
