import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  theme: 'dark',
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
  },
});

export const { toggleTheme, setTheme } = globalSlice.actions;

export const selectTheme = (state) => state.global.theme;

export default globalSlice.reducer;
