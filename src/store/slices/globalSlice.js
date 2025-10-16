import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  theme: 'dark',
  isEditing: true,
  isPreviewing: false,
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
    setEditing: (state) => {
      state.isEditing = true;
      state.isPreviewing = false;
    },
    setPreviewing: (state) => {
      state.isEditing = false;
      state.isPreviewing = true;
    },
  },
});

export const { toggleTheme, setTheme, setEditing, setPreviewing } = globalSlice.actions;

export const selectTheme = (state) => state.global.theme;
export const selectIsEditing = (state) => state.global.isEditing;
export const selectIsPreviewing = (state) => state.global.isPreviewing;

export default globalSlice.reducer;
