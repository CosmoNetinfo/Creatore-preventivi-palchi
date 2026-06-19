# Brief Tecnico — EasyEvent Gestionale Preventivi → App Desktop (Windows + Mac)

Da dare ad Antigravity per l'implementazione. Questo documento descrive lo stato attuale, gli errori da correggere e l'architettura target.

---

## 1. Stato attuale (cosa è stato analizzato)

Il progetto `gestionale_easyevent.zip` è un'app React 19 + Vite generata da Google AI Studio, pensata per girare nel browser con un backend PHP/MySQL **mai implementato**. È un tool di preventivazione per palchi modulari da noleggio (EasyEvent S.r.l.s.), con anteprima preventivo, distinta di produzione e nota di consegna/checklist carico.

### Errori e criticità riscontrati

1. **Backend assente**: `api.php` e `install.sql` sono file vuoti (0 byte). Tutte le chiamate in `services/database.ts` e `services/authService.ts` falliscono e cadono nei `catch` con dati finti o array vuoti.
2. **Password admin in chiaro nel codice client** (`services/authService.ts`, righe 42-48): `admin / DonBrazzo01!` hardcoded come fallback "anteprima". **Da eliminare completamente**, non spostare altrove.
3. **Nessuna persistenza reale**: solo `localStorage` per logo e sessione finta.
4. **Dipendenza cloud non necessaria**: `@google/genai` con API key in `.env.local` per due funzioni minori (riscrittura testo discorsivo, geocoding "intelligente" di una località italiana scritta in linguaggio naturale).
5. **Architettura solo-browser**: `window.print()` per la stampa, fetch HTTP per tutto, niente filesystem.

### Decisioni prese con il committente (Dany)

- **Nessun login**: l'app è mono-utente, locale, sul suo PC/Mac. Si elimina il problema della password in chiaro alla radice invece di "spostarla in sicurezza".
- **Niente AI/Gemini**: la riscrittura testo si rimuove. Il geocoding si sostituisce con una libreria/dataset offline di comuni italiani (non serve un servizio cloud per risolvere "San Giacomo di Spoleto" → Comune/Provincia/Regione).

---

## 2. Stack target

- **Tauri 2** (Rust backend + WebView), coerente con lo stack già usato da Dany per WolfMind/Kashy Desktop.
- **Frontend**: React 19 + TypeScript + Vite — **riusare quasi integralmente** i componenti esistenti (`QuoteEditor.tsx`, `QuotePreview.tsx`, `ProductionSheet.tsx`, `DeliveryNote.tsx`), che contengono la logica di business (formule di calcolo moduli, gambe, scale, parapetti) e vanno preservati. Tailwind via CDN nell'attuale `index.html` va sostituito con Tailwind installato come dipendenza di build (il CDN script non funziona bene in un contesto Tauri offline/packaged).
- **Persistenza**: SQLite locale via `tauri-plugin-sql` (sqlx sotto il cofano). Sostituisce sia `api.php` sia `install.sql`.
- **Stampa/PDF**: rimuovere `window.print()`. Usare un comando Rust che genera PDF dall'HTML del componente attivo (es. crate `wkhtmltopdf`-style o, più semplice, mantenere la stampa di sistema nativa tramite `tauri-plugin-shell`/webview print API di Tauri, che richiama il dialogo di stampa del sistema operativo — più semplice da implementare ed equivalente all'attuale UX).
- **Geocoding offline**: dataset statico comuni italiani (es. JSON con Comune/Provincia/Regione, ne esistono dataset pubblici ISTAT) bundlato nell'app, lookup fuzzy lato Rust o JS — nessuna chiamata di rete.

---

## 3. Struttura cartelle proposta

```
easyevent-desktop/
├── src/                          # Frontend React (quasi 1:1 dal progetto originale)
│   ├── components/
│   │   ├── QuoteEditor.tsx        # da modificare: rimuovere chiamate Gemini, AuthService
│   │   ├── QuotePreview.tsx       # invariato
│   │   ├── ProductionSheet.tsx    # invariato
│   │   └── DeliveryNote.tsx       # invariato
│   ├── services/
│   │   ├── database.ts            # da riscrivere: chiama invoke() Tauri invece di fetch()
│   │   └── geocoding.ts           # NUOVO: sostituisce geminiService.ts, lookup offline
│   ├── types.ts                   # invariato
│   ├── App.tsx                    # da modificare: rimuovere route/stato di Login
│   └── main.tsx                   # invariato (era index.tsx)
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── db.rs                  # connessione SQLite + migrazioni
│   │   └── commands.rs            # comandi invoke: save_quote, get_quotes, get_next_number, ecc.
│   ├── migrations/
│   │   └── 001_init.sql           # sostituisce install.sql
│   ├── Cargo.toml
│   └── tauri.conf.json
├── public/
│   └── comuni-italia.json         # dataset geocoding offline
└── package.json
```

---

## 4. Schema SQLite (sostituisce `install.sql`, che era vuoto)

```sql
CREATE TABLE quotes (
    id TEXT PRIMARY KEY,              -- uuid generato lato Rust o JS
    quote_number TEXT NOT NULL UNIQUE,
    client_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',   -- 'draft' | 'sold'
    data TEXT NOT NULL,               -- JSON serializzato di QuoteData
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE pricing_config (
    stage_type TEXT PRIMARY KEY,      -- 'DB PRO 6', 'MINI', ecc.
    module REAL NOT NULL,
    incidence REAL NOT NULL,
    guardrail REAL NOT NULL,
    stairs REAL NOT NULL,
    handrail REAL NOT NULL,
    feet REAL NOT NULL
);

CREATE TABLE panel_config (
    panel_name TEXT PRIMARY KEY,
    extra_price REAL NOT NULL DEFAULT 0
);

CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT
);
-- usata per: logo_url, ultimo anno numerazione, ecc.

CREATE TABLE quote_counters (
    year INTEGER PRIMARY KEY,
    last_number INTEGER NOT NULL DEFAULT 0
);

-- MAGAZZINO (nuova funzionalità, vedi sezione 12)
CREATE TABLE warehouse_items (
    id TEXT PRIMARY KEY,               -- uuid
    stage_type TEXT,                   -- es. 'DB PRO 6', 'MINI', NULL se componente trasversale (es. scale, se condivise)
    item_key TEXT NOT NULL,            -- es. 'modulo', 'parapetto', 'scala', 'piedino', 'corrimano', 'gamba_telescopica'
    description TEXT NOT NULL,         -- etichetta leggibile, es. "Moduli Palco DB PRO 6"
    quantity_available INTEGER NOT NULL DEFAULT 0,
    minimum_threshold INTEGER NOT NULL DEFAULT 0,  -- soglia minima di avviso, configurabile per pezzo
    unit TEXT NOT NULL DEFAULT 'pz',   -- 'pz', 'mq', 'mt' (i moduli si contano a mq, non a pezzo)
    UNIQUE(stage_type, item_key)
);

CREATE TABLE warehouse_movements (
    id TEXT PRIMARY KEY,
    warehouse_item_id TEXT NOT NULL REFERENCES warehouse_items(id),
    quote_id TEXT REFERENCES quotes(id),   -- NULL se movimento manuale (rifornimento, correzione)
    movement_type TEXT NOT NULL,           -- 'scarico_vendita' | 'carico_rifornimento' | 'correzione_manuale' | 'ripristino_annullo_vendita'
    quantity_delta INTEGER NOT NULL,       -- negativo per scarico, positivo per carico
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    note TEXT
);
```

Popolare `pricing_config` e `panel_config` con i valori attualmente hardcoded in `QuoteEditor.tsx` (`DEFAULT_STAGE_PRICING`, `DEFAULT_PANEL_TYPES`) come seed iniziale, editabili poi da una schermata impostazioni (oggi assente: andrebbe aggiunta una piccola UI "Listino Prezzi", dato che `savePriceList`/`loadPriceList` esistevano già lato client ma senza backend reale).

---

## 5. Mapping comandi: `DatabaseService` (HTTP) → Tauri `invoke()`

Ogni metodo in `services/database.ts` chiamava `fetch('./api.php?action=...')`. Vanno sostituiti 1:1 con comandi Rust esposti via `#[tauri::command]`:

| Metodo attuale (database.ts)      | Comando Tauri da creare      | Note |
|---|---|---|
| `checkConnection()`                | rimuovere — non serve più    | era un check di rete, in locale non ha senso |
| `getNextQuoteNumber(year)`         | `get_next_quote_number(year)` | incrementa `quote_counters`, ritorna stringa tipo `OFF-2026-001` |
| `saveQuote(quote)`                 | `save_quote(quote_json)`     | upsert su `quotes` (insert se nuovo id, update se esiste) |
| `sendQuoteEmail(quote)`            | `send_quote_email(quote_json)` | **da decidere con Dany**: serve un client SMTP lato Rust (es. crate `lettre`) con credenziali email inserite nelle impostazioni dell'app, oppure si rimuove la funzione e si lascia solo export PDF da allegare manualmente |
| `getQuotes()`                      | `get_quotes()`                | `SELECT * FROM quotes ORDER BY created_at DESC` |
| `deleteQuote(id)`                  | `delete_quote(id)`            | `DELETE FROM quotes WHERE id = ?` |
| `loadPriceList()`                  | `get_pricing_config()`        | legge `pricing_config` + `panel_config` |
| `savePriceList(pricing, panels)`   | `save_pricing_config(...)`    | upsert sulle due tabelle |

`services/database.ts` lato frontend diventa un wrapper sottile su `@tauri-apps/api/core` → `invoke('save_quote', { quote })` ecc., mantenendo la stessa interfaccia pubblica usata da `App.tsx` e `QuoteEditor.tsx` per minimizzare le modifiche ai componenti.

---

## 6. Cosa rimuovere completamente

- `services/authService.ts` — l'intero file, **non solo la password hardcoded**.
- `components/Login.tsx` — l'intero file.
- In `App.tsx`: ogni stato/render legato al login (al momento App.tsx non lo gestisce direttamente, verificare se è gestito a livello di `main.tsx`/router non incluso nello zip — se manca un `AuthGuard` esterno allo zip, va comunque verificato e rimosso).
- `services/geminiService.ts` — l'intero file.
- In `QuoteEditor.tsx`: la funzione `handleLocationLookup` va riscritta per chiamare `services/geocoding.ts` (nuovo, offline) invece di `getLocationInfo` da Gemini. L'icona "Sparkles"/AI nel pulsante può restare come lente di ricerca semplice.
- `@google/genai` da `package.json`.
- `.env.local` e ogni riferimento a `GEMINI_API_KEY` in `vite.config.ts`.
- `api.php` (vuoto, sostituito dai comandi Tauri).
- `install.sql` (vuoto, sostituito dalle migrazioni Rust).
- Lo script Tailwind CDN in `index.html` → installare `tailwindcss` come devDependency con build classico (`postcss.config.js`, `tailwind.config.js`), mantenendo gli stessi colori custom `brand-*` già definiti inline.

---

## 7. Geocoding offline (sostituisce Gemini)

Obiettivo: dato un testo libero come "San Giacomo di Spoleto", risolvere Comune/Provincia/Regione.

Approccio consigliato:
1. Bundlare un dataset JSON dei comuni italiani con frazioni principali (esistono dataset ISTAT/GitHub pubblici con Comune, Sigla Provincia, Regione, e talvolta elenco frazioni).
2. Lookup fuzzy lato JS (es. libreria leggera come `fuzzysort`, già zero-dipendenze pesanti) sul campo "frazione" o "comune" più vicino al testo inserito.
3. Se non trovato, l'utente compila Comune/Provincia/Regione a mano come già previsto dall'interfaccia attuale (i tre campi editabili esistono già in `QuoteEditor.tsx`).

Questo elimina la necessità di rete, chiave API, e costi di token per una funzione che è in pratica un dizionario.

---

## 8. Stampa / Export PDF

L'attuale `window.print()` in `App.tsx` (funzione `handlePrint`) va sostituito. Due opzioni, da scegliere in fase di implementazione:

- **Opzione A (più semplice)**: usare l'API di stampa nativa della WebView Tauri (richiama il dialogo di stampa di sistema, l'utente sceglie "Salva come PDF" come già fa oggi nel browser). Cambio minimo di codice.
- **Opzione B (più professionale)**: generare il PDF lato Rust da HTML (es. crate `headless_chrome` o rendering diretto), con salvataggio diretto su disco via dialogo "Salva file" nativo (`tauri-plugin-dialog`). Più lavoro ma risultato più solido per un gestionale.

Si consiglia di partire con l'Opzione A per il primo rilascio funzionante, e valutare l'Opzione B in seguito se necessario.

---

## 9. Funzione email (da chiarire)

`sendQuoteEmail` esisteva nell'interfaccia ma senza backend funzionante. Per l'app desktop, se Dany vuole mantenerla, serve:
- Un client SMTP lato Rust (crate `lettre`) con credenziali (server, porta, utente, password) configurabili in una schermata Impostazioni e salvate in `app_settings` (mai in chiaro nel codice).
- Oppure, più semplice: rimuovere l'invio email automatico e lasciare solo "Esporta PDF" + "Apri client di posta con allegato" (l'utente allega manualmente).

**Da confermare con Dany prima dell'implementazione**, non è bloccante per il resto del lavoro.

---

## 10. Riepilogo modifiche per file esistente

| File | Azione |
|---|---|
| `App.tsx` | Rimuovere ogni riferimento a stato di login; aggiornare `handlePrint` |
| `types.ts` | Nessuna modifica |
| `components/QuoteEditor.tsx` | Sostituire import `getLocationInfo` (Gemini) con `services/geocoding.ts`; nessun'altra modifica alla logica di calcolo |
| `components/QuotePreview.tsx` | Nessuna modifica |
| `components/ProductionSheet.tsx` | Nessuna modifica |
| `components/DeliveryNote.tsx` | Nessuna modifica |
| `components/Login.tsx` | **Eliminare** |
| `services/database.ts` | Riscrivere: da `fetch()` a `invoke()` Tauri |
| `services/authService.ts` | **Eliminare** |
| `services/geminiService.ts` | **Eliminare**, sostituito da `services/geocoding.ts` |
| `api.php` | **Eliminare**, sostituito da comandi Rust |
| `install.sql` | **Eliminare**, sostituito da migrazioni Rust |
| `.env.local` | **Eliminare** |
| `package.json` | Rimuovere `@google/genai`; aggiungere `@tauri-apps/api`, `@tauri-apps/cli`, `tailwindcss`, `postcss`, `autoprefixer` |
| `vite.config.ts` | Rimuovere `define` su `GEMINI_API_KEY`; configurare per build Tauri |
| `index.html` | Rimuovere script CDN Tailwind |
| `App.tsx` | Aggiungere anche tab "Magazzino" (vedi sezione 12) |
| _nuovo_ `components/Warehouse.tsx` | Schermata gestione magazzino, da creare |

---

## 12. Magazzino (nuova funzionalità richiesta da Dany)

Obiettivo: tracciare in SQLite cosa c'è fisicamente in officina (pezzi per tipo di palco) e scalarlo automaticamente quando un preventivo viene segnato come **VENDUTO**, così l'app mostra sempre disponibilità reale e cosa manca prima di accettare un nuovo lavoro.

### Logica

- **Trigger di scarico**: quando `markAsSold` in `QuoteEditor.tsx` passa lo stato a `'sold'` (oggi fa solo `onChange` + `DatabaseService.saveQuote`), va aggiunta una chiamata `invoke('apply_warehouse_movement', { quoteId, items: data.items })` che:
  1. Per ogni `LineItem` del preventivo, identifica a quale `warehouse_items` corrisponde (matching su `stage_type` + parola chiave nella `description`, es. "Moduli" → `item_key = 'modulo'`, "Parapetti" → `'parapetto'`, ecc. — stessa logica di pattern-matching già usata in `ProductionSheet.tsx`/`DeliveryNote.tsx` per leggere le specs).
  2. Inserisce una riga in `warehouse_movements` con `movement_type = 'scarico_vendita'` e `quantity_delta` negativo pari a `item.quantity`.
  3. Aggiorna `quantity_available` in `warehouse_items`.
- **Annullamento vendita**: se l'utente clicca di nuovo su "Segna come venduto" per tornare a `draft` (il toggle esiste già in `markAsSold`), va generato il movimento inverso (`ripristino_annullo_vendita`, `quantity_delta` positivo) per non perdere coerenza nei numeri.
- **Rifornimento manuale**: nuova piccola schermata "Magazzino" nell'app (non esiste oggi, va creata) dove Dany inserisce/aggiorna le quantità disponibili per pezzo quando arriva nuovo materiale o fa inventario — genera movimenti `carico_rifornimento` o `correzione_manuale`.
- **Tracciamento per modello specifico**: ogni componente è legato al `stage_type` (DB PRO 6, DB PRO 6 INOX, MINI, MINI INOX, PEDANA), quindi i moduli DB PRO 6 e i moduli MINI sono righe distinte in `warehouse_items`, con disponibilità e soglie indipendenti. Componenti potenzialmente condivisi fra modelli (es. scale, se fisicamente intercambiabili) vanno chiariti con Dany in fase di seed iniziale — il campo `stage_type` può restare `NULL` per quelli.
- **Soglia minima e avviso**: ogni riga di `warehouse_items` ha `minimum_threshold` configurabile dalla stessa schermata Magazzino. L'interfaccia mostra un badge/colore (es. rosso) quando `quantity_available <= minimum_threshold`, e si può aggiungere un riepilogo "Sotto soglia" in cima alla schermata Magazzino o come notifica all'apertura dell'app.

### Comandi Tauri da aggiungere

| Comando | Cosa fa |
|---|---|
| `get_warehouse_items()` | Lista completa con disponibilità e soglie, per la schermata Magazzino |
| `apply_warehouse_movement(quote_id, items)` | Scarico automatico alla vendita (o ripristino all'annullo) |
| `adjust_warehouse_item(item_id, delta, note)` | Rifornimento/correzione manuale |
| `update_warehouse_threshold(item_id, threshold)` | Aggiorna soglia minima |
| `get_low_stock_items()` | Lista pezzi sotto soglia, per l'avviso |

### UI da aggiungere

Una nuova voce/tab "Magazzino" accanto a Preventivo / Checklist Carico / Produzione in `App.tsx`, con:
- Tabella pezzi (modello palco, componente, disponibile, soglia, unità di misura) con evidenza visiva sotto soglia.
- Form rapido per rifornimento/correzione.
- Eventualmente, nella vista Preventivo, un'indicazione se i pezzi richiesti dal preventivo corrente superano la disponibilità (utile prima di accettare l'ordine, anche se lo scarico vero avviene solo alla vendita).

### Seed iniziale

Il primo avvio dell'app dovrebbe creare righe vuote (`quantity_available = 0`) in `warehouse_items` per ogni combinazione `stage_type` + componente usata da `addStageItem` in `QuoteEditor.tsx` (moduli, incidenza certificazione — non è un pezzo fisico quindi va escluso —, fissaggio, piedini, gambe telescopiche, parapetti, scale, corrimano), così Dany può subito inserire le quantità reali al primo utilizzo senza dover creare manualmente ogni riga.

---

## 13. Note per Antigravity

- I componenti `QuoteEditor`, `QuotePreview`, `ProductionSheet`, `DeliveryNote` contengono **logica di business critica** (formule di calcolo gambe/telai/moduli, prezzi) — non vanno riscritti, solo adattati nelle dipendenze esterne (database e geocoding).
- Target: build separate per Windows (`.msi`/`.exe`) e macOS (`.dmg`) tramite `tauri build`, secondo la pipeline standard di Tauri 2 con GitHub Actions se si vuole automatizzare (Dany ha già esperienza con GitHub Actions su CosmoNet Reader).
- Mantenere coerenza di stile con WolfMind (altro progetto Tauri di Dany) per riusare pattern già rodati su quel progetto.
