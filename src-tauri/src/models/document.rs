use serde::{Deserialize, Serialize};
use super::{Section, FlowGraph};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ContextDocument {
    pub meta: MetaData,
    pub variables: Vec<Variable>,
    pub sections: Vec<Section>,
    pub flow_graph: Option<FlowGraph>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MetaData {
    pub title: String,
    pub author: String,
    pub created: String,
    pub app_info: AppInfo,
    pub tags: Vec<String>,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Variable {
    pub name: String,
    pub value: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_variable_creation() {
        let var = Variable {
            name: "userName".to_string(),
            value: "Jeremy".to_string(),
        };

        assert_eq!(var.name, "userName");
        assert_eq!(var.value, "Jeremy");
    }

    #[test]
    fn test_app_info_serialization() {
        let app_info = AppInfo {
            name: "CEC".to_string(),
            version: "0.1.0".to_string(),
        };

        let json = serde_json::to_string(&app_info).unwrap();
        assert!(json.contains("CEC"));
        assert!(json.contains("0.1.0"));
    }

    #[test]
    fn test_metadata_creation() {
        let meta = MetaData {
            title: "Test Document".to_string(),
            author: "Test Author".to_string(),
            created: "2025-10-09".to_string(),
            app_info: AppInfo {
                name: "CEC".to_string(),
                version: "0.1.0".to_string(),
            },
            tags: vec!["test".to_string(), "document".to_string()],
            description: "A test document".to_string(),
        };

        assert_eq!(meta.title, "Test Document");
        assert_eq!(meta.tags.len(), 2);
    }

    #[test]
    fn test_context_document_structure() {
        let doc = ContextDocument {
            meta: MetaData {
                title: "Test".to_string(),
                author: "Author".to_string(),
                created: "2025-10-09".to_string(),
                app_info: AppInfo {
                    name: "CEC".to_string(),
                    version: "0.1.0".to_string(),
                },
                tags: vec![],
                description: "Test".to_string(),
            },
            variables: vec![
                Variable {
                    name: "var1".to_string(),
                    value: "value1".to_string(),
                }
            ],
            sections: vec![],
            flow_graph: None,
        };

        assert_eq!(doc.variables.len(), 1);
        assert!(doc.flow_graph.is_none());
    }
}
