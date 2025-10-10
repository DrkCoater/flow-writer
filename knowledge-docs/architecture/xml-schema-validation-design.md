# XML Schema Validation Design

## Overview

This document describes the design for XML Schema (XSD) validation of context documents on the Rust Tauri backend.

## Design Updates Summary

### Recent Changes: Flat Section Structure

**Previous Design:**
- Sections could be nested (e.g., `<section>` within `<section>`)
- Required recursive flattening in frontend
- Complex parent-child relationships

**Current Design:**
- All sections are flat (siblings at same level)
- No nesting allowed
- Simple 1:1 Section → Block mapping

**Impact:**
- **4 top-level sections** in context-example.xml:
  1. `intent-1` (intent)
  2. `eval-1` (evaluation)
  3. `proc-1` (process)
  4. `alts-1` (alternatives)

## XML Schema Validation Design

### Goals

1. **Validate structure** before parsing to catch errors early
2. **Enforce constraints** (required elements, flat sections, valid types)
3. **Provide clear error messages** for invalid documents
4. **Support schema evolution** as format changes

### Schema Location

```
src-tauri/
├── schemas/
│   └── context-document.xsd   (NEW - XML Schema Definition)
├── context-docs/
│   └── context-example.xml    (validates against schema)
└── src/
    └── validators/
        └── schema_validator.rs (NEW - Rust validation logic)
```

### XML Schema Definition (XSD)

#### High-Level Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">

  <!-- Root element -->
  <xs:element name="context" type="ContextType"/>

  <!-- Complex types -->
  <xs:complexType name="ContextType">
    <xs:sequence>
      <xs:element name="meta" type="MetaType"/>
      <xs:element name="variables" type="VariablesType"/>
      <xs:element name="sections" type="SectionsType"/>
      <xs:element name="flow" type="FlowType" minOccurs="0"/>
    </xs:sequence>
    <xs:attribute name="version" type="xs:string" use="required"/>
  </xs:complexType>

  <!-- ... more type definitions ... -->

</xs:schema>
```

#### Complete Schema Specification

**1. Context Root Element**
- Required `version` attribute
- Must contain: `<meta>`, `<variables>`, `<sections>`
- Optional: `<flow>`

**2. Meta Element**
```xml
<xs:complexType name="MetaType">
  <xs:sequence>
    <xs:element name="title" type="xs:string"/>
    <xs:element name="author" type="xs:string"/>
    <xs:element name="created" type="xs:dateTime"/>
    <xs:element name="app" type="AppInfoType"/>
    <xs:element name="tags" type="xs:string"/>
    <xs:element name="description" type="xs:string"/>
  </xs:sequence>
</xs:complexType>

<xs:complexType name="AppInfoType">
  <xs:attribute name="name" type="xs:string" use="required"/>
  <xs:attribute name="version" type="xs:string" use="required"/>
</xs:complexType>
```

**3. Variables Element**
```xml
<xs:complexType name="VariablesType">
  <xs:sequence>
    <xs:element name="var" type="VarType" minOccurs="0" maxOccurs="unbounded"/>
  </xs:sequence>
</xs:complexType>

<xs:complexType name="VarType">
  <xs:simpleContent>
    <xs:extension base="xs:string">
      <xs:attribute name="name" type="xs:string" use="required"/>
    </xs:extension>
  </xs:simpleContent>
</xs:complexType>
```

**4. Sections Element (FLAT ONLY)**
```xml
<xs:complexType name="SectionsType">
  <xs:sequence>
    <!-- Only direct section children - NO NESTING -->
    <xs:element name="section" type="FlatSectionType" minOccurs="0" maxOccurs="unbounded"/>
  </xs:sequence>
</xs:complexType>

<xs:complexType name="FlatSectionType">
  <xs:sequence>
    <!-- Only content element allowed - NO nested sections -->
    <xs:element name="content" type="xs:string"/>
  </xs:sequence>
  <xs:attribute name="id" type="xs:ID" use="required"/>
  <xs:attribute name="type" type="SectionTypeEnum" use="required"/>
  <xs:attribute name="refTarget" type="xs:string" use="optional"/>
</xs:complexType>

<!-- Section type enumeration -->
<xs:simpleType name="SectionTypeEnum">
  <xs:restriction base="xs:string">
    <xs:enumeration value="intent"/>
    <xs:enumeration value="evaluation"/>
    <xs:enumeration value="process"/>
    <xs:enumeration value="alternatives"/>
  </xs:restriction>
</xs:simpleType>
```

**5. Flow Element**
```xml
<xs:complexType name="FlowType">
  <xs:sequence>
    <xs:element name="title" type="xs:string" minOccurs="0"/>
    <xs:element name="diagram" type="xs:string"/>
  </xs:sequence>
  <xs:attribute name="id" type="xs:ID" use="required"/>
  <xs:attribute name="version" type="xs:string" use="required"/>
</xs:complexType>
```

### Validation Strategy

#### When to Validate

```
┌─────────────────────────────────────────────┐
│  User opens/loads XML file                  │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│  1. Schema Validation (NEW)                 │
│     - Validate against XSD                  │
│     - Check structure & constraints         │
│     - Return validation errors if any       │
└──────────────────┬──────────────────────────┘
                   ↓
           ┌───────────────┐
           │ Valid?        │
           └───┬───────┬───┘
               │       │
            NO │       │ YES
               │       │
               ↓       ↓
    ┌──────────────┐  ┌──────────────────────┐
    │ Return Error │  │  2. XML Parsing      │
    │ to Frontend  │  │     - Parse with     │
    └──────────────┘  │       quick-xml      │
                      │  3. Variable Resolve │
                      │  4. Return Data      │
                      └──────────────────────┘
```

#### Validation Points

1. **Pre-parse validation**: Before `xml_parser::parse_xml()`
2. **On file load**: In `flow_service::load_context_document()`
3. **Optional strict mode**: Can be disabled for development

### Rust Implementation Design

#### 1. New Error Type

```rust
// src/error.rs
#[derive(Debug, thiserror::Error)]
pub enum ContextError {
    // ... existing errors ...

    #[error("Schema validation failed: {0}")]
    SchemaValidationError(String),
}
```

#### 2. Schema Validator Module

```rust
// src/validators/schema_validator.rs

use crate::error::{ContextError, Result};

/// Validate XML content against the context document schema
pub fn validate_schema(xml_content: &str) -> Result<()> {
    // Implementation options:
    // Option A: Use xmlschema crate (if available)
    // Option B: Use external validator (xmllint)
    // Option C: Custom validation logic

    // Return Ok(()) if valid
    // Return Err(SchemaValidationError) with details if invalid
}

/// Load schema from embedded file
fn load_schema() -> &'static str {
    include_str!("../../schemas/context-document.xsd")
}
```

#### 3. Integration with Flow Service

```rust
// src/services/flow_service.rs

pub async fn load_context_document(file_path: &str) -> Result<ContextDocument> {
    let xml_content = fs::read_to_string(file_path).await?;

    // NEW: Validate schema before parsing
    schema_validator::validate_schema(&xml_content)?;

    let mut doc = xml_parser::parse_xml(&xml_content)?;

    // ... rest of existing code ...
}
```

### Validation Rules Enforced

#### Structural Rules

1. ✓ Root element must be `<context>` with `version` attribute
2. ✓ `<meta>` element is required with all child elements
3. ✓ `<variables>` element is required (can be empty)
4. ✓ `<sections>` element is required (can be empty)
5. ✓ `<flow>` element is optional

#### Section Constraints

1. ✓ **NO NESTING**: Sections cannot contain child sections
2. ✓ Section `id` must be unique (enforced by `xs:ID`)
3. ✓ Section `type` must be from allowed enum
4. ✓ Each section must have exactly one `<content>` element
5. ✓ `refTarget` attribute is optional

#### Data Type Rules

1. ✓ `created` must be valid ISO 8601 dateTime
2. ✓ Variable `name` attribute is required
3. ✓ Flow `id` and `version` attributes are required
4. ✓ All string content properly encoded

### Error Messages

#### Example Validation Errors

**Nested Section Error:**
```
Schema validation failed: Element 'section' is not expected at this location.
Section nesting is not allowed - all sections must be direct children of <sections>.
Location: Line 65, Column 7
```

**Invalid Section Type:**
```
Schema validation failed: Value 'custom-type' is not valid for attribute 'type'.
Allowed values: intent, evaluation, process, alternatives
Location: Line 52, Section ID 'proc-1'
```

**Missing Required Element:**
```
Schema validation failed: Element 'content' is required in section.
Location: Line 48, Section ID 'intent-1'
```

**Duplicate Section ID:**
```
Schema validation failed: Duplicate ID 'intent-1' found.
Section IDs must be unique across the document.
```

### Rust Crate Options

#### Option 1: xmlschema (Recommended)

**Pros:**
- Pure Rust implementation
- Good XSD support
- Fast validation

**Cons:**
- May not support all XSD features
- Relatively new crate

```toml
[dependencies]
xmlschema = "0.3"
```

#### Option 2: roxmltree + Custom Validation

**Pros:**
- We control validation logic
- Can provide custom error messages
- No external dependencies

**Cons:**
- More code to maintain
- Need to implement all XSD rules manually

```rust
// Custom validation approach
fn validate_flat_sections(sections_elem: Node) -> Result<()> {
    for section in sections_elem.children() {
        // Check for nested sections
        for child in section.children() {
            if child.tag_name().name() == "section" {
                return Err(ContextError::SchemaValidationError(
                    "Section nesting not allowed".to_string()
                ));
            }
        }
    }
    Ok(())
}
```

#### Option 3: External Validator (xmllint)

**Pros:**
- Full XSD 1.1 support
- Battle-tested

**Cons:**
- External dependency (not pure Rust)
- Requires xmllint installed on system
- Harder to distribute

```rust
use std::process::Command;

fn validate_with_xmllint(xml_path: &str, xsd_path: &str) -> Result<()> {
    let output = Command::new("xmllint")
        .arg("--noout")
        .arg("--schema")
        .arg(xsd_path)
        .arg(xml_path)
        .output()?;

    if !output.status.success() {
        return Err(ContextError::SchemaValidationError(
            String::from_utf8_lossy(&output.stderr).to_string()
        ));
    }
    Ok(())
}
```

### Testing Strategy

#### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_schema() {
        let xml = include_str!("../../context-docs/context-example.xml");
        assert!(validate_schema(xml).is_ok());
    }

    #[test]
    fn test_nested_section_rejected() {
        let xml = r#"
        <context version="1.0">
            <meta>...</meta>
            <variables></variables>
            <sections>
                <section id="s1" type="intent">
                    <content>Test</content>
                    <section id="s2" type="evaluation">  <!-- INVALID: NESTING NOT ALLOWED -->
                        <content>Nested</content>
                    </section>
                </section>
            </sections>
        </context>
        "#;
        assert!(validate_schema(xml).is_err());
    }

    #[test]
    fn test_invalid_section_type_rejected() {
        let xml = r#"...<section id="s1" type="invalid-type">..."#;
        assert!(validate_schema(xml).is_err());
    }

    #[test]
    fn test_duplicate_id_rejected() {
        let xml = r#"
        ...
        <section id="test-1" type="intent">...</section>
        <section id="test-1" type="evaluation">...</section>  <!-- DUPLICATE ID -->
        ...
        "#;
        assert!(validate_schema(xml).is_err());
    }

    #[test]
    fn test_missing_required_element() {
        let xml = r#"
        <context version="1.0">
            <variables></variables>  <!-- Missing <meta> -->
            <sections></sections>
        </context>
        "#;
        assert!(validate_schema(xml).is_err());
    }
}
```

#### Integration Tests

```rust
// tests/schema_validation_test.rs

#[tokio::test]
async fn test_load_document_with_invalid_schema() {
    let result = flow_service::load_context_document("invalid.xml").await;
    assert!(matches!(result, Err(ContextError::SchemaValidationError(_))));
}

#[tokio::test]
async fn test_load_document_with_valid_schema() {
    let result = flow_service::load_context_document("context-example.xml").await;
    assert!(result.is_ok());
}
```

### Configuration

#### Optional: Schema Validation Toggle

```rust
// src/config.rs (NEW)

pub struct ValidationConfig {
    pub enable_schema_validation: bool,
    pub strict_mode: bool,  // Fail on warnings
}

impl Default for ValidationConfig {
    fn default() -> Self {
        Self {
            enable_schema_validation: true,
            strict_mode: false,
        }
    }
}
```

### Performance Considerations

1. **Caching**: Load XSD schema once at startup, not per validation
2. **Async validation**: Run validation in background thread
3. **Skip in dev mode**: Optional flag to disable for faster iteration
4. **Schema compilation**: Pre-compile schema if using xmlschema crate

### Migration Path

#### Phase 1: Schema Creation
1. Create `context-document.xsd` with flat section constraint
2. Validate against `context-example.xml`
3. Document all validation rules

#### Phase 2: Validator Implementation
1. Add `schema_validator.rs` module
2. Implement validation function
3. Add comprehensive tests

#### Phase 3: Integration
1. Integrate into `flow_service::load_context_document()`
2. Update error handling
3. Add integration tests

#### Phase 4: Polish
1. Improve error messages
2. Add schema version checking
3. Performance optimization

## Benefits

### Developer Experience

1. **Early error detection**: Catch structural errors before parsing
2. **Clear constraints**: XSD documents allowed structure
3. **Better error messages**: Point to exact location and issue
4. **Documentation**: Schema serves as format specification

### System Reliability

1. **Data integrity**: Ensure all documents follow same structure
2. **No surprises**: Frontend can rely on validated structure
3. **Future-proof**: Easy to evolve schema with version tracking

### Maintenance

1. **Single source of truth**: XSD defines the format
2. **Automated testing**: Validate test fixtures automatically
3. **Tooling support**: XSD editors can validate in IDE

## Open Questions

1. **Crate selection**: Which Rust XSD validation crate to use?
   - Recommendation: Start with custom validation (Option 2) for MVP
   - Migrate to xmlschema crate if needed for complex scenarios

2. **Schema version**: Should we version the schema separately?
   - Recommendation: Use `context[@version]` attribute for now
   - Add `schema-version` attribute if schemas diverge

3. **Backward compatibility**: How to handle old documents?
   - Recommendation: Parse `version` attribute first
   - Apply different schemas based on version

4. **Performance impact**: How much overhead does validation add?
   - Recommendation: Measure and add toggle if > 100ms overhead

## Recommendation

**For MVP:**
- Implement Option 2 (Custom Validation)
- Focus on critical rules:
  1. No nested sections
  2. Required elements present
  3. Valid section types
  4. Unique section IDs
- Add comprehensive tests
- Keep validation simple and fast

**Post-MVP:**
- Consider xmlschema crate for full XSD support
- Add schema versioning
- Performance optimization
- Schema evolution strategy

## Summary

This design adds robust XML schema validation to the Rust backend:
- ✅ Enforces flat section structure (no nesting)
- ✅ Validates required elements and attributes
- ✅ Provides clear error messages
- ✅ Serves as format documentation
- ✅ Easy to test and maintain

The schema acts as a contract between the backend and frontend, ensuring all documents follow the expected structure before any processing occurs.
