/**
 * OpenAI Integration Module
 * Handles all communication with OpenAI API
 */

import { getSystemPrompt, getUserPrompt, extractJSONFromResponse } from './prompts.js';

const OPENAI_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4-turbo';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 2000;

/**
 * Generate interview feedback using OpenAI
 * @param {string} transcript - Interview transcript
 * @param {string} feedback - Interviewer notes and feedback
 * @param {string} apiKey - OpenAI API key
 * @param {string} model - OpenAI model to use (default: gpt-4-turbo)
 * @returns {Promise<Object>} - Structured feedback JSON
 */
export async function generateFeedback(transcript, feedback, apiKey, model = DEFAULT_MODEL) {
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }

  if (!transcript || !feedback) {
    throw new Error('Transcript and feedback are required');
  }

  const systemPrompt = getSystemPrompt();
  const userPrompt = getUserPrompt(transcript, feedback);

  try {
    const response = await callOpenAIAPI(
      apiKey,
      model,
      [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ]
    );

    // Extract JSON from response
    const jsonString = extractJSONFromResponse(response);

    // Parse JSON
    const parsedFeedback = JSON.parse(jsonString);

    return parsedFeedback;
  } catch (error) {
    console.error('Error generating feedback:', error);
    throw error;
  }
}

/**
 * Call OpenAI Chat Completions API
 * @param {string} apiKey - OpenAI API key
 * @param {string} model - Model to use
 * @param {Array} messages - Message objects for the conversation
 * @param {number} temperature - Temperature for response generation
 * @param {number} maxTokens - Maximum tokens to generate
 * @returns {Promise<string>} - API response content
 */
export async function callOpenAIAPI(
  apiKey,
  model = DEFAULT_MODEL,
  messages = [],
  temperature = DEFAULT_TEMPERATURE,
  maxTokens = DEFAULT_MAX_TOKENS
) {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  if (!messages || messages.length === 0) {
    throw new Error('Messages array is required');
  }

  try {
    const response = await fetch(OPENAI_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;

      throw new Error(`OpenAI API Error: ${errorMessage}`);
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from OpenAI API');
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API call failed:', error);
    throw error;
  }
}

/**
 * Validate API key by making a test request
 * @param {string} apiKey - API key to validate
 * @returns {Promise<boolean>} - True if valid, false otherwise
 */
export async function validateAPIKey(apiKey) {
  if (!apiKey) {
    return false;
  }

  try {
    const response = await callOpenAIAPI(apiKey, DEFAULT_MODEL, [
      {
        role: 'user',
        content: 'Respond with "ok"'
      }
    ]);

    return response && response.toLowerCase().includes('ok');
  } catch (error) {
    console.error('API key validation failed:', error);
    return false;
  }
}

/**
 * Get available models (cached list)
 * @returns {Array} - List of available models
 */
export function getAvailableModels() {
  return ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'];
}

/**
 * Check API rate limit
 * @param {Response} response - Fetch response object
 * @returns {Object} - Rate limit info
 */
export function parseRateLimitInfo(response) {
  const rateLimitLimit = response.headers.get('x-ratelimit-limit-requests');
  const rateLimitRemaining = response.headers.get('x-ratelimit-remaining-requests');
  const rateLimitReset = response.headers.get('x-ratelimit-reset-requests');

  return {
    limit: rateLimitLimit ? parseInt(rateLimitLimit) : null,
    remaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : null,
    resetTime: rateLimitReset ? new Date(rateLimitReset) : null
  };
}

/**
 * Format API error message for display
 * @param {Error} error - Error object
 * @returns {string} - User-friendly error message
 */
export function formatErrorMessage(error) {
  const message = error.message || 'An error occurred';

  if (message.includes('API key')) {
    return 'Invalid OpenAI API key. Please check your settings.';
  }

  if (message.includes('401')) {
    return 'Authentication failed. Please verify your API key.';
  }

  if (message.includes('429')) {
    return 'Rate limit exceeded. Please try again later.';
  }

  if (message.includes('500')) {
    return 'OpenAI service error. Please try again later.';
  }

  if (message.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }

  return message;
}

/**
 * Stream completion (for future use)
 * @param {string} apiKey - OpenAI API key
 * @param {string} model - Model to use
 * @param {Array} messages - Messages
 * @param {Function} onChunk - Callback for each chunk
 * @returns {Promise<string>} - Full response
 */
export async function streamCompletion(apiKey, model, messages, onChunk) {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  try {
    const response = await fetch(OPENAI_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: DEFAULT_TEMPERATURE,
        max_tokens: DEFAULT_MAX_TOKENS,
        stream: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API Error: ${errorData?.error?.message || response.statusText}`);
    }

    let fullContent = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            break;
          }

          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content || '';

            if (content) {
              fullContent += content;

              if (onChunk) {
                onChunk(content);
              }
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    }

    return fullContent;
  } catch (error) {
    console.error('Stream completion error:', error);
    throw error;
  }
}
