use flow_writer_lib::services::flow_service;
use std::io::Write;
use tempfile::NamedTempFile;

/// Full end-to-end test with realistic context document
#[tokio::test]
async fn test_full_context_document_workflow() {
    let xml_content = r###"
<context version="1.0">
    <meta>
        <title>Product Strategy Document</title>
        <author>Jeremy Lu</author>
        <created>2025-10-09</created>
        <app name="CEC" version="0.1.0"/>
        <tags>product, strategy, planning</tags>
        <description>Comprehensive product strategy with flow diagram</description>
    </meta>
    <variables>
        <var name="productName">Flow Writer</var>
        <var name="targetDate">2025-11-15</var>
        <var name="teamSize">5 engineers</var>
    </variables>
    <sections>
        <section id="intent-1" type="intent">
            <content><![CDATA[
# Product Intent

We aim to build **${productName}** with a team of ${teamSize}.

Launch target: ${targetDate}
            ]]></content>
        </section>
        <section id="evaluation-1" type="evaluation">
            <content><![CDATA[
# Evaluation Criteria

- Performance benchmarks
- User acceptance testing
- Security audit results
            ]]></content>
            <section id="eval-metrics" type="metrics">
                <content><![CDATA[
## Key Metrics

- Load time < 2s
- Test coverage > 80%
- Zero critical vulnerabilities
                ]]></content>
            </section>
        </section>
        <section id="process-1" type="process">
            <content><![CDATA[
# Development Process

1. Design phase
2. Implementation
3. Testing
4. Deployment
            ]]></content>
        </section>
    </sections>
    <flow id="main-flow" version="1.0">
        <title>Product Development Flow</title>
        <diagram><![CDATA[
```mermaid
flowchart TD
  A[Intent] --> B[Evaluation]
  B --> C[Process]
  C -->|Success| D[Deployment]
  C -->|Issues Found| E[Refinement]
  E --> B

  click A "#intent-1"
  click B "#evaluation-1"
  click C "#process-1"
```
        ]]></diagram>
    </flow>
</context>
    "###;

    let mut temp_file = NamedTempFile::new().unwrap();
    temp_file.write_all(xml_content.as_bytes()).unwrap();
    let file_path = temp_file.path().to_str().unwrap();

    // Test 1: Load metadata
    let metadata = flow_service::load_metadata(file_path).await.unwrap();
    assert_eq!(metadata.title, "Product Strategy Document");
    assert_eq!(metadata.author, "Jeremy Lu");
    assert_eq!(metadata.app_info.name, "CEC");
    assert_eq!(metadata.tags, vec!["product", "strategy", "planning"]);
    assert_eq!(metadata.description, "Comprehensive product strategy with flow diagram");

    // Test 2: Load sections with variable resolution
    let sections = flow_service::load_sections(file_path).await.unwrap();
    assert_eq!(sections.len(), 3);

    // Check first section has resolved variables
    let intent_section = &sections[0];
    assert_eq!(intent_section.id, "intent-1");
    assert_eq!(intent_section.section_type, "intent");
    assert!(intent_section.content.contains("Flow Writer"));
    assert!(intent_section.content.contains("5 engineers"));
    assert!(intent_section.content.contains("2025-11-15"));
    assert!(!intent_section.content.contains("${productName}"));

    // Check nested section structure
    let eval_section = &sections[1];
    assert_eq!(eval_section.id, "evaluation-1");
    assert_eq!(eval_section.children.len(), 1);
    assert_eq!(eval_section.children[0].id, "eval-metrics");

    // Test 3: Load and process flow graph
    let flow_graph = flow_service::load_flow_graph(file_path).await.unwrap();
    assert!(flow_graph.is_some());

    let flow = flow_graph.unwrap();
    assert_eq!(flow.id, "main-flow");
    assert_eq!(flow.version, "1.0");
    assert_eq!(flow.title, Some("Product Development Flow".to_string()));

    // Check parsed graph structure
    assert_eq!(flow.parsed_graph.nodes.len(), 5); // A, B, C, D, E
    assert_eq!(flow.parsed_graph.edges.len(), 5); // 5 edges in the flow

    // Verify specific nodes
    let node_a = flow.parsed_graph.nodes.iter().find(|n| n.id == "A").unwrap();
    assert_eq!(node_a.label, "Intent");
    assert_eq!(node_a.ref_section_id, Some("intent-1".to_string()));

    let node_b = flow.parsed_graph.nodes.iter().find(|n| n.id == "B").unwrap();
    assert_eq!(node_b.label, "Evaluation");
    assert_eq!(node_b.ref_section_id, Some("evaluation-1".to_string()));

    // Check click actions
    assert_eq!(flow.node_refs.len(), 3);
    let click_a = flow.node_refs.iter().find(|r| r.node_id == "A").unwrap();
    assert_eq!(click_a.section_id, "intent-1");
    assert_eq!(click_a.click_action, "#intent-1");

    // Check labeled edges
    let success_edge = flow.parsed_graph.edges.iter()
        .find(|e| e.from == "C" && e.to == "D")
        .unwrap();
    assert_eq!(success_edge.label, Some("Success".to_string()));

    let issues_edge = flow.parsed_graph.edges.iter()
        .find(|e| e.from == "C" && e.to == "E")
        .unwrap();
    assert_eq!(issues_edge.label, Some("Issues Found".to_string()));
}

/// Test document with no flow graph
#[tokio::test]
async fn test_document_without_flow() {
    let xml_content = r#"
<context version="1.0">
    <meta>
        <title>Simple Document</title>
        <author>Test Author</author>
        <created>2025-10-09</created>
        <app name="CEC" version="0.1.0"/>
        <tags>simple</tags>
        <description>Document without flow graph</description>
    </meta>
    <variables></variables>
    <sections>
        <section id="section-1" type="content">
            <content><![CDATA[Simple content]]></content>
        </section>
    </sections>
</context>
    "#;

    let mut temp_file = NamedTempFile::new().unwrap();
    temp_file.write_all(xml_content.as_bytes()).unwrap();
    let file_path = temp_file.path().to_str().unwrap();

    let sections = flow_service::load_sections(file_path).await.unwrap();
    assert_eq!(sections.len(), 1);

    let flow = flow_service::load_flow_graph(file_path).await.unwrap();
    assert!(flow.is_none());
}

/// Test deeply nested sections
#[tokio::test]
async fn test_deeply_nested_sections() {
    let xml_content = r#"
<context version="1.0">
    <meta>
        <title>Nested Document</title>
        <author>Test Author</author>
        <created>2025-10-09</created>
        <app name="CEC" version="0.1.0"/>
        <tags>nested</tags>
        <description>Document with deeply nested sections</description>
    </meta>
    <variables>
        <var name="level">Deep</var>
    </variables>
    <sections>
        <section id="parent" type="parent">
            <content><![CDATA[Parent: ${level}]]></content>
            <section id="child-1" type="child">
                <content><![CDATA[Child 1: ${level}]]></content>
                <section id="grandchild" type="grandchild">
                    <content><![CDATA[Grandchild: ${level}]]></content>
                </section>
            </section>
            <section id="child-2" type="child">
                <content><![CDATA[Child 2: ${level}]]></content>
            </section>
        </section>
    </sections>
</context>
    "#;

    let mut temp_file = NamedTempFile::new().unwrap();
    temp_file.write_all(xml_content.as_bytes()).unwrap();
    let file_path = temp_file.path().to_str().unwrap();

    let sections = flow_service::load_sections(file_path).await.unwrap();

    // Should have 1 parent section
    assert_eq!(sections.len(), 1);
    let parent = &sections[0];
    assert_eq!(parent.id, "parent");
    assert!(parent.content.contains("Deep"));

    // Parent should have 2 children
    assert_eq!(parent.children.len(), 2);

    // First child should have 1 grandchild
    let child_1 = &parent.children[0];
    assert_eq!(child_1.id, "child-1");
    assert!(child_1.content.contains("Deep"));
    assert_eq!(child_1.children.len(), 1);

    let grandchild = &child_1.children[0];
    assert_eq!(grandchild.id, "grandchild");
    assert!(grandchild.content.contains("Deep"));

    // Second child should have no children
    let child_2 = &parent.children[1];
    assert_eq!(child_2.id, "child-2");
    assert_eq!(child_2.children.len(), 0);
}

/// Test error handling for invalid XML
#[tokio::test]
async fn test_invalid_xml_error() {
    let xml_content = r#"
<context version="1.0">
    <meta>
        <title>Invalid Document
    "#;

    let mut temp_file = NamedTempFile::new().unwrap();
    temp_file.write_all(xml_content.as_bytes()).unwrap();
    let file_path = temp_file.path().to_str().unwrap();

    let result = flow_service::load_sections(file_path).await;
    assert!(result.is_err());
}

/// Test complex mermaid graph with multiple node types
#[tokio::test]
async fn test_complex_mermaid_graph() {
    let xml_content = r###"
<context version="1.0">
    <meta>
        <title>Complex Flow</title>
        <author>Test Author</author>
        <created>2025-10-09</created>
        <app name="CEC" version="0.1.0"/>
        <tags>flow</tags>
        <description>Complex mermaid flow</description>
    </meta>
    <variables></variables>
    <sections></sections>
    <flow id="complex-flow" version="1.0">
        <title>Complex Flow</title>
        <diagram><![CDATA[
```mermaid
flowchart TD
  A[Start Node] --> B(Round Node)
  B --> C[Decision Node]
  C -->|Option 1| D[Result 1]
  C -->|Option 2| E[Result 2]
  D --> F[End]
  E --> F

  click A "#section-a"
  click B "#section-b"
  click C "#section-c"
```
        ]]></diagram>
    </flow>
</context>
    "###;

    let mut temp_file = NamedTempFile::new().unwrap();
    temp_file.write_all(xml_content.as_bytes()).unwrap();
    let file_path = temp_file.path().to_str().unwrap();

    let flow = flow_service::load_flow_graph(file_path).await.unwrap().unwrap();

    // Should have 6 nodes: A, B, C, D, E, F
    assert_eq!(flow.parsed_graph.nodes.len(), 6);

    // Should have 6 edges: A->B, B->C, C->D, C->E, D->F, E->F
    assert_eq!(flow.parsed_graph.edges.len(), 6);

    // Check labeled edges
    let opt1_edge = flow.parsed_graph.edges.iter()
        .find(|e| e.from == "C" && e.to == "D")
        .unwrap();
    assert_eq!(opt1_edge.label, Some("Option 1".to_string()));

    let opt2_edge = flow.parsed_graph.edges.iter()
        .find(|e| e.from == "C" && e.to == "E")
        .unwrap();
    assert_eq!(opt2_edge.label, Some("Option 2".to_string()));

    // Check click actions
    assert_eq!(flow.node_refs.len(), 3);

    // Verify node references are linked
    let node_a = flow.parsed_graph.nodes.iter().find(|n| n.id == "A").unwrap();
    assert_eq!(node_a.ref_section_id, Some("section-a".to_string()));

    let node_b = flow.parsed_graph.nodes.iter().find(|n| n.id == "B").unwrap();
    assert_eq!(node_b.ref_section_id, Some("section-b".to_string()));
}
