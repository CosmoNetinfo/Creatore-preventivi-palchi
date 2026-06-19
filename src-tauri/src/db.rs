use std::fs;
use std::path::PathBuf;
use rusqlite::Connection;
use tauri::AppHandle;
use tauri::Manager;

pub fn get_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    }
    Ok(app_dir.join("easyevent.db"))
}

pub fn get_connection(app: &AppHandle) -> Result<Connection, String> {
    let db_path = get_db_path(app)?;
    Connection::open(db_path).map_err(|e| e.to_string())
}

pub fn init_db(app: &AppHandle) -> Result<(), String> {
    let conn = get_connection(app)?;
    
    // Esegui la migrazione
    let migration_sql = include_str!("../migrations/001_init.sql");
    conn.execute_batch(migration_sql).map_err(|e| {
        eprintln!("Database initialization failed: {}", e);
        e.to_string()
    })?;
    
    println!("Database initialized successfully");
    Ok(())
}
