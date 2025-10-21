use crate::error::Result;
use crate::models::*;
use crate::parsers::{xml_parser, mermaid_parser};
use crate::processors::variable_resolver;
use crate::serializers::xml_serializer;
use crate::validators::schema_validator;
use tokio::fs;

/// Load and parse context document from XML file
pub async fn load_context_document(file_path: &str) -> Result<ContextDocument> {
    let xml_content = fs::read_to_string(file_path).await?;

    // Validate schema before parsing
    schema_validator::validate_schema(&xml_content)?;

    let mut doc = xml_parser::parse_xml(&xml_content)?;

    // Resolve variables in sections
    let var_map = variable_resolver::build_variable_map(&doc.variables);
    variable_resolver::resolve_section_tree(&mut doc.sections, &var_map);

    Ok(doc)
}

/// Process flow graph by parsing mermaid code and enriching with click actions
pub async fn process_flow_graph(mut flow: FlowGraph) -> Result<FlowGraph> {
    // Enrich flow graph with parsed mermaid structure
    mermaid_parser::enrich_flow_graph(&mut flow)?;

    Ok(flow)
}

/// Load context document and return sections (synchronously accessible)
pub async fn load_sections(file_path: &str) -> Result<Vec<Section>> {
    let doc = load_context_document(file_path).await?;
    Ok(doc.sections)
}

/// Load context document and return flow graph (processed asynchronously)
pub async fn load_flow_graph(file_path: &str) -> Result<Option<FlowGraph>> {
    let doc = load_context_document(file_path).await?;

    if let Some(flow) = doc.flow_graph {
        let processed_flow = process_flow_graph(flow).await?;
        Ok(Some(processed_flow))
    } else {
        Ok(None)
    }
}

/// Get metadata from context document
pub async fn load_metadata(file_path: &str) -> Result<MetaData> {
    let doc = load_context_document(file_path).await?;
    Ok(doc.meta)
}

/// Save updated sections to the context document
pub async fn save_document(file_path: &str, updated_sections: Vec<Section>) -> Result<()> {
    // Load the existing document to preserve metadata, variables, and flow graph
    let mut doc = load_context_document(file_path).await?;

    // Replace sections with updated ones
    doc.sections = updated_sections;

    // Serialize to XML
    let xml_content = xml_serializer::serialize_to_xml(&doc)?;

    // Write to file
    fs::write(file_path, xml_content).await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::error::ContextError;
    use tokio;
    use std::io::Write;
    use tempfile::NamedTempFile;

    fn create_test_xml() -> String {
        r#"
<context version="1.0">
    <meta>
        <title>Test Document</title>
        <author>Test Author</author>
        <created>2025-10-09</created>
        <app name="CEC" version="0.1.0"/>
        <tags>test, doc</tags>
        <description>A test document</description>
    </meta>
    <variables>
        <var name="userName">Jeremy</var>
        <var name="goal">Ship v1</var>
    </variables>
    <sections>
        <section id="intent-1" type="intent">
            <content><![CDATA[
# Intent
User: ${userName}
Goal: ${goal}
            ]]></content>
        </section>
    </sections>
    <flow id="flow-1" version="1.0">
        <title>Test Flow</title>
        <diagram><![CDATA[
```mermaid
flowchart TD
  A[Intent] --> B[Evaluation]
  B --> C[Process]
```
        ]]></diagram>
    </flow>
</context>
        "#.to_string()
    }

    #[tokio::test]
    async fn test_load_context_document() {
        let xml_content = create_test_xml();
        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(xml_content.as_bytes()).unwrap();
        let file_path = temp_file.path().to_str().unwrap();

        let doc = load_context_document(file_path).await.unwrap();

        assert_eq!(doc.meta.title, "Test Document");
        assert_eq!(doc.meta.author, "Test Author");
        assert_eq!(doc.variables.len(), 2);
        assert_eq!(doc.sections.len(), 1);
        assert!(doc.flow_graph.is_some());
    }

    #[tokio::test]
    async fn test_load_sections() {
        let xml_content = create_test_xml();
        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(xml_content.as_bytes()).unwrap();
        let file_path = temp_file.path().to_str().unwrap();

        let sections = load_sections(file_path).await.unwrap();

        assert_eq!(sections.len(), 1);
        assert_eq!(sections[0].id, "intent-1");
        // Variables should be resolved
        assert!(sections[0].content.contains("Jeremy"));
        assert!(sections[0].content.contains("Ship v1"));
    }

    #[tokio::test]
    async fn test_load_metadata() {
        let xml_content = create_test_xml();
        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(xml_content.as_bytes()).unwrap();
        let file_path = temp_file.path().to_str().unwrap();

        let meta = load_metadata(file_path).await.unwrap();

        assert_eq!(meta.title, "Test Document");
        assert_eq!(meta.author, "Test Author");
        assert_eq!(meta.app_info.name, "CEC");
        assert_eq!(meta.tags.len(), 2);
    }

    #[tokio::test]
    async fn test_load_flow_graph() {
        let xml_content = create_test_xml();
        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(xml_content.as_bytes()).unwrap();
        let file_path = temp_file.path().to_str().unwrap();

        let flow = load_flow_graph(file_path).await.unwrap();

        assert!(flow.is_some());
        let flow = flow.unwrap();
        assert_eq!(flow.id, "flow-1");
        assert_eq!(flow.title, Some("Test Flow".to_string()));

        // Should be parsed and enriched
        assert_eq!(flow.parsed_graph.nodes.len(), 3);
        assert_eq!(flow.parsed_graph.edges.len(), 2);
    }

    #[tokio::test]
    async fn test_process_flow_graph() {
        let mermaid_code = r###"
```mermaid
flowchart TD
  A[Start] --> B[End]
  click A "#section-1" "Go to section"
```
            "###;

        let flow = FlowGraph {
            id: "test-flow".to_string(),
            version: "1.0".to_string(),
            title: Some("Test".to_string()),
            mermaid_code: mermaid_code.to_string(),
            parsed_graph: GraphStructure {
                nodes: vec![],
                edges: vec![],
            },
            node_refs: vec![],
        };

        let processed = process_flow_graph(flow).await.unwrap();

        assert_eq!(processed.parsed_graph.nodes.len(), 2);
        assert_eq!(processed.parsed_graph.edges.len(), 1);
        assert_eq!(processed.node_refs.len(), 1);
        assert_eq!(processed.node_refs[0].node_id, "A");
        assert_eq!(processed.node_refs[0].section_id, "section-1");
    }

    #[tokio::test]
    async fn test_load_document_without_flow() {
        let xml_content = r#"
<context version="1.0">
    <meta>
        <title>No Flow Document</title>
        <author>Test Author</author>
        <created>2025-10-09</created>
        <app name="CEC" version="0.1.0"/>
        <tags>test</tags>
        <description>Document without flow</description>
    </meta>
    <variables></variables>
    <sections>
        <section id="test-1" type="intent">
            <content><![CDATA[Test content]]></content>
        </section>
    </sections>
</context>
        "#;

        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(xml_content.as_bytes()).unwrap();
        let file_path = temp_file.path().to_str().unwrap();

        let flow = load_flow_graph(file_path).await.unwrap();
        assert!(flow.is_none());
    }

    #[tokio::test]
    async fn test_load_nonexistent_file() {
        let result = load_context_document("/nonexistent/file.xml").await;
        assert!(result.is_err());

        if let Err(e) = result {
            match e {
                ContextError::IoError(_) => {},
                _ => panic!("Expected IoError, got: {:?}", e),
            }
        }
    }
}
