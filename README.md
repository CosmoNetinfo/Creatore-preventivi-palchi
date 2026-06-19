# EasyEvent Desktop

![EasyEvent Logo](public/brand/logo_completo.png)

Applicazione desktop standalone (Windows + macOS) per la creazione di preventivi, checklist di carico, schede di produzione e tracciamento automatico del magazzino per palchi modulari da noleggio (EasyEvent S.r.l.s.).

Sviluppata con **Tauri 2**, **React 19**, **TypeScript**, **Vite** e **SQLite**.

## 📥 Download e Installazione

Puoi scaricare l'applicazione pre-compilata per il tuo sistema operativo direttamente dalla pagina delle release del repository GitHub:

👉 **[Scarica l'Ultima Versione (Windows / macOS)](https://github.com/CosmoNetinfo/Creatore-preventivi-palchi/releases)**

* **Windows**: Scarica e installa il pacchetto `.msi` (o avvia `.exe`).
* **macOS**: Scarica il file `.dmg`, aprilo e trascina l'app nella cartella Applicazioni.

---

## 🚀 Caratteristiche Principali

* **Persistenza Locale**: Nessun login o autenticazione remota. I preventivi vengono archiviati direttamente sul tuo PC/Mac in un database SQLite locale autogestito.
* **Geocoding Offline**: Risoluzione automatica di Comune, Provincia e Regione scrivendo il nome di frazioni o paesi (es. "San Giacomo di Spoleto") tramite dataset statico offline di oltre 8.000 comuni italiani (`public/comuni-italia.json`). Nessuna chiamata API o costo di rete.
* **Gestione Magazzino**: 
  * Tracciamento automatico dei pezzi fisici in magazzino (moduli, parapetti, piedi, scale) per ogni tipologia di palco.
  * Scarico automatico al passaggio del preventivo in stato **VENDUTO**.
  * Ripristino automatico delle scorte in caso di annullamento (ritorno a *bozza*).
  * Gestione e allerta visiva di articoli sotto la soglia minima impostabile.
* **Esportazione PDF e Stampa**: Funzionalità di stampa integrata nella webview nativa di Tauri (collegata direttamente alla stampa del sistema operativo, permettendo di stampare o salvare direttamente in PDF).
* **CI/CD Integrato**: Compilazione e packaging automatizzati per Windows (`.msi` / `.exe`) e macOS (`.dmg`) ad ogni rilascio tramite GitHub Actions.

---

## 🛠️ Stack Tecnologico

* **Frontend**: React 19, Vite, Tailwind CSS, Lucide React, TypeScript
* **Backend**: Rust, Tauri 2
* **Database**: SQLite (tramite `rusqlite` con compilazione statica)

---

## 📂 Struttura del Progetto

```
easyevent-desktop/
├── .github/
│   └── workflows/
│       └── release.yml            # Pipeline CI/CD GitHub Actions (build Windows e macOS)
├── src/                           # Codice sorgente React Frontend
│   ├── components/                # Componenti della UI (QuoteEditor, QuotePreview, Warehouse, ecc.)
│   ├── services/                  # Database Service (nativi Tauri invoke) e Geocoding
│   ├── types.ts                   # Tipi TypeScript
│   ├── App.tsx                    # Layout principale e Tab routing
│   └── main.tsx                   # Punto di ingresso React
├── src-tauri/                     # Backend Nativo Rust
│   ├── src/
│   │   ├── main.rs                # Inizializzazione Tauri e registrazione comandi
│   │   ├── db.rs                  # Connessione SQLite locale e migrazioni all'avvio
│   │   └── commands.rs            # Logica dei comandi SQLite (CRUD, Magazzino)
│   ├── migrations/
│   │   └── 001_init.sql           # Schema SQL e seed iniziale dei listini/scorte
│   ├── Cargo.toml                 # Dipendenze Rust (Tauri 2, rusqlite, serde)
│   └── tauri.conf.json            # Configurazione Tauri 2 e capability
├── public/                        # Risorse statiche (dataset comuni-italia.json, favicon)
├── package.json                   # Script e dipendenze Node.js
└── tailwind.config.js             # Configurazione Tailwind CSS
```

---

## 💻 Come Eseguire Localmente

### Prerequisiti
* **Node.js** (v18 o superiore)
* **Rust** e Cargo (vedi la [documentazione di installazione Tauri](https://tauri.app/start/prerequisites/))

### Installazione
Installa le dipendenze npm:
```bash
npm install
```

### Sviluppo
Avvia l'applicazione in modalità sviluppo (sia frontend che webview desktop Tauri):
```bash
npm run tauri dev
```

### Build Locale
Se desideri compilare l'eseguibile di produzione localmente sul tuo sistema operativo corrente:
```bash
npm run tauri build
```

---

## ⚙️ CI/CD & Build Automatizzata (GitHub Actions)

L'applicazione è configurata per generare le build di rilascio Windows e macOS in automatico tramite **GitHub Actions**.

### Come rilasciare una nuova versione:
1. Crea un nuovo tag di rilascio git (es. `v1.0.0`):
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
2. GitHub Actions rileverà il tag ed eseguirà la pipeline (`release.yml`), compilando l'app sia su runner Windows che macOS.
3. Al termine della compilazione, gli installer (`.msi` / `.exe` e `.dmg`) verranno allegati come **Bozza di Rilascio (Draft Release)** sulla pagina GitHub del tuo repository, pronti per essere distribuiti.

---

## 🎨 Risorse Grafiche (Branding)

I loghi e le icone ufficiali dell'applicazione sono memorizzati all'interno della cartella `public/brand/` per l'uso nel build template e la documentazione:

* **Logo Completo (PNG)**
  
  ![Logo Completo](public/brand/logo_completo.png)

* **Logo Vettoriale (SVG)**
  
  ![Logo SVG](public/brand/easyevent_logo.svg)

* **Icona App 512px (PNG)**
  
  ![Icona App](public/brand/icona_app_512px.png)

* **Icona Vettoriale (SVG)**
  
  ![Icona SVG](public/brand/easyevent_icon.svg)

