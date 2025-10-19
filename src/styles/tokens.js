// Color palette tokens using Radix UI CSS variables
// These automatically adapt between light and dark themes

export const colors = {
  background: {
    base: 'var(--gray-1)',
    elevated: 'var(--gray-2)',
    hover: 'var(--gray-3)',
    active: 'var(--gray-4)',
    panel: 'var(--color-panel-translucent)',
    surface: 'var(--color-surface)',
  },

  border: {
    subtle: 'var(--gray-5)',
    default: 'var(--gray-6)',
    emphasis: 'var(--gray-7)',
  },

  text: {
    primary: 'var(--gray-12)',
    secondary: 'var(--gray-11)',
    tertiary: 'var(--gray-10)',
  },

  accent: {
    background: 'var(--accent-3)',
    border: 'var(--accent-6)',
    solid: 'var(--accent-9)',
    text: 'var(--accent-11)',
  },
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
};

export const radii = {
  sm: '3px',
  md: '4px',
  lg: '8px',
};

export const zIndices = {
  toolbar: 1000,
  modal: 2000,
  tooltip: 3000,
};
