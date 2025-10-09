use regex::Regex;
use crate::error::Result;
use crate::models::*;

pub fn parse_mermaid(mermaid_code: &str) -> Result<GraphStructure> {
    let clean_code = extract_mermaid_from_markdown(mermaid_code)?;

    let nodes = parse_nodes(&clean_code)?;
    let edges = parse_edges(&clean_code)?;

    Ok(GraphStructure { nodes, edges })
}

pub fn extract_mermaid_from_markdown(content: &str) -> Result<String> {
    // Extract content between ```mermaid and ```
    let re = Regex::new(r"```mermaid\s*\n([\s\S]*?)\n```").unwrap();

    if let Some(caps) = re.captures(content) {
        Ok(caps[1].to_string())
    } else {
        // If no markdown fence, assume it's pure mermaid code
        Ok(content.to_string())
    }
}

fn parse_nodes(code: &str) -> Result<Vec<GraphNode>> {
    let mut nodes = Vec::new();

    // Rectangle nodes: A[Label]
    let rect_re = Regex::new(r"(\w+)\[([^\]]+)\]").unwrap();
    for caps in rect_re.captures_iter(code) {
        nodes.push(GraphNode {
            id: caps[1].to_string(),
            label: caps[2].to_string(),
            node_type: NodeType::Rectangle,
            ref_section_id: None,
        });
    }

    // Round edges nodes: A(Label)
    let round_re = Regex::new(r"(\w+)\(([^)]+)\)").unwrap();
    for caps in round_re.captures_iter(code) {
        // Skip if already exists
        if !nodes.iter().any(|n| n.id == &caps[1]) {
            nodes.push(GraphNode {
                id: caps[1].to_string(),
                label: caps[2].to_string(),
                node_type: NodeType::RoundEdges,
                ref_section_id: None,
            });
        }
    }

    Ok(nodes)
}

fn parse_edges(code: &str) -> Result<Vec<GraphEdge>> {
    let mut edges = Vec::new();

    for line in code.lines() {
        let line = line.trim();

        // Edge with label: A -->|label| B or C -->|Alt A| D[Alternative A]
        if line.contains("-->|") {
            // Match: NodeID (anything) --> |label| NodeID (anything optional)
            let labeled_re = Regex::new(r"(\w+)[^\-]*-->\s*\|([^|]+)\|\s*(\w+)").unwrap();
            if let Some(caps) = labeled_re.captures(line) {
                edges.push(GraphEdge {
                    from: caps[1].to_string(),
                    to: caps[3].to_string(),
                    label: Some(caps[2].to_string()),
                });
            }
        }
        // Simple edge: A --> B or A[Label] --> B[Label]
        else if line.contains("-->") {
            // Match: NodeID (anything) --> NodeID (anything optional)
            let simple_re = Regex::new(r"(\w+)[^\-]*-->\s*(\w+)").unwrap();
            if let Some(caps) = simple_re.captures(line) {
                edges.push(GraphEdge {
                    from: caps[1].to_string(),
                    to: caps[2].to_string(),
                    label: None,
                });
            }
        }
    }

    Ok(edges)
}

pub fn parse_click_actions(code: &str) -> Result<Vec<NodeReference>> {
    let mut node_refs = Vec::new();

    // click A "#intent-1" "Jump to Intent"
    let click_re = Regex::new(r#"click\s+(\w+)\s+"([^"]+)"\s*(?:"([^"]+)")?"#).unwrap();

    for caps in click_re.captures_iter(code) {
        let node_id = caps[1].to_string();
        let click_action = caps[2].to_string();

        // Extract section_id from click_action (e.g., "#intent-1" -> "intent-1")
        let section_id = click_action.trim_start_matches('#').to_string();

        let tooltip = caps.get(3).map(|m| m.as_str().to_string());

        node_refs.push(NodeReference {
            node_id,
            section_id,
            click_action,
            tooltip,
        });
    }

    Ok(node_refs)
}

pub fn enrich_flow_graph(flow: &mut FlowGraph) -> Result<()> {
    // Parse mermaid code
    flow.parsed_graph = parse_mermaid(&flow.mermaid_code)?;

    // Parse click actions
    flow.node_refs = parse_click_actions(&flow.mermaid_code)?;

    // Link node references to graph nodes
    for node_ref in &flow.node_refs {
        if let Some(node) = flow.parsed_graph.nodes.iter_mut().find(|n| n.id == node_ref.node_id) {
            node.ref_section_id = Some(node_ref.section_id.clone());
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_mermaid_from_markdown() {
        let content = r#"
```mermaid
flowchart TD
  A[Intent] --> B[Evaluation]
```
        "#;

        let result = extract_mermaid_from_markdown(content).unwrap();
        assert!(result.contains("flowchart TD"));
        assert!(result.contains("A[Intent]"));
    }

    #[test]
    fn test_parse_rectangle_nodes() {
        let code = "A[Intent] --> B[Evaluation]";
        let nodes = parse_nodes(code).unwrap();

        assert_eq!(nodes.len(), 2);
        assert_eq!(nodes[0].id, "A");
        assert_eq!(nodes[0].label, "Intent");
        assert_eq!(nodes[1].id, "B");
        assert_eq!(nodes[1].label, "Evaluation");
    }

    #[test]
    fn test_parse_simple_edges() {
        let code = "A --> B\nB --> C";
        let edges = parse_edges(code).unwrap();

        assert_eq!(edges.len(), 2);
        assert_eq!(edges[0].from, "A");
        assert_eq!(edges[0].to, "B");
        assert!(edges[0].label.is_none());
    }

    #[test]
    fn test_parse_labeled_edges() {
        let code = "C -->|Alt A| D";
        let edges = parse_edges(code).unwrap();

        assert_eq!(edges.len(), 1);
        assert_eq!(edges[0].from, "C");
        assert_eq!(edges[0].to, "D");
        assert_eq!(edges[0].label, Some("Alt A".to_string()));
    }

    #[test]
    fn test_parse_click_actions() {
        let code = r###"click A "#intent-1" "Jump to Intent""###;
        let refs = parse_click_actions(code).unwrap();

        assert_eq!(refs.len(), 1);
        assert_eq!(refs[0].node_id, "A");
        assert_eq!(refs[0].section_id, "intent-1");
        assert_eq!(refs[0].click_action, "#intent-1");
        assert_eq!(refs[0].tooltip, Some("Jump to Intent".to_string()));
    }

    #[test]
    fn test_parse_full_mermaid() {
        let code = r#"
```mermaid
flowchart TD
  A[Intent] --> B[Evaluation]
  B --> C[Process]
  C -->|Alt A| D[Alternative A]
```
        "#;

        let graph = parse_mermaid(code).unwrap();

        assert_eq!(graph.nodes.len(), 4);
        assert_eq!(graph.edges.len(), 3);
    }
}
