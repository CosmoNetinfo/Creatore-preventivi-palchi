import { QuoteData, PricingConfig, PanelConfig, QuoteRecord } from '../types';
import { invoke } from '@tauri-apps/api/core';

export const DatabaseService = {
  
  /**
   * Ottiene il prossimo numero preventivo disponibile
   */
  async getNextQuoteNumber(year: number): Promise<string> {
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
    try {
      const toSave = {
        ...quote,
        id: quote.id || crypto.randomUUID()
      };
      return await invoke<boolean>('save_quote', { quote: toSave });
    } catch (error) {
      console.error("Errore salvataggio preventivo:", error);
      return false;
    }
  },

  /**
   * Invia il preventivo via Email (non supportato direttamente offline)
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
  async adjustWarehouseItem(itemId: string, delta: number, note: string): Promise<boolean> {
    try {
      return await invoke<boolean>('adjust_warehouse_item', { itemId, delta, note });
    } catch (error) {
      console.error("Errore regolazione giacenza:", error);
      return false;
    }
  },

  /**
   * Aggiorna la soglia minima di allerta di un pezzo
   */
  async updateWarehouseThreshold(itemId: string, threshold: number): Promise<boolean> {
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
    try {
      return await invoke<boolean>('apply_warehouse_movement', { quoteId, items, status });
    } catch (error) {
      console.error("Errore applicazione movimento magazzino:", error);
      return false;
    }
  }
};
