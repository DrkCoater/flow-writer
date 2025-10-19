import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { invoke } from '@tauri-apps/api/core';
import { resolveResource } from '@tauri-apps/api/path';

/**
 * Async thunk to load document sections from backend
 */
export const loadDocument = createAsyncThunk(
  'document/loadDocument',
  async (_, { rejectWithValue }) => {
    try {
      // Resolve the resource path to absolute path
      const filePath = await resolveResource('context-docs/context-example.xml');
      // Invoke Tauri backend command to load sections
      const sections = await invoke('load_sections', { filePath });
      return sections;
    } catch (error) {
      return rejectWithValue(error.message || String(error));
    }
  }
);

const initialState = {
  sections: [],
  loading: false,
  error: null,
};

const documentSlice = createSlice({
  name: 'document',
  initialState,
  reducers: {
    // Add synchronous reducers here if needed in the future
    clearError: (state) => {
      state.error = null;
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
        state.sections = action.payload;
        state.error = null;
      })
      .addCase(loadDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError } = documentSlice.actions;

// Selectors
export const selectSections = (state) => state.document.sections;
export const selectLoading = (state) => state.document.loading;
export const selectError = (state) => state.document.error;

export default documentSlice.reducer;
