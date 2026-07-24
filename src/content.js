/**
 * Content Script
 * Runs in the context of the Intervue.io webpage
 * Receives messages from popup and autofills the report page
 */

import { generateFeedback } from './openai.js';
import { fillInterviewIOPage, waitForInterviewIOPageLoad } from './autofill.js';
import { log } from './utils.js';

/**
 * Initialize content script
 */
function init() {
  log('Content script initialized', 'info');

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request, sender, sendResponse);

    // Return true to indicate we'll respond asynchronously
    return true;
  });

  log('Message listener attached', 'info');
}

/**
 * Handle incoming messages
 * @param {Object} request - Message request
 * @param {Object} sender - Sender information
 * @param {Function} sendResponse - Response callback
 */
async function handleMessage(request, sender, sendResponse) {
  try {
    if (request.action === 'generateAndFillReport') {
      await handleGenerateAndFillReport(request, sendResponse);
    } else if (request.action === 'testFill') {
      await handleTestFill(sendResponse);
    } else if (request.action === 'getPageState') {
      await handleGetPageState(sendResponse);
    } else if (request.action === 'clearFields') {
      await handleClearFields(sendResponse);
    } else if (request.action === 'ping') {
      sendResponse({ success: true, message: 'pong' });
    } else {
      sendResponse({
        success: false,
        error: `Unknown action: ${request.action}`
      });
    }
  } catch (error) {
    log(`Message handling error: ${error.message}`, 'error');
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Generate feedback and fill report page
 * @param {Object} request - Request containing transcript, feedback, apiKey, model
 * @param {Function} sendResponse - Response callback
 */
async function handleGenerateAndFillReport(request, sendResponse) {
  try {
    const { transcript, feedback, apiKey, model } = request;

    log('Generating interview feedback...', 'info');

    // Validate input
    if (!transcript || !feedback) {
      throw new Error('Transcript and feedback are required');
    }

    // Wait for page to load
    log('Waiting for Intervue.io page to load...', 'info');
    const pageLoaded = await waitForInterviewIOPageLoad(5000);

    if (!pageLoaded) {
      throw new Error('Intervue.io page did not load. Please ensure you are on the report page.');
    }

    // Generate feedback from OpenAI
    let generatedFeedback;
    try {
      generatedFeedback = await generateFeedback(transcript, feedback, apiKey, model);
    } catch (error) {
      throw new Error(`Failed to generate feedback: ${error.message}`);
    }

    log('Feedback generated successfully', 'info');

    // Fill the page with feedback
    const fillResult = fillInterviewIOPage(generatedFeedback);

    if (fillResult.filled.length === 0) {
      throw new Error(
        'No fields were filled. The page structure may have changed. Please fill manually.'
      );
    }

    log(`Filled ${fillResult.filled.length} fields`, 'info');

    sendResponse({
      success: true,
      message: `Successfully filled ${fillResult.filled.length} fields`,
      data: {
        filled: fillResult.filled,
        failed: fillResult.failed,
        feedback: generatedFeedback
      }
    });
  } catch (error) {
    log(`Generate and fill error: ${error.message}`, 'error');
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Test fill with sample data
 * @param {Function} sendResponse - Response callback
 */
async function handleTestFill(sendResponse) {
  try {
    log('Testing fill with sample data...', 'info');

    // Wait for page to load
    const pageLoaded = await waitForInterviewIOPageLoad(5000);

    if (!pageLoaded) {
      throw new Error('Intervue.io page did not load');
    }

    // Sample feedback
    const testFeedback = {
      overall_feedback: 'This is a test candidate with good communication skills and strong problem-solving abilities.',
      strengths: [
        'Excellent communication skills',
        'Strong problem-solving approach',
        'Good understanding of system design'
      ],
      weaknesses: [
        'Could improve on time management during the interview',
        'Limited experience with specific tech stack'
      ],
      suggestions: [
        'Practice more algorithm problems to improve speed',
        'Gain hands-on experience with the required tech stack',
        'Work on explaining thoughts more concisely'
      ],
      technical_skills: 'The candidate demonstrated solid technical knowledge with a good grasp of fundamentals. Problem-solving approach was methodical and well-structured.',
      communication: 'The candidate communicated clearly throughout the interview. Thoughts were well-articulated and easy to follow.',
      overall_rating: 'GOOD',
      recommendation: 'MAYBE'
    };

    // Fill the page
    const fillResult = fillInterviewIOPage(testFeedback);

    log(`Test fill completed. Filled: ${fillResult.filled.length}`, 'info');

    sendResponse({
      success: true,
      message: `Test fill completed. Filled ${fillResult.filled.length} fields.`,
      data: fillResult
    });
  } catch (error) {
    log(`Test fill error: ${error.message}`, 'error');
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get current page state
 * @param {Function} sendResponse - Response callback
 */
async function handleGetPageState(sendResponse) {
  try {
    const pageLoaded = await waitForInterviewIOPageLoad(2000);

    if (!pageLoaded) {
      sendResponse({
        success: false,
        error: 'Intervue.io page not detected'
      });
      return;
    }

    // Import autofill module to get page state
    const { getPageState } = await import('./autofill.js');
    const state = getPageState();

    sendResponse({
      success: true,
      data: state
    });
  } catch (error) {
    log(`Get page state error: ${error.message}`, 'error');
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Clear all filled fields
 * @param {Function} sendResponse - Response callback
 */
async function handleClearFields(sendResponse) {
  try {
    const { clearFilledFields } = await import('./autofill.js');
    const cleared = clearFilledFields();

    log(`Cleared ${cleared} fields`, 'info');

    sendResponse({
      success: true,
      message: `Cleared ${cleared} fields`,
      data: { cleared }
    });
  } catch (error) {
    log(`Clear fields error: ${error.message}`, 'error');
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Notify that content script is ready
 */
function notifyContentScriptReady() {
  log('Content script is ready', 'info');

  // Send a message to background script if needed
  chrome.runtime.sendMessage({
    action: 'contentScriptReady',
    timestamp: new Date().toISOString()
  }).catch(() => {
    // Background script may not be listening, ignore error
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('DOMContentLoaded', notifyContentScriptReady);
} else {
  init();
  notifyContentScriptReady();
}

// Also initialize immediately in case DOM is already ready
init();
notifyContentScriptReady();
