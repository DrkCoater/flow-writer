use quick_xml::events::Event;
use quick_xml::Reader;
use crate::error::{ContextError, Result};
use crate::models::*;

pub fn parse_xml(xml_content: &str) -> Result<ContextDocument> {
    let mut reader = Reader::from_str(xml_content);
    reader.config_mut().trim_text(true);

    let mut meta: Option<MetaData> = None;
    let mut variables: Vec<Variable> = Vec::new();
    let mut sections: Vec<Section> = Vec::new();
    let mut flow_graph: Option<FlowGraph> = None;

    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                match e.name().as_ref() {
                    b"meta" => {
                        meta = Some(parse_meta(&mut reader)?);
                    }
                    b"variables" => {
                        variables = parse_variables(&mut reader)?;
                    }
                    b"sections" => {
                        sections = parse_sections(&mut reader)?;
                    }
                    b"flow" => {
                        flow_graph = Some(parse_flow(&mut reader, &e)?);
                    }
                    _ => {}
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(ContextError::InvalidXml(e.to_string())),
            _ => {}
        }
        buf.clear();
    }

    let meta = meta.ok_or_else(|| ContextError::MissingRequiredField("meta".to_string()))?;

    Ok(ContextDocument {
        meta,
        variables,
        sections,
        flow_graph,
    })
}

fn parse_meta(reader: &mut Reader<&[u8]>) -> Result<MetaData> {
    let mut title = String::new();
    let mut author = String::new();
    let mut created = String::new();
    let mut app_info: Option<AppInfo> = None;
    let mut tags = Vec::new();
    let mut description = String::new();

    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) | Ok(Event::Empty(e)) => {
                let tag_name = e.name();
                match tag_name.as_ref() {
                    b"title" => title = read_text(reader, "title")?,
                    b"author" => author = read_text(reader, "author")?,
                    b"created" => created = read_text(reader, "created")?,
                    b"app" => {
                        let mut name = String::new();
                        let mut version = String::new();
                        for attr in e.attributes() {
                            let attr = attr.map_err(|e| ContextError::InvalidXml(e.to_string()))?;
                            match attr.key.as_ref() {
                                b"name" => name = String::from_utf8_lossy(&attr.value).to_string(),
                                b"version" => version = String::from_utf8_lossy(&attr.value).to_string(),
                                _ => {}
                            }
                        }
                        app_info = Some(AppInfo { name, version });
                    }
                    b"tags" => {
                        let tags_str = read_text(reader, "tags")?;
                        tags = tags_str.split(',').map(|s| s.trim().to_string()).collect();
                    }
                    b"description" => description = read_text(reader, "description")?,
                    _ => {}
                }
            }
            Ok(Event::End(e)) if e.name().as_ref() == b"meta" => break,
            Ok(Event::Eof) => break,
            Err(e) => return Err(ContextError::InvalidXml(e.to_string())),
            _ => {}
        }
        buf.clear();
    }

    let app_info = app_info.ok_or_else(|| ContextError::MissingRequiredField("app".to_string()))?;

    Ok(MetaData {
        title,
        author,
        created,
        app_info,
        tags,
        description,
    })
}

fn parse_variables(reader: &mut Reader<&[u8]>) -> Result<Vec<Variable>> {
    let mut variables = Vec::new();
    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) if e.name().as_ref() == b"var" => {
                let mut name = String::new();
                for attr in e.attributes() {
                    let attr = attr.map_err(|e| ContextError::InvalidXml(e.to_string()))?;
                    if attr.key.as_ref() == b"name" {
                        name = String::from_utf8_lossy(&attr.value).to_string();
                    }
                }
                let value = read_text(reader, "var")?;
                variables.push(Variable { name, value });
            }
            Ok(Event::Empty(e)) if e.name().as_ref() == b"var" => {
                let mut name = String::new();
                for attr in e.attributes() {
                    let attr = attr.map_err(|e| ContextError::InvalidXml(e.to_string()))?;
                    if attr.key.as_ref() == b"name" {
                        name = String::from_utf8_lossy(&attr.value).to_string();
                    }
                }
                variables.push(Variable { name, value: String::new() });
            }
            Ok(Event::End(e)) if e.name().as_ref() == b"variables" => break,
            Ok(Event::Eof) => break,
            Err(e) => return Err(ContextError::InvalidXml(e.to_string())),
            _ => {}
        }
        buf.clear();
    }

    Ok(variables)
}

fn parse_sections(reader: &mut Reader<&[u8]>) -> Result<Vec<Section>> {
    let mut sections = Vec::new();
    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) if e.name().as_ref() == b"section" => {
                sections.push(parse_section(reader, &e)?);
            }
            Ok(Event::End(e)) if e.name().as_ref() == b"sections" => break,
            Ok(Event::Eof) => break,
            Err(e) => return Err(ContextError::InvalidXml(e.to_string())),
            _ => {}
        }
        buf.clear();
    }

    Ok(sections)
}

fn parse_section(reader: &mut Reader<&[u8]>, start_event: &quick_xml::events::BytesStart) -> Result<Section> {
    let mut id = String::new();
    let mut section_type = String::new();
    let mut ref_target: Option<String> = None;

    for attr in start_event.attributes() {
        let attr = attr.map_err(|e| ContextError::InvalidXml(e.to_string()))?;
        match attr.key.as_ref() {
            b"id" => id = String::from_utf8_lossy(&attr.value).to_string(),
            b"type" => section_type = String::from_utf8_lossy(&attr.value).to_string(),
            b"refTarget" => ref_target = Some(String::from_utf8_lossy(&attr.value).to_string()),
            _ => {}
        }
    }

    let mut content = String::new();
    let mut children = Vec::new();
    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                match e.name().as_ref() {
                    b"content" => {
                        content = read_cdata(reader, "content")?;
                    }
                    b"section" => {
                        children.push(parse_section(reader, &e)?);
                    }
                    _ => {}
                }
            }
            Ok(Event::End(e)) if e.name().as_ref() == b"section" => break,
            Ok(Event::Eof) => break,
            Err(e) => return Err(ContextError::InvalidXml(e.to_string())),
            _ => {}
        }
        buf.clear();
    }

    Ok(Section {
        id,
        section_type,
        content,
        ref_target,
        children,
    })
}

fn parse_flow(reader: &mut Reader<&[u8]>, start_event: &quick_xml::events::BytesStart) -> Result<FlowGraph> {
    let mut id = String::new();
    let mut version = String::new();

    for attr in start_event.attributes() {
        let attr = attr.map_err(|e| ContextError::InvalidXml(e.to_string()))?;
        match attr.key.as_ref() {
            b"id" => id = String::from_utf8_lossy(&attr.value).to_string(),
            b"version" => version = String::from_utf8_lossy(&attr.value).to_string(),
            _ => {}
        }
    }

    let mut title: Option<String> = None;
    let mut mermaid_code = String::new();
    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                match e.name().as_ref() {
                    b"title" => {
                        title = Some(read_text(reader, "title")?);
                    }
                    b"diagram" => {
                        mermaid_code = read_cdata(reader, "diagram")?;
                    }
                    _ => {}
                }
            }
            Ok(Event::End(e)) if e.name().as_ref() == b"flow" => break,
            Ok(Event::Eof) => break,
            Err(e) => return Err(ContextError::InvalidXml(e.to_string())),
            _ => {}
        }
        buf.clear();
    }

    // For now, return empty parsed_graph and node_refs - will be populated by mermaid parser
    Ok(FlowGraph {
        id,
        version,
        title,
        mermaid_code,
        parsed_graph: GraphStructure {
            nodes: vec![],
            edges: vec![],
        },
        node_refs: vec![],
    })
}

fn read_text(reader: &mut Reader<&[u8]>, _tag_name: &str) -> Result<String> {
    let mut buf = Vec::new();
    let mut text = String::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Text(e)) => {
                text.push_str(&e.unescape().map_err(|e| ContextError::InvalidXml(e.to_string()))?.to_string());
            }
            Ok(Event::End(_)) => break,
            Ok(Event::Eof) => break,
            Err(e) => return Err(ContextError::InvalidXml(e.to_string())),
            _ => {}
        }
        buf.clear();
    }

    Ok(text.trim().to_string())
}

fn read_cdata(reader: &mut Reader<&[u8]>, _tag_name: &str) -> Result<String> {
    let mut buf = Vec::new();
    let mut text = String::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::CData(e)) => {
                text.push_str(&String::from_utf8_lossy(&e));
            }
            Ok(Event::Text(e)) => {
                text.push_str(&e.unescape().map_err(|e| ContextError::InvalidXml(e.to_string()))?.to_string());
            }
            Ok(Event::End(_)) => break,
            Ok(Event::Eof) => break,
            Err(e) => return Err(ContextError::InvalidXml(e.to_string())),
            _ => {}
        }
        buf.clear();
    }

    Ok(text.trim().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_meta() {
        let xml = r#"
        <context version="1.0">
            <meta>
                <title>Test Doc</title>
                <author>Test Author</author>
                <created>2025-10-09</created>
                <app name="CEC" version="0.1.0"/>
                <tags>test, doc</tags>
                <description>A test</description>
            </meta>
            <variables></variables>
            <sections></sections>
        </context>
        "#;

        let doc = parse_xml(xml).unwrap();
        assert_eq!(doc.meta.title, "Test Doc");
        assert_eq!(doc.meta.author, "Test Author");
        assert_eq!(doc.meta.app_info.name, "CEC");
        assert_eq!(doc.meta.tags.len(), 2);
    }

    #[test]
    fn test_parse_variables() {
        let xml = r#"
        <context version="1.0">
            <meta>
                <title>Test</title>
                <author>Author</author>
                <created>2025-10-09</created>
                <app name="CEC" version="0.1.0"/>
                <tags>test</tags>
                <description>Test</description>
            </meta>
            <variables>
                <var name="userName">Jeremy</var>
                <var name="goal">Ship v1</var>
            </variables>
            <sections></sections>
        </context>
        "#;

        let doc = parse_xml(xml).unwrap();
        assert_eq!(doc.variables.len(), 2);
        assert_eq!(doc.variables[0].name, "userName");
        assert_eq!(doc.variables[0].value, "Jeremy");
    }

    #[test]
    fn test_parse_section_with_cdata() {
        let xml = r#"
        <context version="1.0">
            <meta>
                <title>Test</title>
                <author>Author</author>
                <created>2025-10-09</created>
                <app name="CEC" version="0.1.0"/>
                <tags>test</tags>
                <description>Test</description>
            </meta>
            <variables></variables>
            <sections>
                <section id="test-1" type="intent">
                    <content><![CDATA[
# Intent
This is test content
                    ]]></content>
                </section>
            </sections>
        </context>
        "#;

        let doc = parse_xml(xml).unwrap();
        assert_eq!(doc.sections.len(), 1);
        assert_eq!(doc.sections[0].id, "test-1");
        assert_eq!(doc.sections[0].section_type, "intent");
        assert!(doc.sections[0].content.contains("Intent"));
    }

    #[test]
    fn test_parse_nested_sections() {
        let xml = r#"
        <context version="1.0">
            <meta>
                <title>Test</title>
                <author>Author</author>
                <created>2025-10-09</created>
                <app name="CEC" version="0.1.0"/>
                <tags>test</tags>
                <description>Test</description>
            </meta>
            <variables></variables>
            <sections>
                <section id="parent-1" type="process">
                    <content><![CDATA[Parent content]]></content>
                    <section id="child-1" type="alternatives">
                        <content><![CDATA[Child content]]></content>
                    </section>
                </section>
            </sections>
        </context>
        "#;

        let doc = parse_xml(xml).unwrap();
        assert_eq!(doc.sections.len(), 1);
        assert_eq!(doc.sections[0].children.len(), 1);
        assert_eq!(doc.sections[0].children[0].id, "child-1");
    }

    #[test]
    fn test_parse_flow() {
        let xml = r#"
        <context version="1.0">
            <meta>
                <title>Test</title>
                <author>Author</author>
                <created>2025-10-09</created>
                <app name="CEC" version="0.1.0"/>
                <tags>test</tags>
                <description>Test</description>
            </meta>
            <variables></variables>
            <sections></sections>
            <flow id="flow-1" version="1.0">
                <title>Document Flow</title>
                <diagram><![CDATA[
```mermaid
flowchart TD
  A[Intent] --> B[Evaluation]
```
                ]]></diagram>
            </flow>
        </context>
        "#;

        let doc = parse_xml(xml).unwrap();
        assert!(doc.flow_graph.is_some());
        let flow = doc.flow_graph.unwrap();
        assert_eq!(flow.id, "flow-1");
        assert_eq!(flow.version, "1.0");
        assert_eq!(flow.title, Some("Document Flow".to_string()));
        assert!(flow.mermaid_code.contains("mermaid"));
    }
}
