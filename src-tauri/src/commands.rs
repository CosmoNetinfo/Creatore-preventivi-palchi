use rusqlite::{params, OptionalExtension};
use serde_json::{json, Value};
use tauri::{AppHandle, command};
use uuid::Uuid;
use crate::db::get_connection;

#[command]
pub fn get_next_quote_number(app: AppHandle, year: i32) -> Result<String, String> {
    let conn = get_connection(&app)?;
    
    // Ottieni o inserisci il contatore per l'anno
    conn.execute(
        "INSERT OR IGNORE INTO quote_counters (year, last_number) VALUES (?, 0)",
        params![year],
    ).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT last_number FROM quote_counters WHERE year = ?")
        .map_err(|e| e.to_string())?;
    
    let last_number: i32 = stmt.query_row(params![year], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let next_number = last_number + 1;

    // Aggiorna il contatore
    conn.execute(
        "UPDATE quote_counters SET last_number = ? WHERE year = ?",
        params![next_number, year],
    ).map_err(|e| e.to_string())?;

    Ok(format!("OFF-{}-{:03}", year, next_number))
}

#[command]
pub fn save_quote(app: AppHandle, quote: Value) -> Result<bool, String> {
    let conn = get_connection(&app)?;

    let id = quote["id"].as_str().ok_or("Quote ID mancante")?;
    let quote_number = quote["number"].as_str().ok_or("Numero preventivo mancante")?;
    let client_name = quote["client"]["companyName"].as_str().unwrap_or("Cliente Sconosciuto");
    let status = quote["status"].as_str().unwrap_or("draft");
    let data_str = serde_json::to_string(&quote).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO quotes (id, quote_number, client_name, status, data, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET 
            quote_number = excluded.quote_number,
            client_name = excluded.client_name,
            status = excluded.status,
            data = excluded.data,
            updated_at = datetime('now')",
        params![id, quote_number, client_name, status, data_str],
    ).map_err(|e| e.to_string())?;

    Ok(true)
}

#[command]
pub fn get_quotes(app: AppHandle) -> Result<Vec<Value>, String> {
    let conn = get_connection(&app)?;
    let mut stmt = conn.prepare("SELECT id, quote_number, client_name, status, data FROM quotes ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        let id: String = row.get(0)?;
        let quote_number: String = row.get(1)?;
        let client_name: String = row.get(2)?;
        let status: String = row.get(3)?;
        let data_str: String = row.get(4)?;
        
        // Decodifica la stringa JSON dei dati
        let data: Value = serde_json::from_str(&data_str).unwrap_or(json!({}));
        
        Ok(json!({
            "id": id,
            "quote_number": quote_number,
            "client_name": client_name,
            "status": status,
            "data": data
        }))
    }).map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        if let Ok(item) = r {
            list.push(item);
        }
    }

    Ok(list)
}

#[command]
pub fn delete_quote(app: AppHandle, id: String) -> Result<bool, String> {
    let conn = get_connection(&app)?;
    conn.execute("DELETE FROM quotes WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[command]
pub fn get_pricing_config(app: AppHandle) -> Result<Value, String> {
    let conn = get_connection(&app)?;
    
    // Carica pricing
    let mut stmt = conn.prepare("SELECT stage_type, module, incidence, guardrail, stairs, handrail, feet FROM pricing_config")
        .map_err(|e| e.to_string())?;
    let pricing_rows = stmt.query_map([], |row| {
        let stage_type: String = row.get(0)?;
        let module: f64 = row.get(1)?;
        let incidence: f64 = row.get(2)?;
        let guardrail: f64 = row.get(3)?;
        let stairs: f64 = row.get(4)?;
        let handrail: f64 = row.get(5)?;
        let feet: f64 = row.get(6)?;
        Ok((stage_type, json!({
            "module": module,
            "incidence": incidence,
            "guardrail": guardrail,
            "stairs": stairs,
            "handrail": handrail,
            "feet": feet
        })))
    }).map_err(|e| e.to_string())?;

    let mut pricing_map = serde_json::Map::new();
    for r in pricing_rows {
        if let Ok((k, v)) = r {
            pricing_map.insert(k, v);
        }
    }

    // Carica pannelli
    let mut stmt = conn.prepare("SELECT panel_name, extra_price FROM panel_config")
        .map_err(|e| e.to_string())?;
    let panel_rows = stmt.query_map([], |row| {
        let panel_name: String = row.get(0)?;
        let extra_price: f64 = row.get(1)?;
        Ok((panel_name, extra_price))
    }).map_err(|e| e.to_string())?;

    let mut panel_map = serde_json::Map::new();
    for r in panel_rows {
        if let Ok((k, v)) = r {
            panel_map.insert(k, json!(v));
        }
    }

    Ok(json!({
        "pricing": Value::Object(pricing_map),
        "panels": Value::Object(panel_map)
    }))
}

#[command]
pub fn save_pricing_config(app: AppHandle, pricing: Value, panels: Value) -> Result<bool, String> {
    let mut conn = get_connection(&app)?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Salva prezzi palchi
    if let Some(pricing_obj) = pricing.as_object() {
        for (stage_type, config) in pricing_obj {
            let module = config["module"].as_f64().unwrap_or(0.0);
            let incidence = config["incidence"].as_f64().unwrap_or(0.0);
            let guardrail = config["guardrail"].as_f64().unwrap_or(0.0);
            let stairs = config["stairs"].as_f64().unwrap_or(0.0);
            let handrail = config["handrail"].as_f64().unwrap_or(0.0);
            let feet = config["feet"].as_f64().unwrap_or(0.0);

            tx.execute(
                "INSERT INTO pricing_config (stage_type, module, incidence, guardrail, stairs, handrail, feet) 
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                 ON CONFLICT(stage_type) DO UPDATE SET 
                    module = excluded.module,
                    incidence = excluded.incidence,
                    guardrail = excluded.guardrail,
                    stairs = excluded.stairs,
                    handrail = excluded.handrail,
                    feet = excluded.feet",
                params![stage_type, module, incidence, guardrail, stairs, handrail, feet],
            ).map_err(|e| e.to_string())?;
        }
    }

    // Salva pannelli
    if let Some(panels_obj) = panels.as_object() {
        for (panel_name, price_val) in panels_obj {
            let extra_price = price_val.as_f64().unwrap_or(0.0);

            tx.execute(
                "INSERT INTO panel_config (panel_name, extra_price) 
                 VALUES (?1, ?2)
                 ON CONFLICT(panel_name) DO UPDATE SET extra_price = excluded.extra_price",
                params![panel_name, extra_price],
            ).map_err(|e| e.to_string())?;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(true)
}

#[command]
pub fn get_warehouse_items(app: AppHandle) -> Result<Vec<Value>, String> {
    let conn = get_connection(&app)?;
    let mut stmt = conn.prepare("SELECT id, stage_type, item_key, description, quantity_available, minimum_threshold, unit FROM warehouse_items ORDER BY stage_type, description")
        .map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        let id: String = row.get(0)?;
        let stage_type: Option<String> = row.get(1)?;
        let item_key: String = row.get(2)?;
        let description: String = row.get(3)?;
        let quantity_available: i32 = row.get(4)?;
        let minimum_threshold: i32 = row.get(5)?;
        let unit: String = row.get(6)?;

        Ok(json!({
            "id": id,
            "stage_type": stage_type,
            "item_key": item_key,
            "description": description,
            "quantity_available": quantity_available,
            "minimum_threshold": minimum_threshold,
            "unit": unit
        }))
    }).map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        if let Ok(item) = r {
            list.push(item);
        }
    }

    Ok(list)
}

#[command]
pub fn adjust_warehouse_item(app: AppHandle, item_id: String, delta: i32, note: String) -> Result<bool, String> {
    let mut conn = get_connection(&app)?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Verifica che l'articolo esista
    let current_qty: i32 = {
        let mut stmt = tx.prepare("SELECT quantity_available FROM warehouse_items WHERE id = ?")
            .map_err(|e| e.to_string())?;
        stmt.query_row(params![item_id], |row| row.get(0))
            .map_err(|e| e.to_string())?
    };

    let new_qty = current_qty + delta;
    let m_type = if delta > 0 { "carico_rifornimento" } else { "correzione_manuale" };

    // Inserisci il movimento
    let mov_id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO warehouse_movements (id, warehouse_item_id, movement_type, quantity_delta, note) VALUES (?, ?, ?, ?, ?)",
        params![mov_id, item_id, m_type, delta, note],
    ).map_err(|e| e.to_string())?;

    // Aggiorna la giacenza
    tx.execute(
        "UPDATE warehouse_items SET quantity_available = ? WHERE id = ?",
        params![new_qty, item_id],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(true)
}

#[command]
pub fn update_warehouse_threshold(app: AppHandle, item_id: String, threshold: i32) -> Result<bool, String> {
    let conn = get_connection(&app)?;
    conn.execute("UPDATE warehouse_items SET minimum_threshold = ? WHERE id = ?", params![threshold, item_id])
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[command]
pub fn get_low_stock_items(app: AppHandle) -> Result<Vec<Value>, String> {
    let conn = get_connection(&app)?;
    let mut stmt = conn.prepare("SELECT id, stage_type, item_key, description, quantity_available, minimum_threshold, unit FROM warehouse_items WHERE quantity_available <= minimum_threshold ORDER BY stage_type, description")
        .map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        let id: String = row.get(0)?;
        let stage_type: Option<String> = row.get(1)?;
        let item_key: String = row.get(2)?;
        let description: String = row.get(3)?;
        let quantity_available: i32 = row.get(4)?;
        let minimum_threshold: i32 = row.get(5)?;
        let unit: String = row.get(6)?;

        Ok(json!({
            "id": id,
            "stage_type": stage_type,
            "item_key": item_key,
            "description": description,
            "quantity_available": quantity_available,
            "minimum_threshold": minimum_threshold,
            "unit": unit
        }))
    }).map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        if let Ok(item) = r {
            list.push(item);
        }
    }

    Ok(list)
}

#[command]
pub fn apply_warehouse_movement(app: AppHandle, quote_id: String, items: Vec<Value>, status: String) -> Result<bool, String> {
    let mut conn = get_connection(&app)?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Recuperiamo lo stage_type dal preventivo
    let stage_type = {
        let mut stmt = tx.prepare("SELECT data FROM quotes WHERE id = ?")
            .map_err(|e| e.to_string())?;
        let data_str: String = stmt.query_row(params![quote_id], |row| row.get(0))
            .map_err(|e| e.to_string())?;
        let quote_data: Value = serde_json::from_str(&data_str).unwrap_or(json!({}));
        quote_data["stageType"].as_str().unwrap_or("DB PRO 6").to_string()
    };

    if status == "sold" {
        // Rimuoviamo prima eventuali movimenti pregressi di questa quote (per evitare doppi scarichi in caso di click ripetuti)
        tx.execute("DELETE FROM warehouse_movements WHERE quote_id = ?", params![quote_id]).ok();
        
        for item in items {
            let desc = item["description"].as_str().unwrap_or("").to_lowercase();
            let quantity = item["quantity"].as_f64().unwrap_or(0.0) as i32;
            if quantity == 0 { continue; }

            // Trova la key dell'articolo basandoci sulla descrizione
            let item_key = if desc.contains("modulo") || desc.contains("moduli") {
                Some("modulo")
            } else if desc.contains("parapett") {
                Some("parapetto")
            } else if desc.contains("scala") || desc.contains("scale") {
                Some("scala")
            } else if desc.contains("corrimano") {
                Some("corrimano")
            } else if desc.contains("piedin") {
                Some("piedino")
            } else if desc.contains("gambe") || desc.contains("gamba") {
                Some("gamba_telescopica")
            } else {
                None
            };

            if let Some(k) = item_key {
                // Trova l'id dell'articolo nel magazzino per quel modello di palco
                let item_res: Option<(String, i32)> = {
                    let mut stmt = tx.prepare("SELECT id, quantity_available FROM warehouse_items WHERE stage_type = ? AND item_key = ?")
                        .map_err(|e| e.to_string())?;
                    stmt.query_row(params![stage_type, k], |row| {
                        Ok((row.get(0)?, row.get(1)?))
                    }).optional().map_err(|e| e.to_string())?
                };

                if let Some((item_id, cur_qty)) = item_res {
                    let new_qty = cur_qty - quantity;
                    let mov_id = Uuid::new_v4().to_string();
                    
                    tx.execute(
                        "INSERT INTO warehouse_movements (id, warehouse_item_id, quote_id, movement_type, quantity_delta, note) VALUES (?, ?, ?, 'scarico_vendita', ?, ?)",
                        params![mov_id, item_id, quote_id, -quantity, format!("Scarico automatico preventivo venduto {}", quote_id)],
                    ).map_err(|e| e.to_string())?;

                    tx.execute(
                        "UPDATE warehouse_items SET quantity_available = ? WHERE id = ?",
                        params![new_qty, item_id],
                    ).map_err(|e| e.to_string())?;
                }
            }
        }
    } else {
        // Se lo stato torna a draft, inseriamo i movimenti di ripristino per ri-caricare il materiale
        // Prima vediamo se ci sono già scarichi per questa quote
        let movements_to_restore = {
            let mut stmt = tx.prepare("SELECT warehouse_item_id, quantity_delta FROM warehouse_movements WHERE quote_id = ? AND movement_type = 'scarico_vendita'")
                .map_err(|e| e.to_string())?;
            
            let movements_rows = stmt.query_map(params![quote_id], |row| {
                let w_item_id: String = row.get(0)?;
                let qty_delta: i32 = row.get(1)?;
                Ok((w_item_id, qty_delta))
            }).map_err(|e| e.to_string())?;

            let mut list = Vec::new();
            for r in movements_rows {
                if let Ok(m) = r {
                    list.push(m);
                }
            }
            list
        };

        // Eliminiamo i record vecchi per questa quote per non ingolfare
        tx.execute("DELETE FROM warehouse_movements WHERE quote_id = ?", params![quote_id]).ok();

        for (w_item_id, old_delta) in movements_to_restore {
            // Poiché lo scarico era negativo (es. -16), la quantità da ripristinare è positiva (es. 16)
            let restore_delta = -old_delta;
            if restore_delta <= 0 { continue; }

            // Trova la quantità attuale
            let cur_qty: i32 = {
                let mut stmt = tx.prepare("SELECT quantity_available FROM warehouse_items WHERE id = ?")
                    .map_err(|e| e.to_string())?;
                stmt.query_row(params![w_item_id], |row| row.get(0))
                    .map_err(|e| e.to_string())?
            };

            let new_qty = cur_qty + restore_delta;
            let mov_id = Uuid::new_v4().to_string();

            tx.execute(
                "INSERT INTO warehouse_movements (id, warehouse_item_id, quote_id, movement_type, quantity_delta, note) VALUES (?, ?, ?, 'ripristino_annullo_vendita', ?, ?)",
                params![mov_id, w_item_id, quote_id, restore_delta, format!("Ripristino annullo vendita preventivo {}", quote_id)],
            ).map_err(|e| e.to_string())?;

            tx.execute(
                "UPDATE warehouse_items SET quantity_available = ? WHERE id = ?",
                params![new_qty, w_item_id],
            ).map_err(|e| e.to_string())?;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(true)
}
