import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  theme: 'dark',
  isEditing: true,
  isPreviewing: false,
  isSyncScrollEnabled: false,
};

const globalSlice = createSlice({
  name: 'global',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    toggleEditing: (state) => {
      state.isEditing = !state.isEditing;
    },
    togglePreviewing: (state) => {
      state.isPreviewing = !state.isPreviewing;
    },
    toggleSyncScroll: (state) => {
      state.isSyncScrollEnabled = !state.isSyncScrollEnabled;
    },
  },
});

export const { toggleTheme, setTheme, toggleEditing, togglePreviewing, toggleSyncScroll } = globalSlice.actions;

export const selectTheme = (state) => state.global.theme;
export const selectIsEditing = (state) => state.global.isEditing;
export const selectIsPreviewing = (state) => state.global.isPreviewing;
export const selectIsSyncScrollEnabled = (state) => state.global.isSyncScrollEnabled;

export default globalSlice.reducer;
