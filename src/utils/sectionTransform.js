/**
 * Transform utilities for converting backend Section data to frontend Block format
 */

/**
 * Block separator used in section content to split into multiple blocks
 * Uses markdown horizontal rule syntax
 */
const BLOCK_SEPARATOR = /\n---\n/;

/**
 * Convert sections array to blocks array
 * Supports splitting sections into multiple blocks using '---' separator
 * @param {Section[]} sections - Array of flat sections from backend
 * @returns {Block[]} Array of blocks for frontend rendering
 */
export function sectionsToBlocks(sections) {
  if (!Array.isArray(sections)) {
    console.warn('sectionsToBlocks: expected array, got:', typeof sections);
    return [];
  }

  const blocks = [];

  sections.forEach(section => {
    const content = section.content || '';
    const sectionType = section.section_type || section.type || 'unknown';

    // Split content on '---' separator (on its own line)
    const contentParts = content.split(BLOCK_SEPARATOR).map(part => part.trim());

    // Create a block for each content part
    contentParts.forEach((contentPart, index) => {
      const isFirstInSection = index === 0;
      const totalBlocks = contentParts.length;

      // Generate block ID: use base section ID for single blocks, add suffix for multiple
      const blockId = totalBlocks > 1
        ? `${section.id}.${index + 1}`
        : section.id;

      blocks.push({
        id: blockId,
        content: contentPart,
        isRendered: false, // Default to edit mode
        sectionId: section.id,
        sectionType,
        // Metadata for sub-blocks
        parentSectionId: section.id,
        blockIndex: index,
        totalBlocks,
        isFirstInSection
      });
    });
  });

  return blocks;
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
 * @property {string} id - Unique block ID (section.id or section.id.N for sub-blocks)
 * @property {string} content - Markdown content
 * @property {boolean} isRendered - Edit (false) or Preview (true) mode
 * @property {string} sectionId - Original section ID
 * @property {string} sectionType - Section type (intent, evaluation, etc.)
 * @property {string} parentSectionId - Parent section ID (same as sectionId)
 * @property {number} blockIndex - Index within section (0-based)
 * @property {number} totalBlocks - Total number of blocks in this section
 * @property {boolean} isFirstInSection - True if this is the first block in the section
 */
