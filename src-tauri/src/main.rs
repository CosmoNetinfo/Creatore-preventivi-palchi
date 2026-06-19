// Prevents additional console window on Windows in release, do not remove!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // Inizializza il database SQLite locale e migrazioni
            db::init_db(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_next_quote_number,
            commands::save_quote,
            commands::get_quotes,
            commands::delete_quote,
            commands::get_pricing_config,
            commands::save_pricing_config,
            commands::get_warehouse_items,
            commands::adjust_warehouse_item,
            commands::update_warehouse_threshold,
            commands::get_low_stock_items,
            commands::apply_warehouse_movement
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
