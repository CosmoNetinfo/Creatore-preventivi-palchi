CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY,
    quote_number TEXT NOT NULL UNIQUE,
    client_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    data TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pricing_config (
    stage_type TEXT PRIMARY KEY,
    module REAL NOT NULL,
    incidence REAL NOT NULL,
    guardrail REAL NOT NULL,
    stairs REAL NOT NULL,
    handrail REAL NOT NULL,
    feet REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS panel_config (
    panel_name TEXT PRIMARY KEY,
    extra_price REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS quote_counters (
    year INTEGER PRIMARY KEY,
    last_number INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS warehouse_items (
    id TEXT PRIMARY KEY,
    stage_type TEXT,
    item_key TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity_available INTEGER NOT NULL DEFAULT 0,
    minimum_threshold INTEGER NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'pz',
    UNIQUE(stage_type, item_key)
);

CREATE TABLE IF NOT EXISTS warehouse_movements (
    id TEXT PRIMARY KEY,
    warehouse_item_id TEXT NOT NULL REFERENCES warehouse_items(id),
    quote_id TEXT REFERENCES quotes(id),
    movement_type TEXT NOT NULL,
    quantity_delta INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    note TEXT
);

-- Popolamento seed prezzi di base
INSERT OR IGNORE INTO pricing_config (stage_type, module, incidence, guardrail, stairs, handrail, feet) VALUES
('DB PRO 6', 109.80, 4.90, 39.50, 395.00, 94.90, 19.80),
('DB PRO 6 INOX', 129.80, 5.80, 54.80, 448.80, 108.90, 19.80),
('MINI', 129.80, 5.80, 39.50, 345.00, 89.80, 19.80),
('MINI INOX', 154.80, 6.80, 54.80, 395.00, 105.90, 19.80),
('PEDANA', 97.80, 0, 39.50, 395.00, 94.90, 12.80);

-- Popolamento seed pannelli
INSERT OR IGNORE INTO panel_config (panel_name, extra_price) VALUES
('Pannelli Gialli', 0),
('Pannelli Kauffmann', 10.00),
('Multistrato di Betulla', 45.00);

-- Popolamento seed magazzino per ogni tipologia di palco
-- Componenti tracciati: modulo, parapetto, scala, corrimano, piedino, gamba_telescopica
INSERT OR IGNORE INTO warehouse_items (id, stage_type, item_key, description, quantity_available, minimum_threshold, unit) VALUES
('w-db6-mod', 'DB PRO 6', 'modulo', 'Moduli Palco DB PRO 6', 0, 10, 'mq'),
('w-db6-para', 'DB PRO 6', 'parapetto', 'Parapetti di Sicurezza DB PRO 6', 0, 5, 'pz'),
('w-db6-scala', 'DB PRO 6', 'scala', 'Scale di Accesso DB PRO 6', 0, 2, 'pz'),
('w-db6-corr', 'DB PRO 6', 'corrimano', 'Corrimano Scaletta DB PRO 6', 0, 4, 'pz'),
('w-db6-piedi', 'DB PRO 6', 'piedino', 'Piedini Regolabili DB PRO 6', 0, 20, 'pz'),
('w-db6-gambe', 'DB PRO 6', 'gamba_telescopica', 'Gambe Telescopiche DB PRO 6', 0, 20, 'pz'),

('w-db6i-mod', 'DB PRO 6 INOX', 'modulo', 'Moduli Palco DB PRO 6 INOX', 0, 10, 'mq'),
('w-db6i-para', 'DB PRO 6 INOX', 'parapetto', 'Parapetti di Sicurezza DB PRO 6 INOX', 0, 5, 'pz'),
('w-db6i-scala', 'DB PRO 6 INOX', 'scala', 'Scale di Accesso DB PRO 6 INOX', 0, 2, 'pz'),
('w-db6i-corr', 'DB PRO 6 INOX', 'corrimano', 'Corrimano Scaletta DB PRO 6 INOX', 0, 4, 'pz'),
('w-db6i-piedi', 'DB PRO 6 INOX', 'piedino', 'Piedini Regolabili DB PRO 6 INOX', 0, 20, 'pz'),
('w-db6i-gambe', 'DB PRO 6 INOX', 'gamba_telescopica', 'Gambe Telescopiche DB PRO 6 INOX', 0, 20, 'pz'),

('w-mini-mod', 'MINI', 'modulo', 'Moduli Palco MINI', 0, 10, 'mq'),
('w-mini-para', 'MINI', 'parapetto', 'Parapetti di Sicurezza MINI', 0, 5, 'pz'),
('w-mini-scala', 'MINI', 'scala', 'Scale di Accesso MINI', 0, 2, 'pz'),
('w-mini-corr', 'MINI', 'corrimano', 'Corrimano Scaletta MINI', 0, 4, 'pz'),
('w-mini-piedi', 'MINI', 'piedino', 'Piedini Regolabili MINI', 0, 20, 'pz'),
('w-mini-gambe', 'MINI', 'gamba_telescopica', 'Gambe Telescopiche MINI', 0, 20, 'pz'),

('w-minii-mod', 'MINI INOX', 'modulo', 'Moduli Palco MINI INOX', 0, 10, 'mq'),
('w-minii-para', 'MINI INOX', 'parapetto', 'Parapetti di Sicurezza MINI INOX', 0, 5, 'pz'),
('w-minii-scala', 'MINI INOX', 'scala', 'Scale di Accesso MINI INOX', 0, 2, 'pz'),
('w-minii-corr', 'MINI INOX', 'corrimano', 'Corrimano Scaletta MINI INOX', 0, 4, 'pz'),
('w-minii-piedi', 'MINI INOX', 'piedino', 'Piedini Regolabili MINI INOX', 0, 20, 'pz'),
('w-minii-gambe', 'MINI INOX', 'gamba_telescopica', 'Gambe Telescopiche MINI INOX', 0, 20, 'pz'),

('w-ped-mod', 'PEDANA', 'modulo', 'Moduli Pedana', 0, 10, 'mq'),
('w-ped-para', 'PEDANA', 'parapetto', 'Parapetti di Sicurezza Pedana', 0, 5, 'pz'),
('w-ped-scala', 'PEDANA', 'scala', 'Scale di Accesso Pedana', 0, 2, 'pz'),
('w-ped-corr', 'PEDANA', 'corrimano', 'Corrimano Scaletta Pedana', 0, 4, 'pz'),
('w-ped-piedi', 'PEDANA', 'piedino', 'Piedini Regolabili Pedana', 0, 20, 'pz'),
('w-ped-gambe', 'PEDANA', 'gamba_telescopica', 'Gambe Telescopiche Pedana', 0, 20, 'pz');
