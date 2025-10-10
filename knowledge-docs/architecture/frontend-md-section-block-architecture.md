# Frontend Markdown Section Block Architecture

## Overview

This document describes the architecture for loading XML context document sections from the Rust Tauri backend and displaying them as editable CodeMirror blocks in the React frontend.

**Design Version:** 2.0 (Flat Sections)

**Simplified Scope (MVP):**
- Load from hardcoded XML file path (`src-tauri/context-docs/context-example.xml`)
- Focus on rendering markdown sections as editable blocks only
- **All sections are flat** - no nesting allowed
- No file selection/management features
- No metadata header display (future feature)
- No flow diagram rendering (future feature)

## Related Documentation

- **[XML Schema Validation Design](./xml-schema-validation-design.md)** - Schema validation for enforcing flat structure
- **[XML File Integration](../integration/xml-file-integration.md)** - Backend API integration guide
- **[Tauri Middleware Architecture](./tauri-middleware-architecture.md)** - Overall backend design

## Current State

### Existing Components

**App.jsx**
- Manages an array of hardcoded markdown blocks
- Each block has: `id`, `content`, `isRendered`
- Provides CRUD operations: add, delete, move up/down, edit
- Uses simple integer IDs starting from 1

**MarkdownBlock.jsx**
- CodeMirror-based markdown editor
- Edit/Preview toggle using Radix Tabs
- Action buttons: Add, Move Up/Down, Delete
- "Revise" dropdown menu for AI actions (placeholder)
- ReactMarkdown for preview rendering

**Dependencies**
- `@tauri-apps/api` - Tauri API bindings (installed)
- `@uiw/react-codemirror` - CodeMirror React wrapper
- `@codemirror/lang-markdown` - Markdown language support
- `react-markdown` + `remark-gfm` - Markdown rendering
- `@radix-ui/themes` + `@radix-ui/react-icons` - UI components

### Backend API

Tauri command we'll use:
- `load_sections(filePath)` → Section[]

## Proposed Architecture

### High-Level Data Flow

```
App Mount (useEffect)
         ↓
useContextDocument Hook
  - Invoke load_sections command
  - Hardcoded file path
  - Handle loading/error states
         ↓
Section Transform Utility
  - Flatten nested sections
  - Convert Section → Block format
  - Preserve section metadata
         ↓
App Component State
  - blocks: Block[]
         ↓
UI Rendering
  - MarkdownBlock[] (sections)
```

### Component Architecture

```
App
├── Loading/Error States
└── MarkdownBlock[] (mapped from sections)
    ├── Section Type Badge
    ├── Section ID Display
    ├── CodeMirror Editor
    ├── Preview Renderer
    └── Action Buttons
```

## Data Models

### Backend Section Structure (from Rust)

```javascript
/**
 * @typedef {Object} Section
 * @property {string} id - Section ID (e.g., "intent-1")
 * @property {string} section_type - Section type (e.g., "intent", "evaluation")
 * @property {string} content - Markdown content (variables resolved)
 * @property {string|null} [ref_target] - Optional reference target
 * @property {Section[]} children - Always empty array (no nesting)
 */
```

### Frontend Block Structure (for UI)

```javascript
/**
 * @typedef {Object} Block
 * @property {string} id - Unique block ID (use section.id)
 * @property {string} content - Markdown content
 * @property {boolean} isRendered - Edit (false) or Preview (true) mode
 * @property {string} sectionId - Original section ID
 * @property {string} sectionType - Section type (intent, evaluation, etc.)
 */
```

## Key Transformations

### Section to Block Mapping

Simple 1:1 transformation from Section to Block:

```javascript
/**
 * Convert sections array to blocks array
 * @param {Section[]} sections - Array of flat sections
 * @returns {Block[]} Array of blocks
 */
function sectionsToBlocks(sections) {
  return sections.map(section => ({
    id: section.id,
    content: section.content,
    isRendered: false, // Default to edit mode
    sectionId: section.id,
    sectionType: section.section_type || section.type
  }));
}
```

**Example:**
```
Input (4 flat sections):
[
  { id: "intent-1", type: "intent", content: "..." },
  { id: "eval-1", type: "evaluation", content: "..." },
  { id: "proc-1", type: "process", content: "..." },
  { id: "alts-1", type: "alternatives", content: "..." }
]

Output (4 blocks):
[
  { id: "intent-1", sectionType: "intent", content: "...", isRendered: false, sectionId: "intent-1" },
  // ... same for all 4 sections
]
```

## State Management

### App Component State

```javascript
function App() {
  // Document data (from backend)
  const [blocks, setBlocks] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Block management (existing)
  const [nextId, setNextId] = useState(1);
}
```

### Custom Hook: useContextDocument

```javascript
/**
 * Hook to load context document from hardcoded XML file
 * @returns {Object} Document data and loading state
 */
export function useContextDocument() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDocument = async () => {
      setLoading(true);
      setError(null);

      try {
        // Hardcoded file path for MVP
        const filePath = 'src-tauri/context-docs/context-example.xml';
        const secs = await invoke('load_sections', { filePath });
        setSections(secs);
      } catch (err) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, []);

  return { sections, loading, error };
}
```

## Component Specifications

### Enhanced MarkdownBlock Component

**New Props:**
```javascript
{
  // Existing props
  id,
  content,
  isRendered,
  onContentChange,
  onToggleRender,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddBelow,
  isFirst,
  isLast,

  // New props for sections
  sectionType: string,      // "intent", "evaluation", etc.
  sectionId: string         // Original section ID (same as id)
}
```

**Section Type Styling:**
- Different badge colors per type:
  - `intent` → Blue
  - `evaluation` → Green
  - `process` → Purple
  - `alternatives` → Orange
  - `prompts` → Pink
  - `notes` → Gray

### Modified App Component

**Workflow:**

1. **On Mount:** Load sections from hardcoded XML path
2. **Loading:** Show loading spinner
3. **Loaded:** Transform sections → blocks, display UI
4. **Error:** Show error message

**Key Functions:**

```javascript
// Load document on mount
const { sections, loading, error } = useContextDocument();

useEffect(() => {
  if (sections.length > 0) {
    const transformedBlocks = sectionsToBlocks(sections);
    setBlocks(transformedBlocks);
  }
}, [sections]);

// Keep existing block management functions
const handleContentChange = (id, newContent) => { /* ... */ };
const handleAddBlock = () => { /* ... */ };
const handleDelete = (id) => { /* ... */ };
// etc.
```

## Integration Points

### Backend Integration

**Load Document:**
```javascript
import { invoke } from '@tauri-apps/api/core';

const sections = await invoke('load_sections', {
  filePath: 'src-tauri/context-docs/context-example.xml'
});
```

### Variable Resolution

Variables are already resolved by backend:
- Input: `"User: ${userName}"`
- Output: `"User: Jeremy"`

No frontend processing needed.

## File Structure

```
src/
├── App.jsx                          (MODIFY)
├── components/
│   └── MarkdownBlock.jsx           (MODIFY)
├── hooks/
│   └── useContextDocument.js       (NEW)
└── utils/
    └── sectionTransform.js         (NEW)
```

## Implementation Phases

### Phase 1: Foundation (Core Loading)
1. Create `utils/sectionTransform.js`
2. Create `hooks/useContextDocument.js`
3. Test basic loading and transformation

### Phase 2: UI Integration
4. Modify `components/MarkdownBlock.jsx` (add section metadata)
5. Modify `App.jsx` (integrate loading)
6. Test with `context-example.xml`

### Phase 3: Polish
7. Add loading states and error handling
8. Style section type badges
9. Add visual hierarchy for nested sections
10. Test edge cases (empty sections, large documents)

### Phase 4: Future Enhancements (Post-MVP)
- File selection dialog
- Document metadata header display
- Flow diagram integration
- Save functionality (blocks → XML)
- Section search/filter
- Collapse/expand nested sections

## Edge Cases & Considerations

### 1. Empty Sections

**Handling:**
- Allow empty content (valid use case)
- Show placeholder text in edit mode
- Preserve empty sections on save

### 2. Large Documents

**Optimization:**
- For MVP: assume < 50 sections
- Future: Use React virtualization for 100+ blocks

### 3. ID Conflicts

**Prevention:**
- Use section IDs from backend (guaranteed unique)
- New blocks get temporary IDs (`new-1`, `new-2`)

## Testing Strategy

### Manual Testing Checklist
- [ ] Document loads without errors on app mount
- [ ] All 4 sections appear as blocks
- [ ] Variables resolved (Jeremy, Ship the v1 Context Editor, etc.)
- [ ] Section types show with correct badges
- [ ] All sections are flat (no nesting)
- [ ] Edit mode works (CodeMirror)
- [ ] Preview mode works (ReactMarkdown)
- [ ] Content changes persist in state
- [ ] Add new block works
- [ ] Delete block works
- [ ] Move up/down works

## Success Criteria

✓ **MVP Success Criteria:**
1. Document loads automatically on app mount
2. All 4 sections load as editable blocks
3. Variables are resolved
4. Section types are visible with color-coded badges
5. All sections are flat (no nesting)
6. Edit/preview mode works
7. User can modify content
8. User can add/delete/reorder blocks
9. No console errors

## Future Roadmap

**Post-MVP Features:**
- File selection dialog
- Document metadata display
- Save functionality (blocks → XML)
- Flow diagram integration
- Section search and filter
- Collapse/expand sections
- Drag-and-drop reordering

## Conclusion

This simplified architecture focuses on the core functionality: loading a hardcoded XML document with flat sections and rendering them as editable CodeMirror blocks with a simple 1:1 mapping. No section nesting is supported, making the transformation logic straightforward. File management and metadata display are deferred to future iterations.
