use std::env;

const ENV_VAR_NAME: &str = "FLOW_WRITER_DOC_PATH";

/// Get the document path using priority order:
/// 1. Environment variable FLOW_WRITER_DOC_PATH
/// 2. Return None (caller should show file picker)
pub async fn get_document_path() -> Result<Option<String>, String> {
    // Check environment variable
    if let Ok(env_path) = env::var(ENV_VAR_NAME) {
        if !env_path.is_empty() {
            return Ok(Some(env_path));
        }
    }

    // No path available, return None (caller should show file picker)
    Ok(None)
}
