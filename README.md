# Interview AI Autofill - Chrome Extension

A production-ready Chrome Extension (Manifest V3) that generates structured interview feedback using OpenAI and automatically fills Intervue.io report pages.

## Features

✅ **AI-Powered Feedback Generation**
- Uses OpenAI GPT-4 Turbo to generate professional interview feedback
- Accepts interview transcript and interviewer notes
- Returns structured JSON with multiple feedback categories

✅ **Automatic Autofill**
- Detects CKEditor fields by visible labels (not hardcoded CSS classes)
- Fills report page fields automatically
- Supports React-based pages with proper event dispatching
- Handles contenteditable divs and textarea elements

✅ **Beautiful UI**
- Modern dark theme with gradient styling
- Responsive design
- Loading spinner during processing
- Success and error messages
- Settings modal for API key configuration

✅ **Production Quality**
- Clean, well-commented ES6 code
- Proper error handling and logging
- Modular architecture
- No external dependencies (vanilla JavaScript)

## Installation

### Prerequisites
- Chrome browser (version 88+)
- OpenAI API key (from https://platform.openai.com/api-keys)

### Setup Steps

1. **Clone or download the extension**
   ```bash
   git clone https://github.com/yourusername/interview-ai-extension.git
   cd interview-ai-extension
   ```

2. **Enable Chrome Developer Mode**
   - Open Chrome and navigate to `chrome://extensions/`
   - Toggle "Developer mode" in the top right corner

3. **Load the extension**
   - Click "Load unpacked"
   - Select the `interview-ai-extension` folder
   - The extension icon will appear in your Chrome toolbar

4. **Configure your API key**
   - Click the extension icon
   - Click "Settings" at the bottom
   - Paste your OpenAI API key
   - Select your preferred model (GPT-4 Turbo recommended)
   - Click "Save Settings"

## Usage

### Basic Workflow

1. **Open Intervue.io Report Page**
   - Navigate to https://www.intervue.io/generate-report/
   - Ensure the form fields are visible

2. **Click the Extension**
   - Click the "Interview AI Autofill" icon in your Chrome toolbar
   - The popup will open

3. **Enter Interview Information**
   - **Interview Transcript**: Paste the complete interview transcript
   - **Interviewer Notes/Feedback**: Paste your notes and initial feedback

4. **Generate Report**
   - Click "Generate Report"
   - Wait for OpenAI to process (usually 10-30 seconds)
   - The extension will automatically fill the form fields

5. **Review and Submit**
   - Review the generated feedback
   - Make any necessary edits
   - Submit the report

### Advanced Features

**Test Fill**
- The content script has a test fill feature for development
- Send message: `{ action: 'testFill' }` from popup to content script

**Clear Fields**
- Clear all filled fields: `{ action: 'clearFields' }`

**Get Page State**
- Check current page state: `{ action: 'getPageState' }`

## Project Structure

```
interview-ai-extension/
├── manifest.json              # Extension manifest (Manifest V3)
├── package.json              # Node package definition
├── README.md                 # This file
├── .gitignore               # Git ignore file
│
├── popup/
│   ├── popup.html           # Extension popup UI
│   ├── popup.css            # Styling (dark theme)
│   └── popup.js             # Popup logic and event handlers
│
├── src/
│   ├── background.js        # Service worker (background tasks)
│   ├── content.js           # Content script (runs on Intervue.io)
│   ├── autofill.js          # Auto-fill logic for report fields
│   ├── openai.js            # OpenAI API integration
│   ├── prompts.js           # Prompt templates for AI
│   └── utils.js             # Utility functions for DOM manipulation
│
└── icons/
    ├── icon16.png           # Extension icon (16x16)
    ├── icon48.png           # Extension icon (48x48)
    └── icon128.png          # Extension icon (128x128)
```

## API Integration

### OpenAI Configuration

The extension uses OpenAI's Chat Completions API with JSON response format.

**Supported Models:**
- `gpt-4` - Most capable, highest cost
- `gpt-4-turbo` - Best performance/cost ratio (default)
- `gpt-3.5-turbo` - Faster, lower cost

**API Parameters:**
- Temperature: 0.7 (balanced creativity)
- Max Tokens: 2000
- Response Format: JSON object

### Feedback Structure

The extension generates structured feedback with these fields:

```json
{
  "overall_feedback": "Summary of performance",
  "strengths": ["strength 1", "strength 2", ...],
  "weaknesses": ["weakness 1", "weakness 2", ...],
  "suggestions": ["suggestion 1", "suggestion 2", ...],
  "technical_skills": "Technical assessment",
  "communication": "Communication assessment",
  "overall_rating": "STRONG|GOOD|MODERATE|WEAK",
  "recommendation": "HIRE|MAYBE|PASS"
}
```

## Field Detection

The extension uses intelligent label-based field detection instead of hardcoded CSS classes.

**Detected Labels:**
- Overall feedback
- Strengths
- Weaknesses
- Suggestions
- Technical Skills / Technical Feedback
- Communication / Communication Skills
- Overall Rating
- Recommendation / Overall Recommendation

The extension searches for labels using:
1. Text content matching
2. Nearby sibling elements
3. Parent container traversal (up to 5 levels)
4. Contenteditable div elements
5. React event dispatch

## Logging and Debugging

Enable logging by checking the browser console:

```javascript
// View all logged events
chrome.tabs.query({ active: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, { action: 'debugLog' });
});
```

Debug autofill:
```javascript
// See all detected fields in console
debugLogFields();
```

## Security & Privacy

🔒 **API Key Security**
- API keys are stored locally using Chrome's `storage.sync`
- Keys are never sent to external servers (except OpenAI)
- Keys are stored with `type: "password"` input for security

🔒 **Data Privacy**
- Transcripts and feedback are sent only to OpenAI
- No data is logged or stored permanently
- Extension has no analytics or tracking

🔒 **Permissions**
- `activeTab`: Access current tab for autofill
- `scripting`: Inject content script
- `storage`: Store API key locally
- `host_permissions`: Only intervue.io and api.openai.com

## Troubleshooting

### "OpenAI API Error: 401 Unauthorized"
- Check your API key in Settings
- Verify your key has access to Chat Completions API
- Generate a new key from https://platform.openai.com/api-keys

### "No fields were filled"
- Ensure you're on Intervue.io report generation page
- Check browser console for error messages
- Fields must have visible labels

### Extension not appearing in toolbar
- Verify extension is enabled in `chrome://extensions/`
- Try unpacking and reloading
- Clear Chrome cache if needed

### Fields filled but not saving
- Manually submit the form to save
- Check for form validation errors on the page
- Some fields may require specific formats

## Development

### Adding New Field Mappings

Edit `src/autofill.js`:

```javascript
const FIELD_MAPPING = {
  your_field: ['Label 1', 'Label 2', 'Alternative Label'],
  // ...
};
```

### Modifying Prompts

Edit `src/prompts.js` to change how feedback is generated:

```javascript
export function getUserPrompt(transcript, notes) {
  // Modify the prompt structure
}
```

### Testing

Test autofill on the page:
```javascript
// In browser console (on intervue.io)
chrome.runtime.sendMessage({ action: 'testFill' });
```

## API Cost Estimation

**Per Report:**
- Input tokens: ~500-1000 (depends on transcript length)
- Output tokens: ~200-300
- GPT-4 Turbo: ~$0.01-0.02 per report
- GPT-3.5 Turbo: ~$0.001-0.002 per report

**Monthly (assuming 100 reports/month):**
- GPT-4 Turbo: ~$1-2
- GPT-3.5 Turbo: ~$0.10-0.20

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

## Contributing

Contributions are welcome! Please ensure code follows the existing style and includes proper comments.

## Changelog

### v1.0.0 (Initial Release)
- ✅ OpenAI integration
- ✅ Auto-fill functionality
- ✅ Beautiful popup UI
- ✅ API key configuration
- ✅ Field detection by labels
- ✅ Error handling and logging
- ✅ Production-ready code

---

**Built with ❤️ for interviewers**

Version: 1.0.0
Last Updated: 2024
