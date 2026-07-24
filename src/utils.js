/**
 * Utility Functions
 * Common DOM manipulation and helper functions
 */

/**
 * Find an element by visible label text
 * @param {string} labelText - The visible text of the label
 * @returns {HTMLElement|null} - The element associated with the label
 */
export function findElementByLabel(labelText) {
  const labels = document.querySelectorAll('label, [role="label"], div, h3, h4');

  for (const label of labels) {
    const text = label.textContent.trim();

    if (text.toLowerCase() === labelText.toLowerCase()) {
      // Try to find the nearest input or contenteditable element
      let target = label.nextElementSibling;

      if (target && isEditableElement(target)) {
        return target;
      }

      // Check within parent container
      const parent = label.closest('div[class*="form"], fieldset, section, [role="group"]');
      if (parent) {
        const editables = parent.querySelectorAll('[contenteditable="true"], textarea, input[type="text"]');
        if (editables.length > 0) {
          return editables[0];
        }
      }

      // Search nearby siblings
      target = label.parentElement?.nextElementSibling;
      if (target && isEditableElement(target)) {
        return target;
      }

      // Search in ancestors
      let ancestor = label.parentElement;
      for (let i = 0; i < 5; i++) {
        if (!ancestor) break;

        const editable = ancestor.querySelector('[contenteditable="true"], textarea, input[type="text"]');
        if (editable && editable !== label) {
          return editable;
        }

        ancestor = ancestor.parentElement;
      }
    }
  }

  return null;
}

/**
 * Check if an element is editable (CKEditor or textarea)
 * @param {HTMLElement} element - The element to check
 * @returns {boolean} - True if editable
 */
export function isEditableElement(element) {
  if (!element) return false;

  return (
    element.contentEditable === 'true' ||
    element.tagName === 'TEXTAREA' ||
    (element.tagName === 'INPUT' && element.type === 'text') ||
    element.getAttribute('role') === 'textbox' ||
    element.classList.toString().includes('editable') ||
    element.classList.toString().includes('ck-editor')
  );
}

/**
 * Set content in an editable element and trigger events
 * @param {HTMLElement} element - The element to fill
 * @param {string} content - The content to set
 */
export function setEditableContent(element, content) {
  if (!element) return;

  try {
    if (element.tagName === 'TEXTAREA') {
      // Handle textarea
      element.value = content;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (element.contentEditable === 'true' || element.getAttribute('role') === 'textbox') {
      // Handle CKEditor and contenteditable divs
      element.innerHTML = content;
      element.textContent = content;

      // Trigger input events for React and other frameworks
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
      element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' }));

      // Trigger React synthetic events if using React
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set || Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(element, content);
      }
    } else if (element.tagName === 'INPUT') {
      // Handle input fields
      element.value = content;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Trigger focus and blur events
    element.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    element.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
  } catch (error) {
    console.error('Error setting editable content:', error);
  }
}

/**
 * Find the nearest CKEditor container for an element
 * @param {HTMLElement} element - Starting element
 * @returns {HTMLElement|null} - The CKEditor element or null
 */
export function findNearestCKEditor(element) {
  if (!element) return null;

  // Check if element is already a CKEditor
  if (element.classList.toString().includes('ck-editor') || element.contentEditable === 'true') {
    return element;
  }

  // Search up the DOM tree
  let current = element.parentElement;
  for (let i = 0; i < 10; i++) {
    if (!current) break;

    if (current.contentEditable === 'true' || current.classList.toString().includes('ck-editor')) {
      return current;
    }

    current = current.parentElement;
  }

  // Search down for contenteditable
  const contentEditables = element.querySelectorAll('[contenteditable="true"]');
  if (contentEditables.length > 0) {
    return contentEditables[0];
  }

  return null;
}

/**
 * Safe query selector wrapper
 * @param {string} selector - CSS selector
 * @param {HTMLElement} parent - Parent element (optional, defaults to document)
 * @returns {HTMLElement|null} - The found element or null
 */
export function safeQuerySelector(selector, parent = document) {
  try {
    return parent.querySelector(selector);
  } catch (error) {
    console.error(`Invalid selector: ${selector}`, error);
    return null;
  }
}

/**
 * Safe query selector all wrapper
 * @param {string} selector - CSS selector
 * @param {HTMLElement} parent - Parent element (optional, defaults to document)
 * @returns {NodeList} - List of found elements
 */
export function safeQuerySelectorAll(selector, parent = document) {
  try {
    return parent.querySelectorAll(selector);
  } catch (error) {
    console.error(`Invalid selector: ${selector}`, error);
    return [];
  }
}

/**
 * Wait for an element to appear in the DOM
 * @param {string|Function} selector - CSS selector or function that returns element
 * @param {number} timeout - Timeout in milliseconds (default: 5000)
 * @returns {Promise<HTMLElement|null>} - The found element or null if timeout
 */
export function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const checkElement = () => {
      let element = null;

      if (typeof selector === 'function') {
        element = selector();
      } else {
        element = safeQuerySelector(selector);
      }

      if (element) {
        resolve(element);
        return;
      }

      if (Date.now() - startTime > timeout) {
        console.warn(`Element not found after ${timeout}ms: ${selector}`);
        resolve(null);
        return;
      }

      requestAnimationFrame(checkElement);
    };

    checkElement();
  });
}

/**
 * Log message with timestamp
 * @param {string} message - Message to log
 * @param {string} level - Log level (log, info, warn, error)
 */
export function log(message, level = 'log') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `[Interview AI ${timestamp}]`;

  console[level](prefix, message);
}

/**
 * Format text for CKEditor (handle HTML entities and formatting)
 * @param {string} text - Raw text to format
 * @returns {string} - Formatted HTML
 */
export function formatTextForCKEditor(text) {
  if (!text) return '';

  // Replace line breaks with proper HTML
  let formatted = text
    .replace(/\r\n/g, '<br>')
    .replace(/\n/g, '<br>')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return formatted;
}

/**
 * Extract text content from any element
 * @param {HTMLElement} element - Element to extract from
 * @returns {string} - Text content
 */
export function getElementText(element) {
  if (!element) return '';

  if (element.contentEditable === 'true') {
    return element.textContent || element.innerText || '';
  }

  return element.textContent || element.innerText || element.value || '';
}

/**
 * Check if we're on Interview.io page
 * @returns {boolean} - True if on Interview.io
 */
export function isInterviewIOPage() {
  return window.location.hostname.includes('interview.io');
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait) {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit time in milliseconds
 * @returns {Function} - Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;

  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Parse structured feedback JSON
 * @param {string} jsonString - JSON string to parse
 * @returns {Object|null} - Parsed object or null if invalid
 */
export function parseJSON(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON parse error:', error);
    return null;
  }
}

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} - Capitalized string
 */
export function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
export function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return text.replace(/[&<>"']/g, (char) => map[char]);
}
