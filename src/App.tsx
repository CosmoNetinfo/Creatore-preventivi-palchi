
import React, { useState, useEffect, useMemo } from 'react';
import { QuoteEditor } from './components/QuoteEditor';
import { QuotePreview } from './components/QuotePreview';
import { ProductionSheet } from './components/ProductionSheet';
import { DeliveryNote } from './components/DeliveryNote';
import { Warehouse } from './components/Warehouse';
import { QuoteData, INITIAL_QUOTE, QuoteRecord } from './types';
import { Printer, LayoutTemplate, Search, Database, Hammer, ClipboardCheck, ChevronRight, X, FileText, Box } from 'lucide-react';
import { DatabaseService } from './services/database';

type ViewMode = 'quote' | 'production' | 'delivery' | 'warehouse';

const App: React.FC = () => {
  const [quoteData, setQuoteData] = useState<QuoteData>(INITIAL_QUOTE);
  const [viewMode, setViewMode] = useState<ViewMode>('quote');
  
  // Stati per l'archivio e ricerca
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [savedQuotes, setSavedQuotes] = useState<QuoteRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const savedLogo = localStorage.getItem('easyevent_logo');
    if (savedLogo) {
      setQuoteData(prev => ({
        ...prev,
        company: { ...prev.company, logoUrl: savedLogo }
      }));
    }
    loadArchive();
  }, []);

  const loadArchive = async () => {
    const quotes = await DatabaseService.getQuotes();
    setSavedQuotes(quotes);
  };

  const handlePrint = () => {
    window.print();
  };

  const selectQuote = (record: QuoteRecord) => {
    setQuoteData({
      ...record.data,
      id: record.id
    });
    setIsArchiveOpen(false);
    setSearchQuery('');
    // Al caricamento, mostriamo il preventivo
    setViewMode('quote');
  };

  const filteredQuotes = useMemo(() => {
    if (!searchQuery) return savedQuotes;
    const q = searchQuery.toLowerCase();
    return savedQuotes.filter(r => 
      r.client_name.toLowerCase().includes(q) || 
      r.quote_number.toLowerCase().includes(q) ||
      (r.data.title && r.data.title.toLowerCase().includes(q))
    );
  }, [searchQuery, savedQuotes]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      
      {/* Barra Superiore */}
      <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50 print:hidden">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center gap-4">
            
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-brand-500 p-2 rounded-lg">
                <LayoutTemplate className="h-6 w-6 text-white" />
              </div>
              <div className="hidden sm:block text-left">
                <span className="font-bold text-xl tracking-tight leading-none">EasyEvent</span>
                <span className="text-[10px] block text-slate-400 font-bold uppercase tracking-widest mt-0.5">Gestione Preventivi</span>
              </div>
            </div>

            {/* Ricerca */}
            <div className="flex-1 max-w-md relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-500 group-focus-within:text-brand-400" />
              </div>
              <input 
                type="text" 
                placeholder="Cerca cliente o numero..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearching(true)}
                className="w-full bg-slate-800 border border-slate-700 rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all"
              />
              {isSearching && searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-96 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2">
                   {filteredQuotes.length > 0 ? filteredQuotes.map(r => (
                     <button key={r.id} onClick={() => selectQuote(r)} className="w-full p-3 text-left hover:bg-brand-50 border-b border-slate-50 last:border-0 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-sm">{r.client_name}</p>
                          <p className="text-[10px] text-slate-400">{r.quote_number} • {r.data.title}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                     </button>
                   )) : <div className="p-4 text-center text-slate-400 text-xs italic">Nessun risultato</div>}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
                <button
                  onClick={() => { setIsArchiveOpen(true); loadArchive(); }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  title="Archivio Preventivi"
                >
                  <Database className="h-5 w-5" />
                </button>
                <div className="w-px h-6 bg-slate-700 mx-1"></div>
                <button
                  onClick={handlePrint}
                  disabled={viewMode === 'warehouse'}
                  className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-black rounded-xl shadow-sm text-white bg-brand-600 hover:bg-brand-700 transition-all disabled:opacity-50"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  STAMPA ATTUALE
                </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Modal Archivio */}
      {isArchiveOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Database className="w-5 h-5 text-brand-600" /> Archivio Preventivi</h2>
                 <button onClick={() => setIsArchiveOpen(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-4 overflow-y-auto">
                 <div className="space-y-2">
                    {savedQuotes.map(r => (
                      <button key={r.id} onClick={() => selectQuote(r)} className="w-full p-4 border border-slate-100 rounded-xl text-left hover:border-brand-300 hover:bg-brand-50 transition-all flex justify-between items-center">
                         <div>
                            <p className="font-bold text-slate-900">{r.client_name}</p>
                            <p className="text-xs text-slate-500">{r.quote_number} — {r.data.title}</p>
                         </div>
                         {r.status === 'sold' && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase">Venduto</span>}
                      </button>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      <main className="flex-1 max-w-[1920px] mx-auto w-full p-4 md:p-8">
        <div className="flex flex-col xl:flex-row gap-8">
          
          {/* EDITOR SINISTRO (Nascondi se siamo nel magazzino) */}
          {viewMode !== 'warehouse' && (
            <div className="w-full xl:w-1/3 space-y-6 print:hidden">
              <QuoteEditor data={quoteData} onChange={setQuoteData} />
            </div>
          )}

          {/* ANTEPRIMA DESTRA CON TAB */}
          <div className={viewMode === 'warehouse' ? "w-full flex flex-col" : "w-full xl:w-2/3 flex flex-col"}>
             
             {/* SELETTORE DOCUMENTI (TABS) */}
             <div className="mb-6 flex flex-wrap gap-2 p-1.5 bg-slate-200 rounded-2xl print:hidden self-center">
                <button 
                  onClick={() => setViewMode('quote')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${viewMode === 'quote' ? 'bg-white text-brand-600 shadow-md scale-105' : 'text-slate-500 hover:bg-white/50'}`}
                >
                  <FileText className="w-4 h-4" /> Preventivo
                </button>
                <button 
                  onClick={() => setViewMode('delivery')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${viewMode === 'delivery' ? 'bg-emerald-600 text-white shadow-md scale-105' : 'text-slate-500 hover:bg-emerald-50'}`}
                >
                  <ClipboardCheck className="w-4 h-4" /> Checklist Carico
                </button>
                <button 
                  onClick={() => setViewMode('production')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${viewMode === 'production' ? 'bg-orange-600 text-white shadow-md scale-105' : 'text-slate-500 hover:bg-orange-50'}`}
                >
                  <Hammer className="w-4 h-4" /> Produzione
                </button>
                <button 
                  onClick={() => setViewMode('warehouse')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${viewMode === 'warehouse' ? 'bg-slate-900 text-white shadow-md scale-105' : 'text-slate-500 hover:bg-slate-300'}`}
                >
                  <Box className="w-4 h-4" /> Magazzino
                </button>
             </div>

             {/* AREA CONTENUTO */}
             {viewMode === 'warehouse' ? (
                <Warehouse />
             ) : (
                <div className="w-full flex justify-center bg-slate-400 rounded-3xl p-4 md:p-12 overflow-x-auto print:p-0 print:bg-transparent shadow-inner">
                   <div id="printable-root" className="relative group">
                      
                      {/* Bottone Stampa Galleggiante (Solo Desktop) */}
                      <button 
                        onClick={handlePrint}
                        className="absolute -top-6 -right-6 z-10 p-4 bg-white text-slate-800 rounded-full shadow-2xl border-4 border-slate-100 hover:scale-110 transition-transform print:hidden hidden md:block"
                        title="Stampa questo foglio"
                      >
                        <Printer className="w-6 h-6" />
                      </button>

                      {viewMode === 'quote' && <QuotePreview data={quoteData} />}
                      {viewMode === 'production' && <ProductionSheet data={quoteData} />}
                      {viewMode === 'delivery' && <DeliveryNote data={quoteData} />}
                   </div>
                </div>
             )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;
