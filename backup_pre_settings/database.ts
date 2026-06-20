import { QuoteData, PricingConfig, PanelConfig, QuoteRecord } from '../types';
import { invoke } from '@tauri-apps/api/core';

// Rileva se l'applicazione è in esecuzione all'interno del container nativo Tauri
const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

if (!isTauri) {
  console.warn(
    "DatabaseService: Rilevato browser web standard. I dati verranno salvati in LocalStorage invece che nel database SQLite nativo."
  );
}

// Dati predefiniti per il magazzino in modalità demo browser
const DEFAULT_WAREHOUSE = [
  { id: 'panel_wood_100x100', name: 'Pedana Legno 100x100 cm', stock: 50, min_threshold: 5 },
  { id: 'panel_wood_200x100', name: 'Pedana Legno 200x100 cm', stock: 120, min_threshold: 10 },
  { id: 'panel_inox_100x100', name: 'Pedana Inox/Grigliato 100x100 cm', stock: 20, min_threshold: 3 },
  { id: 'panel_inox_200x100', name: 'Pedana Inox/Grigliato 200x100 cm', stock: 45, min_threshold: 5 },
  { id: 'leg_fixed_20', name: 'Piede Fisso h 20 cm', stock: 300, min_threshold: 20 },
  { id: 'leg_fixed_40', name: 'Piede Fisso h 40 cm', stock: 250, min_threshold: 20 },
  { id: 'leg_fixed_60', name: 'Piede Fisso h 60 cm', stock: 200, min_threshold: 20 },
  { id: 'leg_fixed_80', name: 'Piede Fisso h 80 cm', stock: 180, min_threshold: 20 },
  { id: 'leg_fixed_100', name: 'Piede Fisso h 100 cm', stock: 150, min_threshold: 20 },
  { id: 'leg_telescopic_60_100', name: 'Piede Telescopico 60-100 cm', stock: 120, min_threshold: 15 },
  { id: 'leg_telescopic_100_180', name: 'Piede Telescopico 100-180 cm', stock: 80, min_threshold: 10 },
];

export const DatabaseService = {
  
  /**
   * Ottiene il prossimo numero preventivo disponibile
   */
  async getNextQuoteNumber(year: number): Promise<string> {
    if (!isTauri) {
      const quotes = await this.getQuotes();
      const currentYearQuotes = quotes.filter(q => q.quote_number.includes(`-${year}-`));
      const nextNum = currentYearQuotes.length + 1;
      return `PREV-${year}-${String(nextNum).padStart(3, '0')}`;
    }
    try {
      return await invoke<string>('get_next_quote_number', { year });
    } catch (error) {
      console.error("Errore nel recupero numero preventivo:", error);
      return `OFF-${year}-ERR-${Math.floor(Math.random() * 1000)}`;
    }
  },

  /**
   * Salva un preventivo nel Database SQLite nativo
   */
  async saveQuote(quote: QuoteData): Promise<boolean> {
    const toSave = {
      ...quote,
      id: quote.id || crypto.randomUUID()
    };

    if (!isTauri) {
      try {
        const quotes = await this.getQuotes();
        const existingIndex = quotes.findIndex(q => q.id === toSave.id);
        
        const record: QuoteRecord = {
          id: toSave.id,
          quote_number: toSave.number,
          client_name: toSave.client.companyName || toSave.client.contactName || "Cliente Sconosciuto",
          status: toSave.status,
          created_at: new Date().toISOString(),
          data: toSave
        };

        if (existingIndex >= 0) {
          quotes[existingIndex] = record;
        } else {
          quotes.push(record);
        }

        localStorage.setItem('easyevent_quotes', JSON.stringify(quotes));
        return true;
      } catch (e) {
        console.error("Errore salvataggio LocalStorage preventivo:", e);
        return false;
      }
    }

    try {
      return await invoke<boolean>('save_quote', { quote: toSave });
    } catch (error) {
      console.error("Errore salvataggio preventivo:", error);
      return false;
    }
  },

  /**
   * Invia il preventivo via Email (non supportato offline)
   */
  async sendQuoteEmail(_quote: QuoteData): Promise<{ success: boolean; error?: string }> {
    return { 
      success: false, 
      error: "Funzionalità non attiva in locale. Esporta in PDF e invialo manualmente tramite il tuo client di posta." 
    };
  },

  /**
   * Ottiene la lista dei preventivi salvati
   */
  async getQuotes(): Promise<QuoteRecord[]> {
    if (!isTauri) {
      try {
        const data = localStorage.getItem('easyevent_quotes');
        return data ? JSON.parse(data) : [];
      } catch (e) {
        console.error("Errore caricamento LocalStorage preventivi:", e);
        return [];
      }
    }

    try {
      return await invoke<QuoteRecord[]>('get_quotes');
    } catch (error) {
      console.error("Errore caricamento lista preventivi:", error);
      return [];
    }
  },

  /**
   * Elimina un preventivo
   */
  async deleteQuote(id: string): Promise<boolean> {
    if (!isTauri) {
      try {
        const quotes = await this.getQuotes();
        const filtered = quotes.filter(q => q.id !== id);
        localStorage.setItem('easyevent_quotes', JSON.stringify(filtered));
        return true;
      } catch (e) {
        console.error("Errore eliminazione LocalStorage preventivo:", e);
        return false;
      }
    }

    try {
      return await invoke<boolean>('delete_quote', { id });
    } catch (error) {
      console.error("Errore eliminazione preventivo:", error);
      return false;
    }
  },

  /**
   * Carica il listino prezzi attivo
   */
  async loadPriceList(): Promise<{ pricing: PricingConfig | null, panels: PanelConfig | null }> {
    if (!isTauri) {
      try {
        const data = localStorage.getItem('easyevent_pricelist');
        if (data) {
          return JSON.parse(data);
        }
        return { pricing: null, panels: null };
      } catch (e) {
        console.error("Errore caricamento LocalStorage listino:", e);
        return { pricing: null, panels: null };
      }
    }

    try {
      return await invoke<{ pricing: PricingConfig, panels: PanelConfig }>('get_pricing_config');
    } catch (error) {
      console.error("Errore caricamento listino prezzi:", error);
      return { pricing: null, panels: null };
    }
  },

  /**
   * Salva il listino prezzi
   */
  async savePriceList(pricing: PricingConfig, panels: PanelConfig): Promise<boolean> {
    if (!isTauri) {
      try {
        localStorage.setItem('easyevent_pricelist', JSON.stringify({ pricing, panels }));
        return true;
      } catch (e) {
        console.error("Errore salvataggio LocalStorage listino:", e);
        return false;
      }
    }

    try {
      return await invoke<boolean>('save_pricing_config', { pricing, panels });
    } catch (error) {
      console.error("Errore salvataggio listino prezzi:", error);
      return false;
    }
  },

  // --- SERVIZI MAGAZZINO ---

  /**
   * Ottiene la lista degli articoli in magazzino
   */
  async getWarehouseItems(): Promise<any[]> {
    if (!isTauri) {
      try {
        const data = localStorage.getItem('easyevent_warehouse');
        if (data) return JSON.parse(data);
        localStorage.setItem('easyevent_warehouse', JSON.stringify(DEFAULT_WAREHOUSE));
        return DEFAULT_WAREHOUSE;
      } catch (e) {
        console.error("Errore caricamento LocalStorage magazzino:", e);
        return DEFAULT_WAREHOUSE;
      }
    }

    try {
      return await invoke<any[]>('get_warehouse_items');
    } catch (error) {
      console.error("Errore caricamento magazzino:", error);
      return [];
    }
  },

  /**
   * Aggiunge o sottrae quantità per un pezzo (movimento manuale)
   */
  async adjustWarehouseItem(itemId: string, delta: number, _note: string): Promise<boolean> {
    if (!isTauri) {
      try {
        const items = await this.getWarehouseItems();
        const index = items.findIndex(i => i.id === itemId);
        if (index >= 0) {
          items[index].stock += delta;
          localStorage.setItem('easyevent_warehouse', JSON.stringify(items));
          return true;
        }
        return false;
      } catch (e) {
        console.error("Errore regolazione LocalStorage magazzino:", e);
        return false;
      }
    }

    try {
      return await invoke<boolean>('adjust_warehouse_item', { itemId, delta, note: _note });
    } catch (error) {
      console.error("Errore regolazione giacenza:", error);
      return false;
    }
  },

  /**
   * Aggiorna la soglia minima di allerta di un pezzo
   */
  async updateWarehouseThreshold(itemId: string, threshold: number): Promise<boolean> {
    if (!isTauri) {
      try {
        const items = await this.getWarehouseItems();
        const index = items.findIndex(i => i.id === itemId);
        if (index >= 0) {
          items[index].min_threshold = threshold;
          localStorage.setItem('easyevent_warehouse', JSON.stringify(items));
          return true;
        }
        return false;
      } catch (e) {
        console.error("Errore soglia minima LocalStorage:", e);
        return false;
      }
    }

    try {
      return await invoke<boolean>('update_warehouse_threshold', { itemId, threshold });
    } catch (error) {
      console.error("Errore salvataggio soglia minima:", error);
      return false;
    }
  },

  /**
   * Ottiene gli articoli che sono sotto la soglia di allerta
   */
  async getLowStockItems(): Promise<any[]> {
    if (!isTauri) {
      try {
        const items = await this.getWarehouseItems();
        return items.filter(i => i.stock < i.min_threshold);
      } catch {
        return [];
      }
    }

    try {
      return await invoke<any[]>('get_low_stock_items');
    } catch (error) {
      console.error("Errore caricamento articoli sotto soglia:", error);
      return [];
    }
  },

  /**
   * Applica lo scarico dei pezzi alla vendita di un preventivo (o il ripristino all'annullamento)
   */
  async applyWarehouseMovement(quoteId: string, items: any[], status: string): Promise<boolean> {
    if (!isTauri) {
      console.log(`Fallback applyWarehouseMovement per ${quoteId} (status: ${status})`);
      return true;
    }

    try {
      return await invoke<boolean>('apply_warehouse_movement', { quoteId, items, status });
    } catch (error) {
      console.error("Errore applicazione movimento magazzino:", error);
      return false;
    }
  }
};
