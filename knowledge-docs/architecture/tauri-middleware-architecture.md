# Flow Writer - XML Context Parser Architecture

## Overview

This document outlines the architecture for parsing XML context documents and serving both markdown sections and flow graph data to the frontend. The system operates on two parallel tracks:

1. **Markdown Sections**: Parsed synchronously and served to CodeMirror editor blocks
2. **Flow Graph**: Parsed asynchronously on a separate thread, validated, and rendered independently

All content is extracted from XML with CDATA sections, variables are resolved, and data is returned in JSON format optimized for the frontend.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                             │
│                                                                     │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────────────┐ │
│  │   App.jsx    │   │ MarkdownBlock│   │  FlowGraphEditor       │ │
│  │ (State Mgmt) │──▶│  Component   │   │  Component             │ │
│  └──────┬───────┘   └──────────────┘   └────────┬───────────────┘ │
│         │                                        │                 │
│         │ invoke('load_sections')                │                 │
│         │                                        │                 │
│         │                   invoke('load_flow_graph') (async)     │
│         ▼                                        ▼                 │
└─────────┼────────────────────────────────────────┼─────────────────┘
          │                                        │
          │                                        │
┌─────────┼────────────────────────────────────────┼─────────────────┐
│         │         Rust Tauri Backend             │                 │
│         │                                        │                 │
│         ▼                                        ▼                 │
│  ┌──────────────┐                       ┌──────────────────┐      │
│  │ THREAD 1     │                       │ THREAD 2 (Async) │      │
│  │ Sync Ops     │                       │ Flow Graph Ops   │      │
│  └──────┬───────┘                       └─────────┬────────┘      │
│         │                                         │                │
│         │                                         │                │
│  ┌──────▼──────────┐                   ┌──────────▼──────────┐    │
│  │ section_parser  │                   │  mermaid_parser     │    │
│  │ section_service │                   │  flow_service       │    │
│  └──────┬──────────┘                   └──────────┬──────────┘    │
│         │                                         │                │
│         └────────────┬────────────────────────────┘                │
│                      │                                             │
│                      ▼                                             │
│              ┌───────────────┐                                     │
│              │   models/     │                                     │
│              │ - document    │                                     │
│              │ - section     │                                     │
│              │ - flow_graph  │                                     │
│              └───────┬───────┘                                     │
│                      │                                             │
│                      ▼                                             │
│              ┌───────────────┐                                     │
│              │  processors/  │                                     │
│              │ - resolver    │                                     │
│              │ - validator   │                                     │
│              └───────────────┘                                     │
└─────────────────────────────────────────────────────────────────────┘
                      │
                      ▼
          ┌───────────────────────────┐
          │     File System           │
          │ src-tauri/context-docs/   │
          │   └── context-example.xml │
          └───────────────────────────┘
```

## Data Flow

### 1. Dual-Track Request Flow

```
Frontend Initial Load
    │
    ├────────────────────────┬─────────────────────────┐
    │                        │                         │
    ▼ (Fast)                 ▼ (Async)                 ▼
load_sections()      load_flow_graph()           load_meta()
    │                        │                         │
    ▼                        ▼                         ▼
Parse Sections      Parse Flow Graph           Parse Metadata
(Sync - Main)       (Async - Tokio Task)      (Sync - Main)
    │                        │                         │
    ▼                        ▼                         ▼
Resolve Variables   Parse Mermaid Code    Return Meta + Vars
    │               Extract Graph
    │               Validate References
    │                        │
    ▼                        ▼
Return JSON         Return JSON
(Sections)          (FlowGraph)
    │                        │
    └────────────┬───────────┘
                 ▼
         Frontend Renders Both
```

### 2. Data Transformation Pipeline

```
XML Input (with CDATA sections)
    ↓
┌───────────────┴────────────────┐
│                                │
▼                                ▼
Sections Path                Flow Graph Path
    ↓                            ↓
Extract type != "flow"      Extract type == "flow"
    ↓                            ↓
Section Structs             CDATA Content
    ↓                            ↓
Resolve Variables           Extract Mermaid Code
    ↓                            ↓
JSON Response               Parse Mermaid Syntax
(sections array)                 ↓
                            Build Graph Structure
                                 ↓
                            Validate Node References
                                 ↓
                            JSON Response
                            (flowGraph object)
```

## Module Breakdown

### 1. models/ - Data Structures

**Purpose**: Define type-safe data models for the entire context document system.

#### models/document.rs
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextDocument {
    pub meta: MetaData,
    pub variables: Vec<Variable>,
    pub sections: Vec<Section>,
    pub flow_graph: Option<FlowGraph>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetaData {
    pub title: String,
    pub author: String,
    pub created: String,
    pub app_info: AppInfo,
    pub tags: Vec<String>,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Variable {
    pub name: String,
    pub value: String,
}
```

#### models/section.rs
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Section {
    pub id: String,
    #[serde(rename = "type")]
    pub section_type: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ref_target: Option<String>,
    #[serde(default)]
    pub children: Vec<Section>,
}
```

#### models/flow_graph.rs
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlowGraph {
    pub id: String,
    pub mermaid_code: String,
    pub parsed_graph: GraphStructure,
    pub node_refs: Vec<NodeReference>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphStructure {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphNode {
    pub id: String,
    pub label: String,
    pub node_type: NodeType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ref_section_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NodeType {
    Rectangle,
    RoundEdges,
    Stadium,
    Subroutine,
    Cylindrical,
    Circle,
    Asymmetric,
    Rhombus,
    Hexagon,
    Parallelogram,
    Trapezoid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphEdge {
    pub from: String,
    pub to: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeReference {
    pub node_id: String,
    pub section_id: String,
    pub click_action: String,
    pub tooltip: Option<String>,
}
```

**Responsibilities**:
- Serde serialization/deserialization
- Type-safe data representation
- Clear separation between sections and flow graph
- Optional field handling with `skip_serializing_if`

### 2. parsers/ - Parsing Logic

#### parsers/xml_parser.rs

**Purpose**: Core XML parsing and CDATA extraction.

**Key Functions**:
```rust
pub fn parse_xml(xml_content: &str) -> Result<ContextDocument, ParseError>
pub fn extract_meta(root: &XmlNode) -> Result<MetaData, ParseError>
pub fn extract_variables(root: &XmlNode) -> Result<Vec<Variable>, ParseError>
pub fn extract_all_sections(root: &XmlNode) -> Result<(Vec<Section>, Option<FlowGraph>), ParseError>
```

**Strategy**:
- Use `quick-xml` for fast XML parsing
- Handle CDATA sections properly
- Separate sections from flow graph during initial parse
- Preserve nested section hierarchy

#### parsers/section_parser.rs

**Purpose**: Extract and process markdown sections.

**Key Functions**:
```rust
pub fn parse_section(node: &XmlNode) -> Result<Section, ParseError>
pub fn parse_nested_sections(parent: &XmlNode) -> Result<Vec<Section>, ParseError>
pub fn extract_cdata_content(node: &XmlNode) -> Result<String, ParseError>
```

**Filtering Logic**:
```rust
// Only parse sections where type != "flow"
pub fn is_content_section(section_type: &str) -> bool {
    section_type != "flow"
}
```

#### parsers/mermaid_parser.rs

**Purpose**: Parse mermaid flowchart syntax into structured graph data.

**Key Functions**:
```rust
pub fn parse_mermaid(mermaid_code: &str) -> Result<GraphStructure, ParseError>
pub fn extract_mermaid_from_cdata(content: &str) -> Result<String, ParseError>
pub fn parse_nodes(code: &str) -> Result<Vec<GraphNode>, ParseError>
pub fn parse_edges(code: &str) -> Result<Vec<GraphEdge>, ParseError>
pub fn parse_click_actions(code: &str) -> Result<Vec<NodeReference>, ParseError>
```

**Parsing Strategy**:
```rust
// Extract mermaid code from markdown code block
let mermaid_code = extract_mermaid_from_cdata(cdata_content)?;

// Parse flowchart declaration (direction is always TD, not stored)
// flowchart TD

// Parse node definitions with regex patterns:
// A[Intent] -> GraphNode { id: "A", label: "Intent", node_type: Rectangle }
// B(Evaluation) -> GraphNode { id: "B", label: "Evaluation", node_type: RoundEdges }

// Parse edges:
// A --> B -> GraphEdge { from: "A", to: "B", label: None }
// C -->|Alt A| D -> GraphEdge { from: "C", to: "D", label: Some("Alt A") }

// Parse click actions:
// click A "#intent-1" "Jump to Intent"
// -> NodeReference { node_id: "A", section_id: "intent-1", click_action: "#intent-1", tooltip: Some("Jump to Intent") }
```

**Regex Patterns**:
```rust
// Node patterns
const NODE_RECTANGLE: &str = r"(\w+)\[([^\]]+)\]";
const NODE_ROUND: &str = r"(\w+)\(([^)]+)\)";
const NODE_STADIUM: &str = r"(\w+)\(\[([^\]]+)\]\)";
// ... etc for all node types

// Edge patterns
const EDGE_ARROW: &str = r"(\w+)\s*-->\s*(\w+)";
const EDGE_LABELED: &str = r"(\w+)\s*-->\|([^|]+)\|\s*(\w+)";

// Click action pattern
const CLICK_ACTION: &str = r#"click\s+(\w+)\s+"([^"]+)"\s*(?:"([^"]+)")?"#;
```

### 3. processors/ - Data Processing

#### processors/variable_resolver.rs

**Purpose**: Replace `${variableName}` placeholders with actual values.

**Key Functions**:
```rust
pub fn resolve_variables(
    content: &str,
    variables: &HashMap<String, String>
) -> String

pub fn build_variable_map(
    variables: &[Variable]
) -> HashMap<String, String>

pub fn resolve_section_tree(
    sections: &mut [Section],
    var_map: &HashMap<String, String>
)
```

**Resolution Strategy**:
- Use regex pattern: `\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}`
- Single-pass replacement for performance
- Apply to both section content and nested children
- Keep original if variable not found (or optionally error)

#### processors/flow_validator.rs

**Purpose**: Validate flow graph structure and references.

**Key Functions**:
```rust
pub fn validate_flow_graph(
    flow: &FlowGraph,
    sections: &[Section]
) -> Result<ValidationResult, ValidationError>

pub fn validate_node_references(
    node_refs: &[NodeReference],
    sections: &[Section]
) -> Vec<ValidationIssue>

pub fn validate_graph_connectivity(
    graph: &GraphStructure
) -> Vec<ValidationIssue>
```

**Validation Rules**:
- All node references must point to existing section IDs
- Graph should be connected (no orphaned nodes)
- No duplicate node IDs
- No self-referencing edges
- Click actions reference valid section anchors

#### processors/flow_transformer.rs

**Purpose**: Transform flow graph for frontend rendering.

**Key Functions**:
```rust
pub fn enrich_graph_with_metadata(
    graph: &mut GraphStructure,
    sections: &[Section],
    variables: &HashMap<String, String>
)

pub fn build_node_references(
    graph: &GraphStructure
) -> Vec<NodeReference>
```

### 4. services/ - Business Logic Layer

#### services/section_service.rs

**Purpose**: CRUD operations for markdown sections (synchronous).

**Key Functions**:
```rust
pub fn load_sections(path: &str) -> Result<Vec<Section>, ServiceError>
pub fn update_section(id: &str, content: String) -> Result<(), ServiceError>
pub fn create_section(section: Section) -> Result<String, ServiceError>
pub fn delete_section(id: &str) -> Result<(), ServiceError>
pub fn reorder_sections(order: Vec<String>) -> Result<(), ServiceError>
```

#### services/flow_service.rs

**Purpose**: Flow graph operations (asynchronous).

**Key Functions**:
```rust
use tokio::sync::RwLock;
use std::sync::Arc;

pub struct FlowGraphService {
    cache: Arc<RwLock<Option<FlowGraph>>>,
}

impl FlowGraphService {
    pub async fn load_and_parse(&self, path: &str) -> Result<FlowGraph, ServiceError> {
        // 1. Read XML asynchronously
        let xml = tokio::fs::read_to_string(path).await?;

        // 2. Extract flow section
        let flow_section = self.extract_flow_section(&xml)?;

        // 3. Extract mermaid code from CDATA
        let mermaid_code = extract_mermaid_from_cdata(&flow_section.content)?;

        // 4. Parse graph structure (CPU-intensive, use spawn_blocking)
        let graph_structure = tokio::task::spawn_blocking(move || {
            MermaidParser::parse(&mermaid_code)
        }).await??;

        // 5. Build complete flow graph
        let flow_graph = FlowGraph {
            id: flow_section.id,
            mermaid_code: mermaid_code.clone(),
            parsed_graph: graph_structure.clone(),
            node_refs: build_node_references(&graph_structure),
        };

        // 6. Cache for future requests
        *self.cache.write().await = Some(flow_graph.clone());

        Ok(flow_graph)
    }

    pub async fn update(&self, new_code: String) -> Result<FlowGraph, ServiceError> {
        // Parse and validate new mermaid code
        let graph_structure = tokio::task::spawn_blocking(move || {
            MermaidParser::parse(&new_code)
        }).await??;

        let flow_graph = FlowGraph {
            id: "flow-1".to_string(),
            mermaid_code: new_code,
            parsed_graph: graph_structure.clone(),
            node_refs: build_node_references(&graph_structure),
        };

        *self.cache.write().await = Some(flow_graph.clone());

        Ok(flow_graph)
    }

    pub async fn validate(
        &self,
        flow: &FlowGraph,
        sections: &[Section]
    ) -> ValidationResult {
        validate_flow_graph(flow, sections)
    }
}
```

### 5. error.rs - Error Handling

**Purpose**: Centralized error types for all operations.

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContextError {
    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("Invalid XML structure: {0}")]
    InvalidXml(String),

    #[error("Missing required field: {0}")]
    MissingRequiredField(String),

    #[error("Variable resolution error: {0}")]
    VariableResolutionError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Mermaid parsing error: {0}")]
    MermaidParseError(String),

    #[error("Graph validation error: {0}")]
    ValidationError(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Async task error: {0}")]
    AsyncError(String),
}
```

### 6. lib.rs - Tauri Commands

**Purpose**: Expose Rust functions to frontend via Tauri IPC.

```rust
use tauri::State;
use tokio::sync::RwLock;
use std::sync::Arc;

// Shared state
pub struct AppState {
    sections: RwLock<Vec<Section>>,
    flow_service: Arc<FlowGraphService>,
    variables: RwLock<HashMap<String, String>>,
}

// SYNCHRONOUS COMMANDS (Thread 1 - Main)

#[tauri::command]
fn load_sections(
    state: State<'_, AppState>,
    path: String
) -> Result<String, String> {
    // Fast, synchronous parsing
    let xml_content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let doc = xml_parser::parse_xml(&xml_content)
        .map_err(|e| format!("Failed to parse XML: {}", e))?;

    // Filter sections (exclude flow)
    let sections: Vec<Section> = doc.sections.into_iter()
        .filter(|s| s.section_type != "flow")
        .collect();

    // Resolve variables
    let var_map = build_variable_map(&doc.variables);
    let mut resolved_sections = sections;
    resolve_section_tree(&mut resolved_sections, &var_map);

    // Update state
    *state.sections.blocking_write() = resolved_sections.clone();
    *state.variables.blocking_write() = var_map;

    // Return JSON
    serde_json::to_string_pretty(&resolved_sections)
        .map_err(|e| format!("Serialization error: {}", e))
}

#[tauri::command]
fn update_section(
    state: State<'_, AppState>,
    id: String,
    content: String
) -> Result<(), String> {
    let mut sections = state.sections.blocking_write();

    // Find and update section
    if let Some(section) = sections.iter_mut().find(|s| s.id == id) {
        section.content = content;
        Ok(())
    } else {
        Err(format!("Section not found: {}", id))
    }
}

// ASYNCHRONOUS COMMANDS (Thread 2 - Tokio Runtime)

#[tauri::command]
async fn load_flow_graph(
    state: State<'_, AppState>,
    path: String
) -> Result<String, String> {
    // Async parsing and processing
    let flow_graph = state.flow_service
        .load_and_parse(&path)
        .await
        .map_err(|e| format!("Failed to load flow graph: {}", e))?;

    serde_json::to_string_pretty(&flow_graph)
        .map_err(|e| format!("Serialization error: {}", e))
}

#[tauri::command]
async fn update_flow_graph(
    state: State<'_, AppState>,
    mermaid_code: String,
    validate: bool
) -> Result<String, String> {
    // Update and optionally validate
    let flow_graph = state.flow_service
        .update(mermaid_code)
        .await
        .map_err(|e| format!("Failed to update flow graph: {}", e))?;

    if validate {
        let sections = state.sections.read().await;
        let validation = state.flow_service
            .validate(&flow_graph, &sections)
            .await;

        if !validation.is_valid {
            return Err(format!("Validation failed: {:?}", validation.issues));
        }
    }

    serde_json::to_string_pretty(&flow_graph)
        .map_err(|e| format!("Serialization error: {}", e))
}

#[tauri::command]
async fn validate_flow_references(
    state: State<'_, AppState>
) -> Result<String, String> {
    let flow_service = &state.flow_service;
    let sections = state.sections.read().await;

    if let Some(flow) = flow_service.cache.read().await.as_ref() {
        let validation = flow_service.validate(flow, &sections).await;
        serde_json::to_string_pretty(&validation)
            .map_err(|e| format!("Serialization error: {}", e))
    } else {
        Err("No flow graph loaded".to_string())
    }
}

// Application setup
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            sections: RwLock::new(Vec::new()),
            flow_service: Arc::new(FlowGraphService::new()),
            variables: RwLock::new(HashMap::new()),
        })
        .invoke_handler(tauri::generate_handler![
            load_sections,
            update_section,
            load_flow_graph,
            update_flow_graph,
            validate_flow_references,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## Dependencies

### Cargo.toml

```toml
[dependencies]
# Tauri core
tauri = { version = "2", features = [] }
tauri-plugin-opener = "2"

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# XML parsing
quick-xml = { version = "0.36", features = ["serialize"] }

# Regex for pattern matching
regex = "1.11"

# Async runtime
tokio = { version = "1", features = ["full"] }

# Error handling
thiserror = "1.0"
```

## JSON Response Format

### Sections Response

```json
{
  "sections": [
    {
      "id": "intent-1",
      "type": "intent",
      "content": "# Intent\nWe aim to **Ship the v1 Context Editor** by **2025-11-01** for **Jeremy**.\n\n**Why now?**\n- Consolidate context engineering practices into one workspace.\n- Enable per-block AI actions (revise, tone, grammar, query).",
      "refTarget": null,
      "children": []
    },
    {
      "id": "proc-1",
      "type": "process",
      "content": "## Process\n1. **Audit current authoring UX**\n2. **Implement editor blocks**",
      "refTarget": "intent-1 eval-1",
      "children": [
        {
          "id": "alts-1",
          "type": "alternatives",
          "content": "### Alternatives\n- **A.** Zustand store\n- **B.** Jotai atoms",
          "refTarget": null,
          "children": []
        }
      ]
    }
  ]
}
```

### Flow Graph Response

```json
{
  "flowGraph": {
    "id": "flow-1",
    "mermaidCode": "flowchart TD\n  A[Intent] --> B[Evaluation]\n  B --> C[Process]\n  C -->|Alt A| D[Alternative A]\n  C -->|Alt B| E[Alternative B]\n  click A \"#intent-1\" \"Jump to Intent\"\n  click B \"#eval-1\" \"Jump to Evaluation\"\n  click C \"#proc-1\" \"Jump to Process\"",
    "parsedGraph": {
      "nodes": [
        {
          "id": "A",
          "label": "Intent",
          "nodeType": "rectangle",
          "refSectionId": "intent-1"
        },
        {
          "id": "B",
          "label": "Evaluation",
          "nodeType": "rectangle",
          "refSectionId": "eval-1"
        },
        {
          "id": "C",
          "label": "Process",
          "nodeType": "rectangle",
          "refSectionId": "proc-1"
        },
        {
          "id": "D",
          "label": "Alternative A",
          "nodeType": "rectangle",
          "refSectionId": null
        },
        {
          "id": "E",
          "label": "Alternative B",
          "nodeType": "rectangle",
          "refSectionId": null
        }
      ],
      "edges": [
        {
          "from": "A",
          "to": "B",
          "label": null
        },
        {
          "from": "B",
          "to": "C",
          "label": null
        },
        {
          "from": "C",
          "to": "D",
          "label": "Alt A"
        },
        {
          "from": "C",
          "to": "E",
          "label": "Alt B"
        }
      ]
    },
    "nodeRefs": [
      {
        "nodeId": "A",
        "sectionId": "intent-1",
        "clickAction": "#intent-1",
        "tooltip": "Jump to Intent"
      },
      {
        "nodeId": "B",
        "sectionId": "eval-1",
        "clickAction": "#eval-1",
        "tooltip": "Jump to Evaluation"
      },
      {
        "nodeId": "C",
        "sectionId": "proc-1",
        "clickAction": "#proc-1",
        "tooltip": "Jump to Process"
      }
    ]
  }
}
```

## Frontend Integration

### API Service Layer

```javascript
// services/sectionService.js
import { invoke } from '@tauri-apps/api/core';

export async function loadSections(filePath) {
  const jsonString = await invoke('load_sections', { path: filePath });
  return JSON.parse(jsonString);
}

export async function updateSection(id, content) {
  await invoke('update_section', { id, content });
}

// services/flowGraphService.js
export async function loadFlowGraph(filePath) {
  const jsonString = await invoke('load_flow_graph', { path: filePath });
  return JSON.parse(jsonString);
}

export async function updateFlowGraph(mermaidCode, validate = true) {
  const jsonString = await invoke('update_flow_graph', {
    mermaid_code: mermaidCode,
    validate
  });
  return JSON.parse(jsonString);
}

export async function validateFlowReferences() {
  const jsonString = await invoke('validate_flow_references');
  return JSON.parse(jsonString);
}
```

### React State Management

```javascript
// App.jsx
import { useState, useEffect } from 'react';
import { loadSections, updateSection } from './services/sectionService';
import { loadFlowGraph, updateFlowGraph } from './services/flowGraphService';

function App() {
  const [sections, setSections] = useState([]);
  const [flowGraph, setFlowGraph] = useState(null);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [isLoadingFlow, setIsLoadingFlow] = useState(false);

  useEffect(() => {
    const filePath = 'src-tauri/context-docs/context-example.xml';

    // Load sections (fast, synchronous)
    setIsLoadingSections(true);
    loadSections(filePath)
      .then(data => {
        setSections(data.sections);
        setIsLoadingSections(false);
      })
      .catch(error => {
        console.error('Failed to load sections:', error);
        setIsLoadingSections(false);
      });

    // Load flow graph (async, may take longer)
    setIsLoadingFlow(true);
    loadFlowGraph(filePath)
      .then(data => {
        setFlowGraph(data.flowGraph);
        setIsLoadingFlow(false);
      })
      .catch(error => {
        console.error('Failed to load flow graph:', error);
        setIsLoadingFlow(false);
      });
  }, []);

  const handleSectionUpdate = async (id, content) => {
    await updateSection(id, content);
    // Update local state
    setSections(prev => prev.map(s =>
      s.id === id ? { ...s, content } : s
    ));
  };

  const handleFlowUpdate = async (mermaidCode) => {
    try {
      const result = await updateFlowGraph(mermaidCode, true);
      setFlowGraph(result.flowGraph);
    } catch (error) {
      console.error('Flow graph validation failed:', error);
    }
  };

  return (
    <Theme appearance="dark">
      <Flex direction="column" gap="4" style={{ padding: '40px' }}>
        {/* Sections Editor */}
        <div>
          {isLoadingSections ? (
            <Spinner />
          ) : (
            sections.map(section => (
              <MarkdownBlock
                key={section.id}
                section={section}
                onUpdate={handleSectionUpdate}
              />
            ))
          )}
        </div>

        {/* Flow Graph Editor */}
        <div>
          {isLoadingFlow ? (
            <Spinner />
          ) : flowGraph ? (
            <FlowGraphEditor
              flowGraph={flowGraph}
              onUpdate={handleFlowUpdate}
            />
          ) : null}
        </div>
      </Flex>
    </Theme>
  );
}
```

### Flow Graph Component

```javascript
// components/FlowGraphEditor.jsx
import { useState, useEffect } from 'react';
import { Tabs, Button, Flex } from '@radix-ui/themes';
import CodeMirror from '@uiw/react-codemirror';
import mermaid from 'mermaid';

export function FlowGraphEditor({ flowGraph, onUpdate }) {
  const [code, setCode] = useState(flowGraph.mermaidCode);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: true, theme: 'dark' });
  }, []);

  const handleUpdate = async (newCode) => {
    setCode(newCode);
    setIsValidating(true);

    try {
      await onUpdate(newCode);
      setValidationErrors([]);
    } catch (error) {
      setValidationErrors([error.message]);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="flow-graph-editor">
      <Tabs.Root defaultValue="preview">
        <Tabs.List>
          <Tabs.Trigger value="edit">Edit Flow</Tabs.Trigger>
          <Tabs.Trigger value="preview">Preview</Tabs.Trigger>
          <Tabs.Trigger value="structure">Graph Structure</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="edit">
          <CodeMirror
            value={code}
            height="400px"
            theme="dark"
            onChange={handleUpdate}
          />
          {isValidating && <Spinner />}
          {validationErrors.map(error => (
            <ErrorBanner key={error}>{error}</ErrorBanner>
          ))}
        </Tabs.Content>

        <Tabs.Content value="preview">
          <div className="mermaid">
            {code}
          </div>
        </Tabs.Content>

        <Tabs.Content value="structure">
          <pre>
            {JSON.stringify(flowGraph.parsedGraph, null, 2)}
          </pre>
        </Tabs.Content>
      </Tabs.Root>

      {/* Show node references */}
      <div className="node-references">
        <h3>Node References</h3>
        {flowGraph.nodeRefs.map(ref => (
          <div key={ref.nodeId}>
            {ref.nodeId} → {ref.sectionId}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Threading & Concurrency

### Thread Model

```
Main Thread (Tauri)
├── Synchronous Commands
│   ├── load_sections()
│   ├── update_section()
│   └── Fast operations
│
└── Tokio Async Runtime
    ├── Async Commands
    │   ├── load_flow_graph()
    │   ├── update_flow_graph()
    │   └── validate_flow_references()
    │
    └── Spawn Blocking Tasks
        └── CPU-intensive mermaid parsing
```

### State Synchronization

```rust
// Shared state with RwLock for concurrent access
pub struct AppState {
    sections: RwLock<Vec<Section>>,        // Multiple readers, single writer
    flow_service: Arc<FlowGraphService>,   // Arc for shared ownership
    variables: RwLock<HashMap<String, String>>,
}

// Read pattern (multiple concurrent readers)
let sections = state.sections.read().await;

// Write pattern (exclusive access)
let mut sections = state.sections.write().await;
sections.push(new_section);
```

## Testing Strategy

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_mermaid_nodes() {
        let code = "flowchart TD\n  A[Intent] --> B[Evaluation]";
        let graph = MermaidParser::parse(code).unwrap();

        assert_eq!(graph.nodes.len(), 2);
        assert_eq!(graph.nodes[0].id, "A");
        assert_eq!(graph.nodes[0].label, "Intent");
    }

    #[test]
    fn test_parse_labeled_edges() {
        let code = "C -->|Alt A| D";
        let edges = parse_edges(code).unwrap();

        assert_eq!(edges[0].label, Some("Alt A".to_string()));
    }

    #[test]
    fn test_variable_resolution() {
        let content = "Goal: ${goal}";
        let mut vars = HashMap::new();
        vars.insert("goal".to_string(), "Ship v1".to_string());

        let result = resolve_variables(content, &vars);
        assert_eq!(result, "Goal: Ship v1");
    }

    #[tokio::test]
    async fn test_flow_service_load() {
        let service = FlowGraphService::new();
        let flow = service.load_and_parse("test.xml").await;

        assert!(flow.is_ok());
    }
}
```

### Integration Tests

```rust
#[tokio::test]
async fn test_full_document_parse() {
    let path = "context-docs/context-example.xml";

    // Load sections
    let sections = load_sections(path).unwrap();
    assert!(!sections.is_empty());
    assert!(sections.iter().all(|s| s.section_type != "flow"));

    // Load flow graph
    let flow = load_flow_graph(path).await.unwrap();
    assert!(flow.parsed_graph.nodes.len() > 0);

    // Validate references
    let validation = validate_flow_references(&flow, &sections);
    assert!(validation.is_valid);
}
```

## Performance Considerations

1. **Dual-Track Loading**: Sections load fast (sync), flow graph processes in background (async)
2. **Caching**: FlowGraphService caches parsed graph to avoid re-parsing
3. **Spawn Blocking**: CPU-intensive mermaid parsing runs on blocking thread pool
4. **Zero-Copy**: `quick-xml` uses zero-copy parsing where possible
5. **Lazy Evaluation**: Flow graph only parsed when requested

## Security Considerations

1. **Path Validation**: Validate and sanitize file paths
2. **XML Limits**: Set max depth and size limits for XML parsing
3. **Regex Safety**: Use non-backtracking regex patterns
4. **State Isolation**: Each document has isolated state

## File Structure

```
src-tauri/
├── Cargo.toml
├── src/
│   ├── main.rs
│   ├── lib.rs
│   ├── error.rs
│   ├── models/
│   │   ├── mod.rs
│   │   ├── document.rs
│   │   ├── section.rs
│   │   └── flow_graph.rs
│   ├── parsers/
│   │   ├── mod.rs
│   │   ├── xml_parser.rs
│   │   ├── section_parser.rs
│   │   └── mermaid_parser.rs
│   ├── processors/
│   │   ├── mod.rs
│   │   ├── variable_resolver.rs
│   │   ├── flow_validator.rs
│   │   └── flow_transformer.rs
│   └── services/
│       ├── mod.rs
│       ├── section_service.rs
│       └── flow_service.rs
├── context-docs/
│   └── context-example.xml
└── tests/
    ├── unit/
    │   ├── parser_tests.rs
    │   ├── resolver_tests.rs
    │   └── validator_tests.rs
    └── integration/
        └── full_document_test.rs
```

## Implementation Phases

### Phase 1: Foundation (Models & Basic Parsing)
- Set up project structure with modules
- Create all data models (document, section, flow_graph)
- Implement basic XML parsing
- Extract CDATA content
- Unit tests for models and basic parsing

### Phase 2: Section Pipeline (Sync Operations)
- Implement section_parser
- Implement variable_resolver
- Create section_service
- Add synchronous Tauri commands
- Integration tests for section loading

### Phase 3: Flow Graph Pipeline (Async Operations)
- Implement mermaid_parser (regex-based)
- Create flow_service with async support
- Add flow_validator
- Implement async Tauri commands
- Unit tests for mermaid parsing

### Phase 4: Integration & Validation
- Connect all modules
- Implement cross-reference validation
- Add comprehensive error handling
- Integration tests for full workflow
- Performance optimization

### Phase 5: Frontend Integration
- Create API service layer
- Build FlowGraphEditor component
- Implement state management
- Add validation UI feedback
- End-to-end testing

## Success Metrics

- ✅ Parse sections synchronously in <100ms
- ✅ Parse flow graph asynchronously in <500ms
- ✅ Validate all node references correctly
- ✅ Resolve all variables in content
- ✅ Support nested sections properly
- ✅ Handle concurrent updates safely
- ✅ Unit test coverage >80%
- ✅ Zero data loss on updates
- ✅ Graceful error handling throughout

## Design Notes

1. **Direction Field Omitted**: Flow direction is always top-down (TD), so we don't store it
2. **Separate Threads**: Sections use sync ops, flow graph uses async for responsiveness
3. **Frontend Rendering**: Mermaid rendering happens in frontend with mermaid.js
4. **Validation**: Backend validates structure, frontend shows errors
5. **Caching**: Flow graph cached after parsing to improve performance
