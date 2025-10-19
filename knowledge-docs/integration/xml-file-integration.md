# XML File Integration Guide

This document describes how the React frontend should integrate with the Rust Tauri backend to load and process XML context documents.

## Overview

The Tauri backend exposes three async commands for interacting with XML context documents:
- `load_metadata` - Load document metadata
- `load_sections` - Load all sections with resolved variables
- `load_flow_graph` - Load and parse the Mermaid flow graph

All commands are async and return JSON-serialized data structures.

## Prerequisites

```bash
pnpm add @tauri-apps/api
```

## Data Structures

The backend returns JSON objects with the following structures. Use JSDoc comments for type hints:

```javascript
/**
 * @typedef {Object} AppInfo
 * @property {string} name - Application name
 * @property {string} version - Application version
 */

/**
 * @typedef {Object} MetaData
 * @property {string} title - Document title
 * @property {string} author - Author name
 * @property {string} created - Creation date
 * @property {AppInfo} app_info - Application info
 * @property {string[]} tags - Array of tags
 * @property {string} description - Document description
 */

/**
 * @typedef {Object} Section
 * @property {string} id - Section ID
 * @property {string} type - Section type
 * @property {string} content - Section content (Markdown)
 * @property {string|null} [refTarget] - Optional reference target
 * @property {Section[]} children - Nested child sections
 */

/**
 * @typedef {'rectangle'|'roundedges'|'stadium'|'subroutine'|'cylindrical'|'circle'|'asymmetric'|'rhombus'|'hexagon'|'parallelogram'|'trapezoid'} NodeType
 */

/**
 * @typedef {Object} GraphNode
 * @property {string} id - Node ID
 * @property {string} label - Node label
 * @property {NodeType} nodeType - Node shape type
 * @property {string|null} [ref_section_id] - Optional linked section ID
 */

/**
 * @typedef {Object} GraphEdge
 * @property {string} from - Source node ID
 * @property {string} to - Target node ID
 * @property {string|null} [label] - Optional edge label
 */

/**
 * @typedef {Object} GraphStructure
 * @property {GraphNode[]} nodes - Array of graph nodes
 * @property {GraphEdge[]} edges - Array of graph edges
 */

/**
 * @typedef {Object} NodeReference
 * @property {string} node_id - Node ID
 * @property {string} section_id - Linked section ID
 * @property {string} click_action - Click action (usually section anchor)
 * @property {string|null} [tooltip] - Optional tooltip text
 */

/**
 * @typedef {Object} FlowGraph
 * @property {string} id - Flow graph ID
 * @property {string} version - Flow graph version
 * @property {string|null} [title] - Optional flow graph title
 * @property {string} mermaid_code - Raw mermaid code
 * @property {GraphStructure} parsed_graph - Parsed graph structure
 * @property {NodeReference[]} node_refs - Click action references
 */
```

## API Reference

### 1. Load Metadata

Loads document metadata (title, author, tags, etc.).

**Command**: `load_metadata`

**Parameters**:
- `filePath` (string) - Absolute path to the XML context file

**Returns**: `MetaData` object

**Example**:

```javascript
import { invoke } from '@tauri-apps/api/core';

/**
 * Load document metadata
 * @param {string} filePath - Path to XML file
 * @returns {Promise<MetaData>} Document metadata
 */
async function loadDocumentMetadata(filePath) {
  try {
    const metadata = await invoke('load_metadata', {
      filePath: filePath
    });

    console.log('Document Title:', metadata.title);
    console.log('Author:', metadata.author);
    console.log('Tags:', metadata.tags.join(', '));

    return metadata;
  } catch (error) {
    console.error('Failed to load metadata:', error);
    throw error;
  }
}
```

### 2. Load Sections

Loads all document sections with variables resolved.

**Command**: `load_sections`

**Parameters**:
- `filePath` (string) - Absolute path to the XML context file

**Returns**: Array of `Section` objects

**Example**:

```javascript
import { invoke } from '@tauri-apps/api/core';

/**
 * Load all document sections
 * @param {string} filePath - Path to XML file
 * @returns {Promise<Section[]>} Array of sections
 */
async function loadDocumentSections(filePath) {
  try {
    const sections = await invoke('load_sections', {
      filePath: filePath
    });

    console.log(`Loaded ${sections.length} sections`);

    // Access nested sections
    sections.forEach(section => {
      console.log(`Section: ${section.id} (${section.type})`);
      if (section.children.length > 0) {
        console.log(`  Has ${section.children.length} child sections`);
      }
    });

    return sections;
  } catch (error) {
    console.error('Failed to load sections:', error);
    throw error;
  }
}
```

### 3. Load Flow Graph

Loads and parses the Mermaid flow graph with enriched node references.

**Command**: `load_flow_graph`

**Parameters**:
- `filePath` (string) - Absolute path to the XML context file

**Returns**: `FlowGraph` object or `null`

**Example**:

```javascript
import { invoke } from '@tauri-apps/api/core';

/**
 * Load flow graph from document
 * @param {string} filePath - Path to XML file
 * @returns {Promise<FlowGraph|null>} Flow graph or null if not present
 */
async function loadDocumentFlowGraph(filePath) {
  try {
    const flowGraph = await invoke('load_flow_graph', {
      filePath: filePath
    });

    if (!flowGraph) {
      console.log('No flow graph in document');
      return null;
    }

    console.log('Flow Graph ID:', flowGraph.id);
    console.log('Nodes:', flowGraph.parsed_graph.nodes.length);
    console.log('Edges:', flowGraph.parsed_graph.edges.length);
    console.log('Click Actions:', flowGraph.node_refs.length);

    return flowGraph;
  } catch (error) {
    console.error('Failed to load flow graph:', error);
    throw error;
  }
}
```

## React Integration

### Custom Hooks

Create reusable hooks for loading document data:

```javascript
// hooks/useContextDocument.js
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

/**
 * Custom hook for loading context document
 * @param {string|null} filePath - Path to XML file
 * @returns {Object} Document data and loading state
 */
export function useContextDocument(filePath) {
  const [metadata, setMetadata] = useState(null);
  const [sections, setSections] = useState([]);
  const [flowGraph, setFlowGraph] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!filePath) {
      return;
    }

    const loadDocument = async () => {
      setLoading(true);
      setError(null);

      try {
        // Load all data in parallel
        const [meta, secs, flow] = await Promise.all([
          invoke('load_metadata', { filePath }),
          invoke('load_sections', { filePath }),
          invoke('load_flow_graph', { filePath })
        ]);

        setMetadata(meta);
        setSections(secs);
        setFlowGraph(flow);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [filePath]);

  return { metadata, sections, flowGraph, loading, error };
}
```

### Component Example

Complete component using the custom hook:

```jsx
// components/DocumentViewer.jsx
import React from 'react';
import { useContextDocument } from '../hooks/useContextDocument';
import { MarkdownRenderer } from './MarkdownRenderer';
import { FlowDiagram } from './FlowDiagram';

/**
 * Document viewer component
 * @param {Object} props
 * @param {string} props.filePath - Path to XML document
 */
export function DocumentViewer({ filePath }) {
  const { metadata, sections, flowGraph, loading, error } = useContextDocument(filePath);

  if (loading) {
    return <div className="loading">Loading document...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!metadata) {
    return <div>No document loaded</div>;
  }

  return (
    <div className="document-viewer">
      {/* Metadata Header */}
      <header className="document-header">
        <h1>{metadata.title}</h1>
        <div className="metadata">
          <span>Author: {metadata.author}</span>
          <span>Created: {new Date(metadata.created).toLocaleDateString()}</span>
          <div className="tags">
            {metadata.tags.map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        </div>
        <p className="description">{metadata.description}</p>
      </header>

      {/* Flow Diagram */}
      {flowGraph && (
        <section className="flow-section">
          <h2>{flowGraph.title || 'Document Flow'}</h2>
          <FlowDiagram flowGraph={flowGraph} />
        </section>
      )}

      {/* Sections */}
      <div className="sections">
        {sections.map(section => (
          <SectionView key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}

/**
 * Recursive section component
 * @param {Object} props
 * @param {Section} props.section - Section data
 * @param {number} [props.level=0] - Nesting level
 */
function SectionView({ section, level = 0 }) {
  return (
    <section id={section.id} className={`section level-${level}`}>
      <div className="section-header">
        <span className="section-type">{section.type}</span>
        <span className="section-id">{section.id}</span>
      </div>

      <div className="section-content">
        <MarkdownRenderer content={section.content} />
      </div>

      {section.children.length > 0 && (
        <div className="section-children">
          {section.children.map(child => (
            <SectionView key={child.id} section={child} level={level + 1} />
          ))}
        </div>
      )}
    </section>
  );
}
```

## Advanced Usage

### File Selection with Tauri Dialog

Use Tauri's file dialog to let users select XML files:

```javascript
import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';

/**
 * Open file dialog to select XML file
 * @returns {Promise<string|null>} File path or null
 */
async function selectContextFile() {
  const selected = await open({
    multiple: false,
    filters: [{
      name: 'Context XML',
      extensions: ['xml']
    }]
  });

  if (selected) {
    return selected.path;
  }
  return null;
}

/**
 * File selector component
 */
function FileSelector() {
  const [filePath, setFilePath] = useState(null);

  const handleSelectFile = async () => {
    const path = await selectContextFile();
    if (path) {
      setFilePath(path);
    }
  };

  return (
    <div>
      <button onClick={handleSelectFile}>Open Context File</button>
      {filePath && <DocumentViewer filePath={filePath} />}
    </div>
  );
}
```

### Rendering Flow Graphs

Use a Mermaid renderer to display the parsed flow graph:

```jsx
// components/FlowDiagram.jsx
import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

/**
 * Flow diagram component using Mermaid
 * @param {Object} props
 * @param {FlowGraph} props.flowGraph - Flow graph data
 */
export function FlowDiagram({ flowGraph }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize mermaid
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose'
    });

    // Render the mermaid diagram
    mermaid.render('mermaid-diagram', flowGraph.mermaid_code)
      .then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      });
  }, [flowGraph.mermaid_code]);

  return (
    <div className="flow-diagram">
      <div ref={containerRef} />

      {/* Display parsed graph metadata */}
      <div className="graph-stats">
        <span>{flowGraph.parsed_graph.nodes.length} nodes</span>
        <span>{flowGraph.parsed_graph.edges.length} edges</span>
        <span>{flowGraph.node_refs.length} click actions</span>
      </div>
    </div>
  );
}
```

### Click Action Handling

Handle click actions from the flow diagram to navigate to sections:

```javascript
// utils/flowNavigation.js

/**
 * Setup click handlers for flow diagram nodes
 * @param {NodeReference[]} nodeRefs - Array of node references
 * @param {Function} onNodeClick - Callback for node clicks
 */
export function setupFlowClickHandlers(nodeRefs, onNodeClick) {
  // Create a map of node IDs to section IDs
  const nodeToSection = new Map(
    nodeRefs.map(ref => [ref.node_id, ref.section_id])
  );

  // Add click handlers to SVG elements
  nodeRefs.forEach(ref => {
    const element = document.querySelector(`[id*="${ref.node_id}"]`);
    if (element) {
      element.addEventListener('click', () => {
        onNodeClick(ref.section_id);
      });
      element.style.cursor = 'pointer';
    }
  });
}

// Usage in component
import { useEffect } from 'react';
import { setupFlowClickHandlers } from '../utils/flowNavigation';

function DocumentViewer({ filePath }) {
  const { flowGraph } = useContextDocument(filePath);

  const handleNodeClick = (sectionId) => {
    // Scroll to section
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (flowGraph) {
      setupFlowClickHandlers(flowGraph.node_refs, handleNodeClick);
    }
  }, [flowGraph]);

  // ... rest of component
}
```

### Variable Display

Show which variables were resolved in a section:

```jsx
// components/VariableInfo.jsx
import React from 'react';

/**
 * Display variable information
 * @param {Object} props
 * @param {string} props.content - Content to check for variables
 */
export function VariableInfo({ content }) {
  // Variables should already be resolved in content
  // This just shows which patterns were present
  const variablePattern = /\$\{([^}]+)\}/g;
  const originalVars = [...content.matchAll(variablePattern)];

  if (originalVars.length === 0) {
    return null;
  }

  return (
    <div className="variable-info">
      <span>Variables used: </span>
      {originalVars.map((match, i) => (
        <code key={i}>{match[1]}</code>
      ))}
    </div>
  );
}
```

## Error Handling

### Comprehensive Error Handling

```javascript
import { invoke } from '@tauri-apps/api/core';

/**
 * Safely load document with detailed error handling
 * @param {string} filePath - Path to XML file
 * @returns {Promise<Object>} Result object with success flag
 */
async function safeLoadDocument(filePath) {
  try {
    const metadata = await invoke('load_metadata', { filePath });
    return { success: true, data: metadata };
  } catch (error) {
    if (typeof error === 'string') {
      // Parse Rust error messages
      if (error.includes('No such file')) {
        return {
          success: false,
          error: { type: 'file_not_found', path: filePath }
        };
      } else if (error.includes('Invalid XML')) {
        return {
          success: false,
          error: { type: 'invalid_xml', message: error }
        };
      }
    }

    return {
      success: false,
      error: {
        type: 'unknown',
        message: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

// Usage
const result = await safeLoadDocument('/path/to/file.xml');
if (result.success) {
  console.log('Metadata:', result.data);
} else {
  switch (result.error.type) {
    case 'file_not_found':
      console.error('File not found:', result.error.path);
      break;
    case 'invalid_xml':
      console.error('Invalid XML:', result.error.message);
      break;
    default:
      console.error('Unknown error:', result.error.message);
  }
}
```

## Best Practices

1. **Parallel Loading**: Load metadata, sections, and flow graph in parallel using `Promise.all()`
2. **Error Boundaries**: Wrap document components in React error boundaries
3. **Memoization**: Use `useMemo` for expensive operations on large section trees
4. **Loading States**: Always show loading indicators for async operations
5. **JSDoc Comments**: Use comprehensive JSDoc comments for function parameters and return values
6. **Path Handling**: Always use absolute paths when calling Tauri commands
7. **Cleanup**: Remove event listeners when components unmount
8. **Validation**: Validate file paths before invoking commands

## Testing

### Example Test

```javascript
import { invoke } from '@tauri-apps/api/core';
import { describe, it, expect, vi } from 'vitest';

describe('Document Loading', () => {
  it('should load metadata successfully', async () => {
    const mockMetadata = {
      title: 'Test Document',
      author: 'Test Author',
      created: '2025-10-09',
      app_info: { name: 'CEC', version: '0.1.0' },
      tags: ['test'],
      description: 'Test description'
    };

    vi.mocked(invoke).mockResolvedValueOnce(mockMetadata);

    const result = await invoke('load_metadata', {
      filePath: '/path/to/test.xml'
    });

    expect(result).toEqual(mockMetadata);
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(invoke).mockRejectedValueOnce('File not found');

    await expect(
      invoke('load_metadata', { filePath: '/invalid/path.xml' })
    ).rejects.toBe('File not found');
  });
});
```

## Summary

The Tauri backend provides a clean, async API for loading and processing XML context documents:

- **`load_metadata`**: Get document metadata
- **`load_sections`**: Get all sections with variables resolved
- **`load_flow_graph`**: Get parsed Mermaid flow graph

All commands:
- Are async and return Promises
- Accept a `filePath` parameter
- Return structured JSON data
- Throw errors that can be caught with try/catch
- Use JSDoc comments for type documentation

Use React hooks and components with JavaScript/JSX to create a seamless integration between the Rust backend and React frontend.
