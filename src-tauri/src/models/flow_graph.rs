use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FlowGraph {
    pub id: String,
    pub version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    pub mermaid_code: String,
    pub parsed_graph: GraphStructure,
    pub node_refs: Vec<NodeReference>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct GraphStructure {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct GraphNode {
    pub id: String,
    pub label: String,
    #[serde(rename = "nodeType")]
    pub node_type: NodeType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ref_section_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct GraphEdge {
    pub from: String,
    pub to: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NodeReference {
    pub node_id: String,
    pub section_id: String,
    pub click_action: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tooltip: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_graph_node_creation() {
        let node = GraphNode {
            id: "A".to_string(),
            label: "Intent".to_string(),
            node_type: NodeType::Rectangle,
            ref_section_id: Some("intent-1".to_string()),
        };

        assert_eq!(node.id, "A");
        assert_eq!(node.label, "Intent");
        assert_eq!(node.ref_section_id, Some("intent-1".to_string()));
    }

    #[test]
    fn test_graph_edge_creation() {
        let edge = GraphEdge {
            from: "A".to_string(),
            to: "B".to_string(),
            label: None,
        };

        assert_eq!(edge.from, "A");
        assert_eq!(edge.to, "B");
        assert!(edge.label.is_none());
    }

    #[test]
    fn test_graph_edge_with_label() {
        let edge = GraphEdge {
            from: "C".to_string(),
            to: "D".to_string(),
            label: Some("Alt A".to_string()),
        };

        assert_eq!(edge.label, Some("Alt A".to_string()));
    }

    #[test]
    fn test_node_reference_creation() {
        let node_ref = NodeReference {
            node_id: "A".to_string(),
            section_id: "intent-1".to_string(),
            click_action: "#intent-1".to_string(),
            tooltip: Some("Jump to Intent".to_string()),
        };

        assert_eq!(node_ref.node_id, "A");
        assert_eq!(node_ref.click_action, "#intent-1");
    }

    #[test]
    fn test_graph_structure_creation() {
        let graph = GraphStructure {
            nodes: vec![
                GraphNode {
                    id: "A".to_string(),
                    label: "Intent".to_string(),
                    node_type: NodeType::Rectangle,
                    ref_section_id: Some("intent-1".to_string()),
                },
            ],
            edges: vec![
                GraphEdge {
                    from: "A".to_string(),
                    to: "B".to_string(),
                    label: None,
                },
            ],
        };

        assert_eq!(graph.nodes.len(), 1);
        assert_eq!(graph.edges.len(), 1);
    }

    #[test]
    fn test_flow_graph_creation() {
        let flow = FlowGraph {
            id: "flow-1".to_string(),
            version: "1.0".to_string(),
            title: Some("Document Flow".to_string()),
            mermaid_code: "flowchart TD\n  A[Intent] --> B[Evaluation]".to_string(),
            parsed_graph: GraphStructure {
                nodes: vec![],
                edges: vec![],
            },
            node_refs: vec![],
        };

        assert_eq!(flow.id, "flow-1");
        assert_eq!(flow.version, "1.0");
        assert_eq!(flow.title, Some("Document Flow".to_string()));
    }

    #[test]
    fn test_node_type_serialization() {
        let node = GraphNode {
            id: "A".to_string(),
            label: "Test".to_string(),
            node_type: NodeType::Rectangle,
            ref_section_id: None,
        };

        let json = serde_json::to_string(&node).unwrap();
        // Should be camelCase in JSON
        assert!(json.contains(r#""nodeType":"rectangle""#));
    }
}
