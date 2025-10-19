use flow_writer_lib::services::flow_service;
use std::path::PathBuf;

/// Test with the actual context-example.xml file
#[tokio::test]
async fn test_context_example_xml() {
    // Get the path to context-example.xml
    let mut file_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    file_path.push("context-docs");
    file_path.push("context-example.xml");

    let file_path_str = file_path.to_str().unwrap();

    // Test 1: Load and verify metadata
    let metadata = flow_service::load_metadata(file_path_str).await.unwrap();
    assert_eq!(metadata.title, "Context Engineering Canvas — Example");
    assert_eq!(metadata.author, "Example Author");
    assert_eq!(metadata.app_info.name, "CEC");
    assert_eq!(metadata.app_info.version, "0.1.0");
    assert_eq!(metadata.tags, vec!["context", "engineering", "markdown", "xml", "mermaid"]);
    println!("Metadata loaded successfully");
    println!("  Title: {}", metadata.title);
    println!("  Author: {}", metadata.author);
    println!("  Tags: {:?}", metadata.tags);

    // Test 2: Load sections with variable resolution
    let sections = flow_service::load_sections(file_path_str).await.unwrap();
    println!("\nSections loaded: {}", sections.len());

    // Verify the structure - should have 4 flat sections (no nesting)
    assert_eq!(sections.len(), 4); // intent-1, eval-1, proc-1, alts-1

    // Check that variables are resolved
    let intent_section = sections.iter().find(|s| s.id == "intent-1").unwrap();
    assert!(intent_section.content.contains("Jeremy"));
    assert!(intent_section.content.contains("Ship the v1 Context Editor"));
    assert!(intent_section.content.contains("2025-11-01"));
    assert!(!intent_section.content.contains("${userName}"));
    assert!(!intent_section.content.contains("${goal}"));
    println!("  Intent section: {} (variables resolved)", intent_section.id);

    // Verify all sections are flat (no children)
    for section in &sections {
        assert_eq!(section.children.len(), 0, "Section {} should have no children", section.id);
    }
    println!("  All sections are flat (no nesting)");

    // Test 3: Load and process flow graph
    let flow_graph = flow_service::load_flow_graph(file_path_str).await.unwrap();
    assert!(flow_graph.is_some());

    let flow = flow_graph.unwrap();
    assert_eq!(flow.id, "flow-1");
    assert_eq!(flow.version, "1.0");
    assert_eq!(flow.title, Some("Document Flow".to_string()));

    println!("\nFlow graph loaded:");
    println!("  ID: {}", flow.id);
    println!("  Version: {}", flow.version);
    println!("  Title: {:?}", flow.title);
    println!("  Nodes: {}", flow.parsed_graph.nodes.len());
    println!("  Edges: {}", flow.parsed_graph.edges.len());
    println!("  Click actions: {}", flow.node_refs.len());

    // Verify nodes are parsed correctly - A, B, C, D, E
    assert_eq!(flow.parsed_graph.nodes.len(), 5);

    // Verify edges are parsed - A->B, B->C, C->D, C->E = 4 edges
    assert_eq!(flow.parsed_graph.edges.len(), 4);

    // Verify click actions and node references - should have 5 click actions
    assert_eq!(flow.node_refs.len(), 5);

    // Check specific node has reference
    let node_a = flow.parsed_graph.nodes.iter().find(|n| n.id == "A").unwrap();
    assert_eq!(node_a.ref_section_id, Some("intent-1".to_string()));

    let node_b = flow.parsed_graph.nodes.iter().find(|n| n.id == "B").unwrap();
    assert_eq!(node_b.ref_section_id, Some("eval-1".to_string()));

    let node_c = flow.parsed_graph.nodes.iter().find(|n| n.id == "C").unwrap();
    assert_eq!(node_c.ref_section_id, Some("proc-1".to_string()));

    println!("\n  Node A linked to section: {:?}", node_a.ref_section_id);
    println!("  Node B linked to section: {:?}", node_b.ref_section_id);
    println!("  Node C linked to section: {:?}", node_c.ref_section_id);

    // Print all nodes and their references
    for node in &flow.parsed_graph.nodes {
        println!("  Node {}: {} -> {:?}", node.id, node.label, node.ref_section_id);
    }

    // Print all edges
    for edge in &flow.parsed_graph.edges {
        println!("  Edge: {} -> {} (label: {:?})", edge.from, edge.to, edge.label);
    }

    // Print all click actions
    for node_ref in &flow.node_refs {
        println!("  Click: {} -> {}", node_ref.node_id, node_ref.section_id);
    }

    println!("\nAll tests passed with context-example.xml!");
}
