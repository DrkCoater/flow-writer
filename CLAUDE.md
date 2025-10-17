# Project Documentation

## Architecture References

- [Tauri Middleware Architecture](knowledge-docs/architecture/tauri-middleware-architecture.md) - Comprehensive architecture for parsing XML context documents and serving markdown sections to the frontend's CodeMirror editor

## Development Guidelines

### Test-Driven Development (TDD)

This project follows Test-Driven Development practices:

1. **Write Tests First** - Write failing tests before implementing features
2. **Red-Green-Refactor Cycle**:
   - RED: Write a failing test
   - GREEN: Write minimal code to make it pass
   - REFACTOR: Improve code while keeping tests green
3. **Test Coverage** - Aim for >80% test coverage
4. **Unit Tests** - Test individual functions and modules in isolation
5. **Integration Tests** - Test full workflows (XML parsing → JSON output)

### Rust Testing Strategy

- Place unit tests in the same file as the code using `#[cfg(test)]` modules
- Place integration tests in `src-tauri/tests/` directory
- Use `cargo test` to run all tests
- Use `cargo test --test integration_test` to run specific integration tests

### Frontend Development

- Use `pnpm` instead of `npm`
- Use **JavaScript/JSX** (not TypeScript) for React components
- Use **SCSS** and `@emotion/styled` styled component for styling, do not use Tailwind CSS
- Use Redux with Redux Toolkit for global state management
- Follow functional components with hooks pattern

## React Scrollbar Issue - Height Constraint Solution

### Problem
ReactMarkdown component not showing scrollbar even with `overflow-y: scroll` set.

### Root Cause
**Missing height constraints on parent containers.** Without proper height constraints flowing from the root down to the scrollable container, containers will grow to fit their content instead of creating a fixed-height scrolling area.

### Solution
Ensure height constraints flow through the component hierarchy:

```
html, body, #root → 100% height
  ↓
AppContainer → height: 100%, overflow: hidden
  ↓
PanelWrapper → height: 100%, overflow-y: scroll
  ↓
Content (ScrollableRoot) → min-height: 100% (can grow beyond parent)
```

### Key Requirements

1. **Parent Container (`AppContainer`)**:
   - `height: 100%` - Constrains to viewport
   - `overflow: hidden` - Prevents outer scrolling

2. **Scrollable Container (`PanelWrapper`)**:
   - `height: 100%` - Fixed height from parent
   - `overflow-y: scroll` - Forces scrollbar to always show (not `auto`)
   - Custom scrollbar styling with `::-webkit-scrollbar` and `scrollbar-color`

3. **Content Container (`ScrollableRoot`)**:
   - `min-height: 100%` - Can grow beyond parent to trigger overflow
   - `box-sizing: border-box` - Includes padding in height calculation

### Why `overflow: auto` Doesn't Work
- `auto` only shows scrollbar when content overflows
- If parent has no height constraint, it grows with content
- No overflow occurs, so no scrollbar appears
- `scroll` forces the scrollbar to always be visible

### Critical Changes Made
1. Changed `PanelWrapper` from `overflow: auto` to `overflow-y: scroll` to ensure scrollbar is always visible.
2. Ensured `PanelsContainer` has `flex: 1` and `overflow: hidden` to provide height constraint
3. Ensured `ContentArea` has `flex: 1` and `overflow: hidden` to fill remaining space after Toolbar
4. **CRITICAL: Styled the Theme component with height: 100%** - The Radix UI Theme component breaks the height chain if not styled!

### Key Insight
The height constraint chain must be unbroken:
- `ThemeWrapper` (styled Theme): `height: 100%`, `display: block` ⭐ **CRITICAL FIX**
- `AppContainer`: `height: 100%` (from root)
- `ContentArea`: `flex: 1` (fills remaining space after Toolbar)
- `PanelsContainer`: `flex: 1` (fills ContentArea)
- `PanelWrapper`: `height: 100%` (fills PanelsContainer) + `overflow-y: scroll`

If any container in this chain loses its height constraint, the scrollbar will disappear.

### Theme Component Fix
```jsx
const ThemeWrapper = styled(Theme)`
  height: 100%;
  width: 100%;
  display: block;
`;

return (
  <ThemeWrapper appearance={theme}>
    <AppContainer>
      {/* content */}
    </AppContainer>
  </ThemeWrapper>
);
```

**The Radix UI Theme component does not pass through height by default and breaks the CSS height chain. It must be styled with emotion/styled-components to maintain height: 100%.**

**Date:** October 16, 2025
