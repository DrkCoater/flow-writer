import { configureStore } from '@reduxjs/toolkit';
import globalReducer from './slices/globalSlice';

export const store = configureStore({
  reducer: {
    global: globalReducer,
  },
});
