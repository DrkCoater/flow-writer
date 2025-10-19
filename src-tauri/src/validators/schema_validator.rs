use crate::error::{ContextError, Result};
use std::collections::HashSet;

/// Valid section types according to schema
const VALID_SECTION_TYPES: &[&str] = &["intent", "evaluation", "process", "alternatives"];

/// Validate XML content against context document schema
///
/// Validates:
/// 1. No nested sections (flat structure only)
/// 2. Required elements present (meta, variables, sections)
/// 3. Valid section types
/// 4. Unique section IDs
pub fn validate_schema(xml_content: &str) -> Result<()> {
    // Parse XML for validation
    let doc = roxmltree::Document::parse(xml_content)
        .map_err(|e| ContextError::SchemaValidationError(format!("XML parsing failed: {}", e)))?;

    let root = doc.root_element();

    // Validate root element
    if root.tag_name().name() != "context" {
        return Err(ContextError::SchemaValidationError(
            "Root element must be 'context'".to_string(),
        ));
    }

    // Validate required elements
    validate_required_elements(&root)?;

    // Validate sections
    if let Some(sections_elem) = root
        .children()
        .find(|n| n.is_element() && n.tag_name().name() == "sections")
    {
        validate_sections(&sections_elem)?;
    }

    Ok(())
}

/// Validate that all required elements are present
fn validate_required_elements(root: &roxmltree::Node) -> Result<()> {
    let required = vec!["meta", "variables", "sections"];

    for req in required {
        let found = root
            .children()
            .any(|n| n.is_element() && n.tag_name().name() == req);

        if !found {
            return Err(ContextError::SchemaValidationError(format!(
                "Required element '{}' is missing",
                req
            )));
        }
    }

    // Validate meta has required children
    if let Some(meta) = root
        .children()
        .find(|n| n.is_element() && n.tag_name().name() == "meta")
    {
        validate_meta(&meta)?;
    }

    Ok(())
}

/// Validate meta element structure
fn validate_meta(meta: &roxmltree::Node) -> Result<()> {
    let required = vec!["title", "author", "created", "app", "tags", "description"];

    for req in required {
        let found = meta
            .children()
            .any(|n| n.is_element() && n.tag_name().name() == req);

        if !found {
            return Err(ContextError::SchemaValidationError(format!(
                "Required meta element '{}' is missing",
                req
            )));
        }
    }

    // Validate app element has required attributes
    if let Some(app) = meta
        .children()
        .find(|n| n.is_element() && n.tag_name().name() == "app")
    {
        if !app.has_attribute("name") {
            return Err(ContextError::SchemaValidationError(
                "App element must have 'name' attribute".to_string(),
            ));
        }
        if !app.has_attribute("version") {
            return Err(ContextError::SchemaValidationError(
                "App element must have 'version' attribute".to_string(),
            ));
        }
    }

    Ok(())
}

/// Validate sections structure
fn validate_sections(sections_elem: &roxmltree::Node) -> Result<()> {
    let mut section_ids = HashSet::new();

    for section in sections_elem
        .children()
        .filter(|n| n.is_element() && n.tag_name().name() == "section")
    {
        // Validate section has required attributes
        let id = section
            .attribute("id")
            .ok_or_else(|| {
                ContextError::SchemaValidationError(
                    "Section must have 'id' attribute".to_string(),
                )
            })?;

        let section_type = section
            .attribute("type")
            .ok_or_else(|| {
                ContextError::SchemaValidationError(format!(
                    "Section '{}' must have 'type' attribute",
                    id
                ))
            })?;

        // Validate section type is valid
        if !VALID_SECTION_TYPES.contains(&section_type) {
            return Err(ContextError::SchemaValidationError(format!(
                "Section '{}' has invalid type '{}'. Allowed types: {}",
                id,
                section_type,
                VALID_SECTION_TYPES.join(", ")
            )));
        }

        // Check for duplicate IDs
        if !section_ids.insert(id.to_string()) {
            return Err(ContextError::SchemaValidationError(format!(
                "Duplicate section ID '{}' found. Section IDs must be unique.",
                id
            )));
        }

        // Validate section has content element
        let has_content = section
            .children()
            .any(|n| n.is_element() && n.tag_name().name() == "content");

        if !has_content {
            return Err(ContextError::SchemaValidationError(format!(
                "Section '{}' must have a 'content' element",
                id
            )));
        }

        // CRITICAL: Check for nested sections (NOT ALLOWED)
        let has_nested_section = section
            .children()
            .any(|n| n.is_element() && n.tag_name().name() == "section");

        if has_nested_section {
            return Err(ContextError::SchemaValidationError(format!(
                "Section '{}' contains nested sections. Section nesting is not allowed - all sections must be direct children of <sections>.",
                id
            )));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_document() {
        let xml = r#"
        <context version="1.0">
            <meta>
                <title>Test</title>
                <author>Author</author>
                <created>2025-10-09T20:20:32+00:00</created>
                <app name="CEC" version="0.1.0"/>
                <tags>test</tags>
                <description>Test doc</description>
            </meta>
            <variables></variables>
            <sections>
                <section id="intent-1" type="intent">
                    <content>Intent content</content>
                </section>
            </sections>
        </context>
        "#;

        assert!(validate_schema(xml).is_ok());
    }

    #[test]
    fn test_missing_required_element() {
        let xml = r#"
        <context version="1.0">
            <variables></variables>
            <sections></sections>
        </context>
        "#;

        let result = validate_schema(xml);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Required element 'meta' is missing"));
    }

    #[test]
    fn test_invalid_section_type() {
        let xml = r#"
        <context version="1.0">
            <meta>
                <title>Test</title>
                <author>Author</author>
                <created>2025-10-09T20:20:32+00:00</created>
                <app name="CEC" version="0.1.0"/>
                <tags>test</tags>
                <description>Test</description>
            </meta>
            <variables></variables>
            <sections>
                <section id="test-1" type="invalid-type">
                    <content>Content</content>
                </section>
            </sections>
        </context>
        "#;

        let result = validate_schema(xml);
        assert!(result.is_err());
        let err_msg = result.unwrap_err().to_string();
        assert!(err_msg.contains("invalid type 'invalid-type'"));
        assert!(err_msg.contains("intent, evaluation, process, alternatives"));
    }

    #[test]
    fn test_duplicate_section_ids() {
        let xml = r#"
        <context version="1.0">
            <meta>
                <title>Test</title>
                <author>Author</author>
                <created>2025-10-09T20:20:32+00:00</created>
                <app name="CEC" version="0.1.0"/>
                <tags>test</tags>
                <description>Test</description>
            </meta>
            <variables></variables>
            <sections>
                <section id="test-1" type="intent">
                    <content>Content 1</content>
                </section>
                <section id="test-1" type="evaluation">
                    <content>Content 2</content>
                </section>
            </sections>
        </context>
        "#;

        let result = validate_schema(xml);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Duplicate section ID 'test-1'"));
    }

    #[test]
    fn test_nested_section_rejected() {
        let xml = r#"
        <context version="1.0">
            <meta>
                <title>Test</title>
                <author>Author</author>
                <created>2025-10-09T20:20:32+00:00</created>
                <app name="CEC" version="0.1.0"/>
                <tags>test</tags>
                <description>Test</description>
            </meta>
            <variables></variables>
            <sections>
                <section id="parent-1" type="intent">
                    <content>Parent content</content>
                    <section id="child-1" type="evaluation">
                        <content>Child content</content>
                    </section>
                </section>
            </sections>
        </context>
        "#;

        let result = validate_schema(xml);
        assert!(result.is_err());
        let err_msg = result.unwrap_err().to_string();
        assert!(err_msg.contains("contains nested sections"));
        assert!(err_msg.contains("Section nesting is not allowed"));
    }

    #[test]
    fn test_section_missing_content() {
        let xml = r#"
        <context version="1.0">
            <meta>
                <title>Test</title>
                <author>Author</author>
                <created>2025-10-09T20:20:32+00:00</created>
                <app name="CEC" version="0.1.0"/>
                <tags>test</tags>
                <description>Test</description>
            </meta>
            <variables></variables>
            <sections>
                <section id="test-1" type="intent">
                </section>
            </sections>
        </context>
        "#;

        let result = validate_schema(xml);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("must have a 'content' element"));
    }

    #[test]
    fn test_section_missing_id() {
        let xml = r#"
        <context version="1.0">
            <meta>
                <title>Test</title>
                <author>Author</author>
                <created>2025-10-09T20:20:32+00:00</created>
                <app name="CEC" version="0.1.0"/>
                <tags>test</tags>
                <description>Test</description>
            </meta>
            <variables></variables>
            <sections>
                <section type="intent">
                    <content>Content</content>
                </section>
            </sections>
        </context>
        "#;

        let result = validate_schema(xml);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Section must have 'id' attribute"));
    }

    #[test]
    fn test_all_valid_section_types() {
        for section_type in VALID_SECTION_TYPES {
            let xml = format!(
                r#"
                <context version="1.0">
                    <meta>
                        <title>Test</title>
                        <author>Author</author>
                        <created>2025-10-09T20:20:32+00:00</created>
                        <app name="CEC" version="0.1.0"/>
                        <tags>test</tags>
                        <description>Test</description>
                    </meta>
                    <variables></variables>
                    <sections>
                        <section id="test-1" type="{}">
                            <content>Content</content>
                        </section>
                    </sections>
                </context>
                "#,
                section_type
            );

            assert!(
                validate_schema(&xml).is_ok(),
                "Section type '{}' should be valid",
                section_type
            );
        }
    }
}
