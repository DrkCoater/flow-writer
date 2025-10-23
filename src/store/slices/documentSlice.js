import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { sectionsToBlocks, blocksToSections } from '@/utils/sectionTransform';

/**
 * Helper function to get document path
 * Priority: ENV variable > file picker dialog
 */
async function getDocumentPath() {
  // Get path from backend (checks ENV variable)
  let filePath = await invoke('get_document_path');

  // If no path available, show file picker
  if (!filePath) {
    filePath = await open({
      title: 'Select Context Document',
      multiple: false,
      filters: [{
        name: 'XML Files',
        extensions: ['xml']
      }]
    });

    // User cancelled the dialog
    if (!filePath) {
      throw new Error('No document selected');
    }
  }

  return filePath;
}

/**
 * Async thunk to load document sections from backend
 */
export const loadDocument = createAsyncThunk(
  'document/loadDocument',
  async (_, { rejectWithValue }) => {
    try {
      // Get document path (ENV > file picker)
      const filePath = await getDocumentPath();

      // Invoke Tauri backend command to load sections
      const sections = await invoke('load_sections', { filePath });

      // Transform sections to blocks
      const blocks = sectionsToBlocks(sections);

      return { sections, blocks, filePath };
    } catch (error) {
      return rejectWithValue(error.message || String(error));
    }
  }
);

/**
 * Async thunk to save document sections to backend
 */
export const saveDocument = createAsyncThunk(
  'document/saveDocument',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const blocks = state.document.blocks;

      // Convert blocks back to sections
      const sections = blocksToSections(blocks);

      // Get document path (same logic as loadDocument)
      const filePath = await getDocumentPath();

      // Invoke Tauri backend command to save sections
      await invoke('save_document', { filePath, sections });

      return { sections };
    } catch (error) {
      return rejectWithValue(error.message || String(error));
    }
  }
);

const initialState = {
  sections: [],           // Raw sections from XML
  blocks: [],             // Transformed blocks for editing
  currentFilePath: null,  // Current document file path
  nextId: 1,              // For new block IDs
  focusedBlockId: null,   // Currently focused block
  focusCursorPosition: null,  // Cursor position in focused block
  loading: false,
  error: null,
};

/**
 * Helper function to renumber blocks within a section
 */
const renumberBlocksInSection = (blocksList, parentSectionId) => {
  return blocksList.map(block => {
    if (block.parentSectionId === parentSectionId) {
      // Get all blocks in this section
      const sectionBlocks = blocksList.filter(b => b.parentSectionId === parentSectionId);
      const totalBlocks = sectionBlocks.length;
      const blockIndex = sectionBlocks.findIndex(b => b.id === block.id);

      // Generate new ID
      const newId = totalBlocks > 1
        ? `${parentSectionId}.${blockIndex + 1}`
        : parentSectionId;

      return {
        ...block,
        id: newId,
        blockIndex,
        totalBlocks,
        isFirstInSection: blockIndex === 0
      };
    }
    return block;
  });
};

const documentSlice = createSlice({
  name: 'document',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },

    updateBlockContent: (state, action) => {
      const { blockId, content } = action.payload;

      // Check for auto-split on ---
      const splitPattern = /\n---\n/;
      const blockIndex = state.blocks.findIndex(b => b.id === blockId);

      if (blockIndex !== -1 && splitPattern.test(content)) {
        // Split the block
        const block = state.blocks[blockIndex];
        const splitIndex = content.indexOf('\n---\n');
        const beforeContent = content.substring(0, splitIndex); // Exclude \n---\n
        const afterContent = content.substring(splitIndex + 5); // Skip \n---\n

        // Update current block with first part
        state.blocks[blockIndex].content = beforeContent;

        // Create new block for second part
        const newBlock = {
          id: 'temp-id', // Will be renumbered
          content: afterContent,
          sectionId: block.sectionId,
          sectionType: block.sectionType,
          parentSectionId: block.parentSectionId,
          blockIndex: 0, // Will be renumbered
          totalBlocks: 0, // Will be renumbered
          isFirstInSection: false,
          isRendered: false
        };

        // Insert new block after current
        state.blocks.splice(blockIndex + 1, 0, newBlock);

        // Renumber blocks in the section
        state.blocks = renumberBlocksInSection(state.blocks, block.parentSectionId);

        // Set focus to new block
        const newBlockId = state.blocks[blockIndex + 1].id;
        state.focusedBlockId = newBlockId;
        state.focusCursorPosition = { blockId: newBlockId, position: 0 };
      } else {
        // Normal content update
        const block = state.blocks.find(b => b.id === blockId);
        if (block) {
          block.content = content;
        }
      }
    },

    deleteBlock: (state, action) => {
      const { blockId } = action.payload;
      if (state.blocks.length > 1) {
        state.blocks = state.blocks.filter(b => b.id !== blockId);
      }
    },

    moveBlockUp: (state, action) => {
      const { blockId } = action.payload;
      const index = state.blocks.findIndex(b => b.id === blockId);
      if (index > 0) {
        [state.blocks[index - 1], state.blocks[index]] = [state.blocks[index], state.blocks[index - 1]];
      }
    },

    moveBlockDown: (state, action) => {
      const { blockId } = action.payload;
      const index = state.blocks.findIndex(b => b.id === blockId);
      if (index < state.blocks.length - 1) {
        [state.blocks[index], state.blocks[index + 1]] = [state.blocks[index + 1], state.blocks[index]];
      }
    },

    mergeBlockUp: (state, action) => {
      const { blockId } = action.payload;
      const currentIndex = state.blocks.findIndex(b => b.id === blockId);

      if (currentIndex > 0) {
        const currentBlock = state.blocks[currentIndex];
        const previousBlock = state.blocks[currentIndex - 1];

        // Only merge if they're in the same section
        if (currentBlock.parentSectionId === previousBlock.parentSectionId) {
          // Merge content
          previousBlock.content = previousBlock.content + "\n\n" + currentBlock.content;

          // Remove current block
          state.blocks.splice(currentIndex, 1);

          // Renumber blocks in the section
          state.blocks = renumberBlocksInSection(state.blocks, currentBlock.parentSectionId);
        }
      }
    },

    mergeBlockDown: (state, action) => {
      const { blockId } = action.payload;
      const currentIndex = state.blocks.findIndex(b => b.id === blockId);

      if (currentIndex < state.blocks.length - 1) {
        const currentBlock = state.blocks[currentIndex];
        const nextBlock = state.blocks[currentIndex + 1];

        // Only merge if they're in the same section
        if (currentBlock.parentSectionId === nextBlock.parentSectionId) {
          // Merge content
          currentBlock.content = currentBlock.content + "\n\n" + nextBlock.content;

          // Remove next block
          state.blocks.splice(currentIndex + 1, 1);

          // Renumber blocks in the section
          state.blocks = renumberBlocksInSection(state.blocks, currentBlock.parentSectionId);
        }
      }
    },

    addBlockBelow: (state, action) => {
      const { blockId } = action.payload;
      const index = state.blocks.findIndex(b => b.id === blockId);

      const newBlock = {
        id: `new-${state.nextId}`,
        content: "## New Block, start editing...",
        sectionId: `new-${state.nextId}`,
        sectionType: "notes",
        parentSectionId: `new-${state.nextId}`,
        blockIndex: 0,
        totalBlocks: 1,
        isFirstInSection: true,
        isRendered: false
      };

      state.blocks.splice(index + 1, 0, newBlock);
      state.nextId += 1;
    },

    addNewBlock: (state) => {
      const newBlock = {
        id: `new-${state.nextId}`,
        content: "## New Block, start editing...",
        sectionId: `new-${state.nextId}`,
        sectionType: "notes",
        parentSectionId: `new-${state.nextId}`,
        blockIndex: 0,
        totalBlocks: 1,
        isFirstInSection: true,
        isRendered: false
      };

      state.blocks.push(newBlock);
      state.nextId += 1;
    },

    setFocusedBlock: (state, action) => {
      const { blockId, cursorPosition } = action.payload;
      state.focusedBlockId = blockId;
      state.focusCursorPosition = cursorPosition;
    },

    navigateToPreviousBlock: (state, action) => {
      const { blockId } = action.payload;
      const index = state.blocks.findIndex(b => b.id === blockId);

      if (index > 0) {
        const previousBlock = state.blocks[index - 1];
        const cursorPos = previousBlock.content.length;
        state.focusedBlockId = previousBlock.id;
        state.focusCursorPosition = { blockId: previousBlock.id, position: cursorPos };
      }
    },

    navigateToNextBlock: (state, action) => {
      const { blockId } = action.payload;
      const index = state.blocks.findIndex(b => b.id === blockId);

      if (index < state.blocks.length - 1) {
        const nextBlock = state.blocks[index + 1];
        state.focusedBlockId = nextBlock.id;
        state.focusCursorPosition = { blockId: nextBlock.id, position: 0 };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.sections = action.payload.sections;
        state.blocks = action.payload.blocks;
        state.currentFilePath = action.payload.filePath;
        // Set nextId based on loaded sections
        state.nextId = action.payload.sections.length + 1;
        state.error = null;
      })
      .addCase(loadDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(saveDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.sections = action.payload.sections;
        state.error = null;
      })
      .addCase(saveDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  updateBlockContent,
  deleteBlock,
  moveBlockUp,
  moveBlockDown,
  mergeBlockUp,
  mergeBlockDown,
  addBlockBelow,
  addNewBlock,
  setFocusedBlock,
  navigateToPreviousBlock,
  navigateToNextBlock,
} = documentSlice.actions;

// Selectors
export const selectSections = (state) => state.document.sections;
export const selectBlocks = (state) => state.document.blocks;
export const selectCurrentFilePath = (state) => state.document.currentFilePath;
export const selectFocusedBlockId = (state) => state.document.focusedBlockId;
export const selectFocusCursorPosition = (state) => state.document.focusCursorPosition;
export const selectLoading = (state) => state.document.loading;
export const selectError = (state) => state.document.error;

export default documentSlice.reducer;
