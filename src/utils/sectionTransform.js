/**
 * Convert sections array to blocks array
 * @param {Section[]} sections - Array of flat sections
 * @returns {Block[]} Array of blocks
 */
export function sectionsToBlocks(sections) {
  return sections.map(section => ({
    id: section.id,
    content: section.content,
    isRendered: false, // Default to edit mode
    sectionId: section.id,
    sectionType: section.section_type || section.sectionType || section.type
  }));
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
