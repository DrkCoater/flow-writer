use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_section_creation() {
        let section = Section {
            id: "intent-1".to_string(),
            section_type: "intent".to_string(),
            content: "# Intent\nTest content".to_string(),
            ref_target: None,
            children: vec![],
        };

        assert_eq!(section.id, "intent-1");
        assert_eq!(section.section_type, "intent");
        assert!(section.children.is_empty());
    }

    #[test]
    fn test_section_with_children() {
        let child = Section {
            id: "alt-1".to_string(),
            section_type: "alternatives".to_string(),
            content: "Alternative content".to_string(),
            ref_target: None,
            children: vec![],
        };

        let parent = Section {
            id: "proc-1".to_string(),
            section_type: "process".to_string(),
            content: "Process content".to_string(),
            ref_target: Some("intent-1 eval-1".to_string()),
            children: vec![child],
        };

        assert_eq!(parent.children.len(), 1);
        assert_eq!(parent.ref_target, Some("intent-1 eval-1".to_string()));
    }

    #[test]
    fn test_section_serialization() {
        let section = Section {
            id: "test-1".to_string(),
            section_type: "test".to_string(),
            content: "Test".to_string(),
            ref_target: None,
            children: vec![],
        };

        let json = serde_json::to_string(&section).unwrap();
        // Check that "type" is used in JSON (not "section_type")
        assert!(json.contains(r#""type":"test""#));
        assert!(json.contains(r#""id":"test-1""#));
    }

    #[test]
    fn test_section_ref_target_omitted_when_none() {
        let section = Section {
            id: "test-1".to_string(),
            section_type: "test".to_string(),
            content: "Test".to_string(),
            ref_target: None,
            children: vec![],
        };

        let json = serde_json::to_string(&section).unwrap();
        // ref_target should be omitted when None
        assert!(!json.contains("refTarget"));
    }
}
