/**
 * Prompts Module
 * Contains prompt templates for OpenAI API calls
 */

/**
 * Generate the system prompt for interview feedback
 * @returns {string} - System prompt
 */
export function getSystemPrompt() {
  return `You are an expert interview feedback analyst. Your task is to analyze interview transcripts and interviewer notes to generate structured, professional, and constructive feedback for interview reports.

Analyze the provided interview transcript and feedback notes, then generate comprehensive structured feedback in JSON format only. The feedback should be:
- Specific and actionable
- Professional and constructive
- Balanced (both strengths and areas for improvement)
- Focused on skill assessment
- Written in third person
- Concise but detailed

Return ONLY valid JSON, no additional text or markdown.`;
}

/**
 * Generate the user prompt for feedback analysis
 * @param {string} transcript - Interview transcript
 * @param {string} notes - Interviewer notes and feedback
 * @returns {string} - User prompt
 */
export function getUserPrompt(transcript, notes) {
  return `Please analyze this interview and generate structured feedback.

INTERVIEW TRANSCRIPT:
${transcript}

INTERVIEWER NOTES AND FEEDBACK:
${notes}

Generate a JSON object with the following structure (use exactly these keys):
{
  "overall_feedback": "Comprehensive summary of the interview performance (2-3 sentences)",
  "strengths": [
    "Specific strength 1",
    "Specific strength 2",
    "Specific strength 3"
  ],
  "weaknesses": [
    "Area for improvement 1",
    "Area for improvement 2"
  ],
  "suggestions": [
    "Actionable suggestion 1",
    "Actionable suggestion 2",
    "Actionable suggestion 3"
  ],
  "technical_skills": "Assessment of technical abilities and problem-solving skills (2-3 sentences)",
  "communication": "Assessment of communication, clarity, and articulation (2-3 sentences)",
  "overall_rating": "STRONG | GOOD | MODERATE | WEAK",
  "recommendation": "HIRE | MAYBE | PASS"
}

Important:
- Be specific and reference examples from the transcript
- Keep assessments balanced and professional
- Use clear, concise language
- Return only the JSON object, no additional text`;
}

/**
 * Generate alternative prompt for detailed analysis
 * @param {string} transcript - Interview transcript
 * @param {string} notes - Interviewer notes
 * @returns {string} - Detailed user prompt
 */
export function getDetailedUserPrompt(transcript, notes) {
  return `As an experienced interview assessor, analyze this interview session and provide detailed structured feedback.

INTERVIEW TRANSCRIPT:
${transcript}

INTERVIEWER OBSERVATIONS AND NOTES:
${notes}

Create a comprehensive JSON feedback object with these exact fields:
{
  "overall_feedback": "A concise summary of the candidate's overall performance in this interview",
  "strengths": [
    "Key strength demonstrated",
    "Another significant strength",
    "Additional positive quality"
  ],
  "weaknesses": [
    "Specific area needing development",
    "Another weakness or gap"
  ],
  "suggestions": [
    "Specific improvement recommendation",
    "Another actionable suggestion",
    "Further development area"
  ],
  "technical_skills": "Detailed assessment of technical competency and problem-solving approach",
  "communication": "Evaluation of communication skills, clarity of thought, and articulation",
  "overall_rating": "STRONG | GOOD | MODERATE | WEAK",
  "recommendation": "HIRE | MAYBE | PASS"
}

Guidelines:
1. Reference specific examples from the transcript
2. Be objective and evidence-based
3. Provide constructive feedback
4. Focus on job relevance
5. Return ONLY the JSON object`;
}

/**
 * Extract JSON from response text
 * Handles cases where the API might include extra text
 * @param {string} text - Response text
 * @returns {string} - Cleaned JSON string
 */
export function extractJSONFromResponse(text) {
  if (!text) return '';

  // Try to find JSON object in the text
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    return jsonMatch[0];
  }

  // If no match, return original text (might already be valid JSON)
  return text;
}

/**
 * Validate feedback JSON structure
 * @param {Object} feedback - Parsed feedback object
 * @returns {Object} - Validation result with isValid and errors array
 */
export function validateFeedbackStructure(feedback) {
  const errors = [];
  const requiredFields = [
    'overall_feedback',
    'strengths',
    'weaknesses',
    'suggestions',
    'technical_skills',
    'communication',
    'overall_rating',
    'recommendation'
  ];

  if (!feedback || typeof feedback !== 'object') {
    errors.push('Feedback must be a valid object');
    return { isValid: false, errors };
  }

  for (const field of requiredFields) {
    if (!(field in feedback)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate array fields
  if (feedback.strengths && !Array.isArray(feedback.strengths)) {
    errors.push('strengths must be an array');
  }

  if (feedback.weaknesses && !Array.isArray(feedback.weaknesses)) {
    errors.push('weaknesses must be an array');
  }

  if (feedback.suggestions && !Array.isArray(feedback.suggestions)) {
    errors.push('suggestions must be an array');
  }

  // Validate rating
  const validRatings = ['STRONG', 'GOOD', 'MODERATE', 'WEAK'];
  if (feedback.overall_rating && !validRatings.includes(feedback.overall_rating.toUpperCase())) {
    errors.push(`overall_rating must be one of: ${validRatings.join(', ')}`);
  }

  // Validate recommendation
  const validRecommendations = ['HIRE', 'MAYBE', 'PASS'];
  if (
    feedback.recommendation &&
    !validRecommendations.includes(feedback.recommendation.toUpperCase())
  ) {
    errors.push(`recommendation must be one of: ${validRecommendations.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Format feedback for display
 * @param {Object} feedback - Structured feedback object
 * @returns {Object} - Formatted feedback ready for UI display
 */
export function formatFeedbackForDisplay(feedback) {
  if (!feedback) return null;

  return {
    overallFeedback: feedback.overall_feedback || '',
    strengths: Array.isArray(feedback.strengths) ? feedback.strengths.join('\n') : '',
    weaknesses: Array.isArray(feedback.weaknesses) ? feedback.weaknesses.join('\n') : '',
    suggestions: Array.isArray(feedback.suggestions) ? feedback.suggestions.join('\n') : '',
    technicalSkills: feedback.technical_skills || '',
    communication: feedback.communication || '',
    overallRating: feedback.overall_rating || 'MODERATE',
    recommendation: feedback.recommendation || 'MAYBE'
  };
}

/**
 * Create a summary prompt for quick feedback
 * @param {string} transcript - Interview transcript
 * @param {string} notes - Interviewer notes
 * @returns {string} - Summary prompt
 */
export function getSummaryPrompt(transcript, notes) {
  return `Quickly analyze this interview and provide a JSON summary.

TRANSCRIPT:
${transcript}

NOTES:
${notes}

Return this JSON structure only:
{
  "overall_feedback": "Brief 1-2 sentence summary",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1"],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "technical_skills": "Brief assessment",
  "communication": "Brief assessment",
  "overall_rating": "GOOD",
  "recommendation": "MAYBE"
}`;
}
