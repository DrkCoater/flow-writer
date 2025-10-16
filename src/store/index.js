import { configureStore } from '@reduxjs/toolkit';
import globalReducer from './slices/globalSlice';
import documentReducer from './slices/documentSlice';

export const store = configureStore({
  reducer: {
    global: globalReducer,
    document: documentReducer,
  },
});
