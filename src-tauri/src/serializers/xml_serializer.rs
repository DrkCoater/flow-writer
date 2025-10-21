use quick_xml::events::{BytesCData, BytesDecl, BytesEnd, BytesStart, BytesText, Event};
use quick_xml::Writer;
use std::io::Cursor;
use crate::error::{ContextError, Result};
use crate::models::*;

/// Serialize a ContextDocument to XML string
pub fn serialize_to_xml(doc: &ContextDocument) -> Result<String> {
    let mut writer = Writer::new_with_indent(Cursor::new(Vec::new()), b' ', 2);

    // XML declaration
    writer.write_event(Event::Decl(BytesDecl::new("1.0", Some("UTF-8"), None)))
        .map_err(|e| ContextError::InvalidXml(e.to_string()))?;

    // Root context element
    let mut context = BytesStart::new("context");
    context.push_attribute(("version", "1.0"));
    writer.write_event(Event::Start(context))
        .map_err(|e| ContextError::InvalidXml(e.to_string()))?;

    // Write metadata
    write_metadata(&mut writer, &doc.meta)?;

    // Write variables
    write_variables(&mut writer, &doc.variables)?;

    // Write sections
    write_sections(&mut writer, &doc.sections)?;

    // Write flow graph if present
    if let Some(ref flow) = doc.flow_graph {
        write_flow(&mut writer, flow)?;
    }

    // Close context
    writer.write_event(Event::End(BytesEnd::new("context")))
        .map_err(|e| ContextError::InvalidXml(e.to_string()))?;

    let result = writer.into_inner().into_inner();
    String::from_utf8(result)
        .map_err(|e| ContextError::InvalidXml(format!("UTF-8 error: {}", e)))
}

fn write_metadata(writer: &mut Writer<Cursor<Vec<u8>>>, meta: &MetaData) -> Result<()> {
    writer.write_event(Event::Start(BytesStart::new("meta")))
        .map_err(|e| ContextError::InvalidXml(e.to_string()))?;

    // Title
    write_text_element(writer, "title", &meta.title)?;

    // Author
    write_text_element(writer, "author", &meta.author)?;

    // Created
    write_text_element(writer, "created", &meta.created)?;

    // App info
    let mut app = BytesStart::new("app");
    app.push_attribute(("name", meta.app_info.name.as_str()));
    app.push_attribute(("version", meta.app_info.version.as_str()));
    writer.write_event(Event::Empty(app))
        .map_err(|e| ContextError::InvalidXml(e.to_string()))?;

    // Tags
    let tags_str = meta.tags.join(", ");
    write_text_element(writer, "tags", &tags_str)?;

    // Description
    write_text_element(writer, "description", &meta.description)?;

    writer.write_event(Event::End(BytesEnd::new("meta")))
        .map_err(|e| ContextError::InvalidXml(e.to_string()))?;

    Ok(())
}

fn write_variables(writer: &mut Writer<Cursor<Vec<u8>>>, variables: &[Variable]) -> Result<()> {
    writer.write_event(Event::Start(BytesStart::new("variables")))
        .map_err(|e| ContextError::InvalidXml(e.to_string()))?;

    for var in variables {
        let mut var_elem = BytesStart::new("var");
        var_elem.push_attribute(("name", var.name.as_str()));
        writer.write_event(Event::Start(var_elem.clone()))
            .map_err(|e| ContextError::InvalidXml(e.to_string()))?;

        writer.write_event(Event::Text(BytesText::new(&var.value)))
            .map_err(|e| ContextError::InvalidXml(e.to_string()))?;

        writer.write_event(Event::End(BytesEnd::new("var")))
            .map_err(|e| ContextError::InvalidXml(e.to_string()))?;
    }

    writer.write_event(Event::End(BytesEnd::new("variables")))
        .map_err(|e| ContextError::InvalidXml(e.to_string()))?;

    Ok(())
}

fn write_sections(writer: &mut Writer<Cursor<Vec<u8>>>, sections: &[Section]) -> Result<()> {
    writer.write_event(Event::Start(BytesStart::new("sections")))
        .map_err(|e| ContextError::InvalidXml(e.to_string()))?;

    for section in sections {
        write_section(writer, section)?;
    }

    writer.write_event(Event::End(BytesEnd::new("sections")))
        .map_err(|e| ContextError::InvalidXml(e.to_string()))?;

    Ok(())
}

fn write_section(writer: &mut Writer<Cursor<Vec<u8>>>, section: &Section) -> Result<()> {
    let mut section_elem = BytesStart::new("section");
    section_elem.push_attribute(("id", section.id.as_str()));
    section_elem.push_attribute(("type", section.section_type.as_str()));

    if let Some(ref target) = section.ref_target {
        section_elem.push_attribute(("refTarget", target.as_str()));
    }

    writer.write_event(Event::Start(section_elem))
        .map_err(|e| ContextError::InvalidXml(e.to_string()))?;

    // Write content with CDATA
    write_cdata_element(writer, "content", &section.content)?;

    // Write children recursively
    for child in &section.children {
        write_section(writer, child)?;
    }

    writer.write_event(Event::End(BytesEnd::new("section")))
        .map_err(|e| ContextError::InvalidXml(e.to_string()))?;

    Ok(())
}

fn write_flow(writer: &mut Writer<Cursor<Vec<u8>>>, flow: &FlowGraph) -> Result<()> {
    let mut flow_elem = BytesStart::new("flow");
    flow_elem.push_attribute(("id", flow.id.as_str()));
    flow_elem.push_attribute(("version", flow.version.as_str()));

    writer.write_event(Event::Start(flow_elem))
        .map_err(|e| ContextError::InvalidXml(e.to_string()))?;

    // Write title if present
    if let Some(ref title) = flow.title {
        write_text_element(writer, "title", title)?;
    }

    // Write mermaid diagram with CDATA
    write_cdata_element(writer, "diagram", &flow.mermaid_code)?;

    writer.write_event(Event::End(BytesEnd::new("flow")))
        .map_err(|e| ContextError::InvalidXml(e.to_string()))?;

    Ok(())
}

fn write_text_element(writer: &mut Writer<Cursor<Vec<u8>>>, tag: &str, text: &str) -> Result<()> {
    writer.write_event(Event::Start(BytesStart::new(tag)))
        .map_err(|e| ContextError::InvalidXml(e.to_string()))?;

    writer.write_event(Event::Text(BytesText::new(text)))
        .map_err(|e| ContextError::InvalidXml(e.to_string()))?;

    writer.write_event(Event::End(BytesEnd::new(tag)))
        .map_err(|e| ContextError::InvalidXml(e.to_string()))?;

    Ok(())
}

fn write_cdata_element(writer: &mut Writer<Cursor<Vec<u8>>>, tag: &str, content: &str) -> Result<()> {
    writer.write_event(Event::Start(BytesStart::new(tag)))
        .map_err(|e| ContextError::InvalidXml(e.to_string()))?;

    // Write CDATA using proper CData event
    let cdata_content = format!("\n{}\n", content.trim());
    writer.write_event(Event::CData(BytesCData::new(&cdata_content)))
        .map_err(|e| ContextError::InvalidXml(e.to_string()))?;

    writer.write_event(Event::End(BytesEnd::new(tag)))
        .map_err(|e| ContextError::InvalidXml(e.to_string()))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_document() -> ContextDocument {
        ContextDocument {
            meta: MetaData {
                title: "Test Document".to_string(),
                author: "Test Author".to_string(),
                created: "2025-10-20".to_string(),
                app_info: AppInfo {
                    name: "CEC".to_string(),
                    version: "0.1.0".to_string(),
                },
                tags: vec!["test".to_string(), "doc".to_string()],
                description: "A test document".to_string(),
            },
            variables: vec![
                Variable {
                    name: "userName".to_string(),
                    value: "Jeremy".to_string(),
                }
            ],
            sections: vec![
                Section {
                    id: "intent-1".to_string(),
                    section_type: "intent".to_string(),
                    content: "# Intent\nThis is test content".to_string(),
                    ref_target: None,
                    children: vec![],
                }
            ],
            flow_graph: None,
        }
    }

    #[test]
    fn test_serialize_basic_document() {
        let doc = create_test_document();
        let xml = serialize_to_xml(&doc).unwrap();

        assert!(xml.contains("<context version=\"1.0\">"));
        assert!(xml.contains("<title>Test Document</title>"));
        assert!(xml.contains("<author>Test Author</author>"));
        assert!(xml.contains("<var name=\"userName\">Jeremy</var>"));
        assert!(xml.contains("<section id=\"intent-1\" type=\"intent\">"));
        assert!(xml.contains("CDATA"));
    }

    #[test]
    fn test_serialize_with_flow() {
        let mut doc = create_test_document();
        doc.flow_graph = Some(FlowGraph {
            id: "flow-1".to_string(),
            version: "1.0".to_string(),
            title: Some("Test Flow".to_string()),
            mermaid_code: "```mermaid\nflowchart TD\n  A --> B\n```".to_string(),
            parsed_graph: GraphStructure {
                nodes: vec![],
                edges: vec![],
            },
            node_refs: vec![],
        });

        let xml = serialize_to_xml(&doc).unwrap();

        assert!(xml.contains("<flow id=\"flow-1\" version=\"1.0\">"));
        assert!(xml.contains("<title>Test Flow</title>"));
        assert!(xml.contains("mermaid"));
    }

    #[test]
    fn test_serialize_section_with_separator() {
        let mut doc = create_test_document();
        doc.sections[0].content = "First block\n---\nSecond block".to_string();

        let xml = serialize_to_xml(&doc).unwrap();

        assert!(xml.contains("First block"));
        assert!(xml.contains("---"));
        assert!(xml.contains("Second block"));
    }
}
