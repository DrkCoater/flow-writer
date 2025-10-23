// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Load .env file if it exists (only in development)
    // This loads environment variables from .env into the process
    #[cfg(debug_assertions)]
    {
        if let Err(e) = dotenvy::dotenv() {
            eprintln!("Warning: Could not load .env file: {}", e);
        }
    }

    flow_writer_lib::run()
}
