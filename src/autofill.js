/**
 * Autofill Module
 * Handles filling Interview.io report page with generated feedback
 */

import {
  findElementByLabel,
  isEditableElement,
  setEditableContent,
  findNearestCKEditor,
  formatTextForCKEditor,
  log
} from './utils.js';

/**
 * Field mapping from feedback keys to Interview.io labels
 */
const FIELD_MAPPING = {
  overall_feedback: ['Overall feedback', 'Overall Feedback'],
  strengths: ['Strengths'],
  weaknesses: ['Weaknesses'],
  suggestions: ['Suggestions', 'Areas for Improvement'],
  technical_skills: ['Technical Skills', 'Technical Feedback', 'Technical'],
  communication: ['Communication', 'Communication Skills'],
  overall_rating: ['Overall Rating', 'Rating'],
  recommendation: ['Recommendation', 'Overall Recommendation']
};

/**
 * Fill Interview.io report page with feedback
 * @param {Object} feedback - Structured feedback object
 * @returns {Object} - Result with filled fields and errors
 */
export function fillInterviewIOPage(feedback) {
  if (!feedback || typeof feedback !== 'object') {
    throw new Error('Invalid feedback object');
  }

  const result = {
    filled: [],
    failed: [],
    errors: []
  };

  log('Starting Interview.io page autofill...', 'info');

  // Iterate through feedback fields
  for (const [feedbackKey, labels] of Object.entries(FIELD_MAPPING)) {
    const value = feedback[feedbackKey];

    if (!value) {
      continue;
    }

    let filled = false;

    // Try each label variant
    for (const label of labels) {
      try {
        const element = findElementByLabel(label);

        if (element) {
          const content = formatContentForField(feedbackKey, value);
          setEditableContent(element, content);

          result.filled.push({
            field: feedbackKey,
            label: label,
            element: element.tagName,
            content: content.substring(0, 50) + '...'
          });

          filled = true;
          log(`Filled field: ${feedbackKey} with label: ${label}`, 'info');
          break;
        }
      } catch (error) {
        result.errors.push({
          field: feedbackKey,
          label: label,
          error: error.message
        });

        log(`Error filling ${feedbackKey} with label ${label}: ${error.message}`, 'error');
      }
    }

    if (!filled) {
      result.failed.push({
        field: feedbackKey,
        labels: labels
      });

      log(`Failed to find element for field: ${feedbackKey}`, 'warn');
    }
  }

  return result;
}

/**
 * Format content based on field type
 * @param {string} fieldKey - Feedback field key
 * @param {any} value - Field value
 * @returns {string} - Formatted content
 */
function formatContentForField(fieldKey, value) {
  let content = '';

  if (Array.isArray(value)) {
    // Format array fields (strengths, weaknesses, suggestions)
    content = value
      .filter((item) => item && item.trim())
      .map((item) => `• ${item}`)
      .join('\n');
  } else if (typeof value === 'object') {
    // Handle object values
    content = JSON.stringify(value, null, 2);
  } else {
    // Convert to string
    content = String(value);
  }

  return formatTextForCKEditor(content);
}

/**
 * Find all editable fields on the page
 * @returns {Array} - Array of editable field objects
 */
export function findAllEditableFields() {
  const fields = [];
  const selectors = ['[contenteditable="true"]', 'textarea', 'input[type="text"]', '[role="textbox"]'];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);

    for (const element of elements) {
      // Find associated label
      let label = '';

      // Check for nearby label
      const labelElement = element.closest('div, fieldset, section')?.querySelector('label');
      if (labelElement) {
        label = labelElement.textContent.trim();
      }

      // Check for aria-label
      if (!label) {
        label = element.getAttribute('aria-label') || element.getAttribute('placeholder') || '';
      }

      if (label) {
        fields.push({
          element: element,
          label: label,
          selector: selector,
          type: element.tagName
        });
      }
    }
  }

  return fields;
}

/**
 * Test fill - fill with sample data
 * @returns {boolean} - True if successful
 */
export function testFill() {
  const testFeedback = {
    overall_feedback: 'Strong candidate with good technical knowledge.',
    strengths: ['Problem solving', 'Communication'],
    weaknesses: ['Time management'],
    suggestions: ['Practice system design', 'Work on algorithms'],
    technical_skills: 'Good technical foundation.',
    communication: 'Clear and articulate.',
    overall_rating: 'GOOD',
    recommendation: 'HIRE'
  };

  try {
    const result = fillInterviewIOPage(testFeedback);
    log(`Test fill completed. Filled: ${result.filled.length}, Failed: ${result.failed.length}`, 'info');
    return result.filled.length > 0;
  } catch (error) {
    log(`Test fill error: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Clear all filled fields on the page
 * @returns {number} - Number of fields cleared
 */
export function clearFilledFields() {
  const fields = findAllEditableFields();
  let cleared = 0;

  for (const field of fields) {
    try {
      setEditableContent(field.element, '');
      cleared++;
    } catch (error) {
      log(`Error clearing field: ${error.message}`, 'error');
    }
  }

  return cleared;
}

/**
 * Validate if all required fields are filled
 * @returns {Object} - Validation result
 */
export function validatePageFilled() {
  const fields = findAllEditableFields();
  const required = ['Overall feedback', 'Strengths', 'Weaknesses', 'Technical Skills', 'Communication'];

  const validation = {
    isValid: true,
    filled: [],
    missing: []
  };

  for (const requiredField of required) {
    const found = fields.find(
      (field) =>
        field.label.toLowerCase().includes(requiredField.toLowerCase()) &&
        field.element.textContent.trim().length > 0
    );

    if (found) {
      validation.filled.push(requiredField);
    } else {
      validation.missing.push(requiredField);
      validation.isValid = false;
    }
  }

  return validation;
}

/**
 * Wait for Interview.io page to load
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>} - True if page loaded
 */
export async function waitForInterviewIOPageLoad(timeout = 5000) {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const checkPage = () => {
      // Check if we can find typical Interview.io elements
      const fields = findAllEditableFields();

      if (fields.length > 0) {
        log('Interview.io page detected with editable fields', 'info');
        resolve(true);
        return;
      }

      if (Date.now() - startTime > timeout) {
        log('Interview.io page load timeout', 'warn');
        resolve(false);
        return;
      }

      requestAnimationFrame(checkPage);
    };

    checkPage();
  });
}

/**
 * Scroll to first empty required field
 * @returns {boolean} - True if scrolled
 */
export function scrollToFirstEmptyField() {
  const fields = findAllEditableFields();
  const required = ['Overall feedback', 'Strengths'];

  for (const field of fields) {
    for (const req of required) {
      if (field.label.toLowerCase().includes(req.toLowerCase()) && !field.element.textContent.trim()) {
        field.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        field.element.focus();
        return true;
      }
    }
  }

  return false;
}

/**
 * Get current page state
 * @returns {Object} - Page state information
 */
export function getPageState() {
  const fields = findAllEditableFields();
  const state = {
    totalFields: fields.length,
    filledFields: 0,
    emptyFields: 0,
    fields: []
  };

  for (const field of fields) {
    const isFilled = field.element.textContent.trim().length > 0;
    const content = field.element.textContent.trim();

    state.fields.push({
      label: field.label,
      isFilled: isFilled,
      contentLength: content.length
    });

    if (isFilled) {
      state.filledFields++;
    } else {
      state.emptyFields++;
    }
  }

  return state;
}

/**
 * Debug helper - log all detected fields to console
 */
export function debugLogFields() {
  const fields = findAllEditableFields();

  console.group('Interview.io Fields');
  console.log(`Total fields found: ${fields.length}`);

  for (const field of fields) {
    const contentPreview = field.element.textContent.substring(0, 100);
    console.log({
      label: field.label,
      type: field.type,
      selector: field.selector,
      contentPreview: contentPreview,
      contentLength: field.element.textContent.length
    });
  }

  console.groupEnd();
}
