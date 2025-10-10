/**
 * Transform utilities for converting backend Section data to frontend Block format
 */

/**
 * Convert sections array to blocks array
 * @param {Section[]} sections - Array of flat sections from backend
 * @returns {Block[]} Array of blocks for frontend rendering
 */
export function sectionsToBlocks(sections) {
  if (!Array.isArray(sections)) {
    console.warn('sectionsToBlocks: expected array, got:', typeof sections);
    return [];
  }

  return sections.map(section => ({
    id: section.id,
    content: section.content || '',
    isRendered: false, // Default to edit mode
    sectionId: section.id,
    sectionType: section.section_type || section.type || 'unknown'
  }));
}

/**
 * Get badge color for section type
 * @param {string} sectionType - Section type
 * @returns {string} Radix UI color name
 */
export function getSectionTypeColor(sectionType) {
  const colorMap = {
    intent: 'blue',
    evaluation: 'green',
    process: 'purple',
    alternatives: 'orange',
    prompts: 'pink',
    notes: 'gray'
  };

  return colorMap[sectionType] || 'gray';
}

/**
 * Format section type for display
 * @param {string} sectionType - Section type
 * @returns {string} Formatted section type
 */
export function formatSectionType(sectionType) {
  if (!sectionType) return 'Unknown';
  return sectionType.charAt(0).toUpperCase() + sectionType.slice(1);
}

/**
 * @typedef {Object} Section
 * @property {string} id - Section ID (e.g., "intent-1")
 * @property {string} section_type - Section type (e.g., "intent", "evaluation")
 * @property {string} content - Markdown content (variables resolved)
 * @property {string|null} [ref_target] - Optional reference target
 * @property {Section[]} children - Always empty array (no nesting)
 */

/**
 * @typedef {Object} Block
 * @property {string} id - Unique block ID (use section.id)
 * @property {string} content - Markdown content
 * @property {boolean} isRendered - Edit (false) or Preview (true) mode
 * @property {string} sectionId - Original section ID
 * @property {string} sectionType - Section type (intent, evaluation, etc.)
 */
