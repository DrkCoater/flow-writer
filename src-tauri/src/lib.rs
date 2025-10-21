pub mod error;
pub mod models;
pub mod parsers;
pub mod processors;
pub mod serializers;
pub mod services;
pub mod validators;

use models::{MetaData, Section, FlowGraph};
use services::flow_service;

/// Load all sections from the context document
#[tauri::command]
async fn load_sections(file_path: String) -> Result<Vec<Section>, String> {
    flow_service::load_sections(&file_path)
        .await
        .map_err(|e| e.to_string())
}

/// Load the flow graph from the context document
#[tauri::command]
async fn load_flow_graph(file_path: String) -> Result<Option<FlowGraph>, String> {
    flow_service::load_flow_graph(&file_path)
        .await
        .map_err(|e| e.to_string())
}

/// Load metadata from the context document
#[tauri::command]
async fn load_metadata(file_path: String) -> Result<MetaData, String> {
    flow_service::load_metadata(&file_path)
        .await
        .map_err(|e| e.to_string())
}

/// Save updated sections to the context document
#[tauri::command]
async fn save_document(file_path: String, sections: Vec<Section>) -> Result<(), String> {
    flow_service::save_document(&file_path, sections)
        .await
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            load_sections,
            load_flow_graph,
            load_metadata,
            save_document
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
