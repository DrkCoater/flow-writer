use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContextError {
    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("Invalid XML structure: {0}")]
    InvalidXml(String),

    #[error("Missing required field: {0}")]
    MissingRequiredField(String),

    #[error("Variable resolution error: {0}")]
    VariableResolutionError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Mermaid parsing error: {0}")]
    MermaidParseError(String),

    #[error("Graph validation error: {0}")]
    ValidationError(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Async task error: {0}")]
    AsyncError(String),
}

pub type Result<T> = std::result::Result<T, ContextError>;
