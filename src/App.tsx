import React, { useState, useEffect, useMemo, useRef } from 'react';
import { QuoteEditor } from './components/QuoteEditor';
import { QuotePreview } from './components/QuotePreview';
import { ProductionSheet } from './components/ProductionSheet';
import { DeliveryNote } from './components/DeliveryNote';
import { Warehouse } from './components/Warehouse';
import { QuoteData, INITIAL_QUOTE, QuoteRecord } from './types';
import { 
  Printer, 
  Search, 
  Database, 
  Hammer, 
  ClipboardCheck, 
  ChevronRight, 
  X, 
  FileText, 
  Box, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowLeft, 
  Calendar,
  User,
  TrendingUp
} from 'lucide-react';
import { DatabaseService } from './services/database';

type ActiveSection = 'quotes' | 'checklists' | 'production' | 'warehouse';

// Contenitore ad autoscala per anteprima A4
const PreviewContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const parentWidth = containerRef.current.getBoundingClientRect().width;
        // La pagina A4 ha larghezza di 210mm (circa 794px in pixel dello schermo).
        // Aggiungiamo 32px di tolleranza di padding.
        const targetWidth = 826;
        if (parentWidth < targetWidth) {
          setScale(parentWidth / targetWidth);
        } else {
          setScale(1);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full flex justify-center bg-slate-400 rounded-3xl p-4 overflow-hidden print:p-0 print:bg-transparent shadow-inner">
      <div 
        style={{ 
          transform: `scale(${scale})`, 
          transformOrigin: 'top center',
          width: '210mm',
          height: scale < 1 ? `calc(297mm * ${scale})` : 'auto',
          transition: 'transform 0.05s ease-out'
        }}
        className="print:transform-none print:w-auto print:h-auto"
      >
        {children}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<ActiveSection>('quotes');
  const [quoteData, setQuoteData] = useState<QuoteData>(INITIAL_QUOTE);
  
  // Stati per l'archivio e la ricerca
  const [savedQuotes, setSavedQuotes] = useState<QuoteRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sold'>('all');

  // Stati di navigazione interna
  const [isEditing, setIsEditing] = useState(false);
  const [selectedQuoteForChecklist, setSelectedQuoteForChecklist] = useState<QuoteData | null>(null);
  const [selectedQuoteForProduction, setSelectedQuoteForProduction] = useState<QuoteData | null>(null);

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

  const calculateQuoteTotal = (data: QuoteData) => {
    const subtotal = data.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const discount = subtotal * (data.discountPercentage / 100);
    return subtotal - discount;
  };

  // Funzione per eliminare un preventivo
  const handleDeleteQuote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Sei sicuro di voler eliminare questo preventivo definitivamente?")) {
      await DatabaseService.deleteQuote(id);
      loadArchive();
      if (quoteData.id === id) {
        setQuoteData(INITIAL_QUOTE);
      }
      if (selectedQuoteForChecklist?.id === id) setSelectedQuoteForChecklist(null);
      if (selectedQuoteForProduction?.id === id) setSelectedQuoteForProduction(null);
    }
  };

  // Carica preventivo per l'editor
  const startEditingQuote = (record: QuoteRecord) => {
    setQuoteData({
      ...record.data,
      id: record.id
    });
    setIsEditing(true);
  };

  // Avvia creazione nuovo preventivo
  const handleCreateNewQuote = async () => {
    const nextNum = await DatabaseService.getNextQuoteNumber(new Date().getFullYear());
    setQuoteData({
      ...INITIAL_QUOTE,
      number: nextNum,
      date: new Date().toISOString().split('T')[0]
    });
    setIsEditing(true);
  };

  const filteredQuotes = useMemo(() => {
    let result = savedQuotes;
    
    // Filtro stato
    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter);
    }

    // Filtro ricerca
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.client_name.toLowerCase().includes(q) || 
        r.quote_number.toLowerCase().includes(q) ||
        (r.data.title && r.data.title.toLowerCase().includes(q))
      );
    }
    
    return result;
  }, [searchQuery, statusFilter, savedQuotes]);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      
      {/* SIDEBAR SINISTRA */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 print:hidden">
        {/* Logo / Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-1 rounded-xl bg-white flex items-center justify-center">
            <img src="/favicon-512.png" alt="EasyEvent" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <h1 className="font-black text-lg text-white leading-none tracking-tight">EasyEvent</h1>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Gestione Desktop</span>
          </div>
        </div>

        {/* Voci di Menu */}
        <nav className="flex-1 p-4 space-y-1.5">
          <button
            onClick={() => { setActiveSection('quotes'); loadArchive(); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeSection === 'quotes' 
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileText className="h-5 w-5" />
            <span>Preventivi</span>
          </button>

          <button
            onClick={() => { setActiveSection('checklists'); loadArchive(); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeSection === 'checklists' 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ClipboardCheck className="h-5 w-5" />
            <span>Checklist Carico</span>
          </button>

          <button
            onClick={() => { setActiveSection('production'); loadArchive(); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeSection === 'production' 
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Hammer className="h-5 w-5" />
            <span>Produzione</span>
          </button>

          <button
            onClick={() => { setActiveSection('warehouse'); loadArchive(); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeSection === 'warehouse' 
                ? 'bg-slate-800 text-white border border-slate-700' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Box className="h-5 w-5" />
            <span>Magazzino</span>
          </button>
        </nav>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-slate-800 text-center text-[10px] text-slate-500 font-bold">
          EasyEvent S.r.l.s. v1.0.2
        </div>
      </aside>

      {/* CONTENUTO PRINCIPALE */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* BARRA SUPERIORE */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
              {activeSection === 'quotes' && (isEditing ? 'Preventivi / Modifica' : 'Sezione Preventivi')}
              {activeSection === 'checklists' && (selectedQuoteForChecklist ? 'Checklist / Visualizzazione' : 'Sezione Checklist Carico')}
              {activeSection === 'production' && (selectedQuoteForProduction ? 'Produzione / Visualizzazione' : 'Sezione Schede Produzione')}
              {activeSection === 'warehouse' && 'Gestione Magazzino'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Bottone Stampa visibile solo nelle anteprime dei documenti */}
            {((activeSection === 'quotes' && isEditing) || 
              (activeSection === 'checklists' && selectedQuoteForChecklist) || 
              (activeSection === 'production' && selectedQuoteForProduction)) && (
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-colors"
              >
                <Printer className="h-4 w-4 text-slate-500" />
                Stampa / Esporta PDF
              </button>
            )}
          </div>
        </header>

        {/* PAGINE DI DETTAGLIO */}
        <main className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible">
          
          {/* SECTION: PREVENTIVI */}
          {activeSection === 'quotes' && (
            isEditing ? (
              <div className="space-y-6">
                {/* Header editor */}
                <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
                  <button 
                    onClick={() => { setIsEditing(false); loadArchive(); }} 
                    className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 px-4 py-2 rounded-xl transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" /> Torna all'elenco dei preventivi
                  </button>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-bold block">Stato Attuale</span>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                      quoteData.status === 'sold' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {quoteData.status === 'sold' ? 'VENDUTO (Stock scaricato)' : 'BOZZA (In attesa)'}
                    </span>
                  </div>
                </div>

                {/* Split Editor / Preview */}
                <div className="flex flex-col xl:flex-row gap-8">
                  <div className="w-full xl:w-1/3 space-y-6 print:hidden">
                    <QuoteEditor data={quoteData} onChange={setQuoteData} />
                  </div>
                  <div className="w-full xl:w-2/3 flex flex-col">
                    <PreviewContainer>
                      <div id="printable-root" className="relative">
                        <QuotePreview data={quoteData} />
                      </div>
                    </PreviewContainer>
                  </div>
                </div>
              </div>
            ) : (
              // LISTA PREVENTIVI
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Preventivi</h2>
                    <p className="text-sm text-slate-500">Crea nuovi preventivi, modifica le bozze esistenti e traccia le vendite.</p>
                  </div>
                  <button
                    onClick={handleCreateNewQuote}
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-lg shadow-brand-600/20 transition-all self-start sm:self-auto hover:scale-105"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nuovo Preventivo</span>
                  </button>
                </div>

                {/* Filtri & Cerca */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                  <div className="w-full md:max-w-md relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cerca per cliente, numero o titolo preventivo..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                    />
                  </div>

                  <div className="flex gap-2 bg-slate-100 p-1 rounded-xl self-stretch md:self-auto">
                    {(['all', 'draft', 'sold'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setStatusFilter(filter)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                          statusFilter === filter
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        {filter === 'all' && 'Tutti'}
                        {filter === 'draft' && 'Bozze'}
                        {filter === 'sold' && 'Venduti'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tabella / Lista Preventivi */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="px-6 py-4">Preventivo</th>
                          <th className="px-6 py-4">Cliente</th>
                          <th className="px-6 py-4">Palco</th>
                          <th className="px-6 py-4 text-right">Totale</th>
                          <th className="px-6 py-4 text-center">Stato</th>
                          <th className="px-6 py-4 text-center">Azioni</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredQuotes.length > 0 ? (
                          filteredQuotes.map((r) => (
                            <tr 
                              key={r.id}
                              onClick={() => startEditingQuote(r)}
                              className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                            >
                              <td className="px-6 py-4">
                                <span className="font-bold text-slate-950 block">{r.quote_number}</span>
                                <span className="text-[10px] text-slate-400 block font-bold mt-0.5">{r.data.date}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-bold text-slate-800 block">{r.client_name}</span>
                                <span className="text-xs text-slate-500 block">{r.data.client.city} ({r.data.client.province})</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-semibold text-slate-700 block">{r.data.title || 'Palco Modulare'}</span>
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider inline-block mt-1">
                                  {r.data.stageType} • {r.data.finishedHeight}cm
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right font-black text-slate-950">
                                {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(calculateQuoteTotal(r.data))}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-block text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${
                                  r.status === 'sold' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {r.status === 'sold' ? 'Venduto' : 'Bozza'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => startEditingQuote(r)}
                                    className="p-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
                                    title="Modifica Preventivo"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteQuote(r.id, e)}
                                    className="p-2 hover:bg-red-50 text-red-600 hover:text-red-700 rounded-lg transition-colors"
                                    title="Elimina Preventivo"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-xs">
                              Nessun preventivo trovato. Clicca su "+ Nuovo Preventivo" per iniziare.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          )}

          {/* SECTION: CHECKLIST CARICO */}
          {activeSection === 'checklists' && (
            selectedQuoteForChecklist ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
                  <button 
                    onClick={() => setSelectedQuoteForChecklist(null)} 
                    className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 px-4 py-2 rounded-xl transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" /> Torna all'elenco dei preventivi
                  </button>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-bold block">Documento</span>
                    <span className="font-black text-sm text-slate-800">Checklist Carico #{selectedQuoteForChecklist.number}</span>
                  </div>
                </div>

                <PreviewContainer>
                  <div id="printable-root" className="relative">
                    <DeliveryNote data={selectedQuoteForChecklist} />
                  </div>
                </PreviewContainer>
              </div>
            ) : (
              // SELEZIONE PREVENTIVO PER CHECKLIST
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Checklist Carico</h2>
                  <p className="text-sm text-slate-500">Seleziona un preventivo per generare e stampare la checklist di carico del materiale.</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200">
                    <div className="max-w-md relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filtra preventivi per cliente o numero..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-1.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {filteredQuotes.length > 0 ? (
                      filteredQuotes.map((r) => (
                        <div 
                          key={r.id} 
                          onClick={() => setSelectedQuoteForChecklist(r.data)}
                          className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <div>
                            <span className="font-bold text-slate-900 text-sm block">{r.client_name}</span>
                            <span className="text-xs text-slate-500">{r.quote_number} — {r.data.title} ({r.data.stageType})</span>
                          </div>
                          <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-black uppercase tracking-wider rounded-xl transition-all">
                            <span>Apri Checklist</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-400 italic text-xs">
                        Nessun preventivo disponibile.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          )}

          {/* SECTION: PRODUZIONE */}
          {activeSection === 'production' && (
            selectedQuoteForProduction ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
                  <button 
                    onClick={() => setSelectedQuoteForProduction(null)} 
                    className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 px-4 py-2 rounded-xl transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" /> Torna all'elenco dei preventivi
                  </button>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-bold block">Documento</span>
                    <span className="font-black text-sm text-slate-800">Scheda di Produzione #{selectedQuoteForProduction.number}</span>
                  </div>
                </div>

                <PreviewContainer>
                  <div id="printable-root" className="relative">
                    <ProductionSheet data={selectedQuoteForProduction} />
                  </div>
                </PreviewContainer>
              </div>
            ) : (
              // SELEZIONE PREVENTIVO PER PRODUZIONE
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Schede Produzione</h2>
                  <p className="text-sm text-slate-500">Seleziona un preventivo per visualizzare e stampare la scheda tecnica per l'officina.</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200">
                    <div className="max-w-md relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filtra preventivi per cliente o numero..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-1.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {filteredQuotes.length > 0 ? (
                      filteredQuotes.map((r) => (
                        <div 
                          key={r.id} 
                          onClick={() => setSelectedQuoteForProduction(r.data)}
                          className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <div>
                            <span className="font-bold text-slate-900 text-sm block">{r.client_name}</span>
                            <span className="text-xs text-slate-500">{r.quote_number} — {r.data.title} ({r.data.stageType})</span>
                          </div>
                          <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-50 text-orange-700 hover:bg-orange-100 text-xs font-black uppercase tracking-wider rounded-xl transition-all">
                            <span>Apri Scheda</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-400 italic text-xs">
                        Nessun preventivo disponibile.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          )}

          {/* SECTION: WAREHOUSE */}
          {activeSection === 'warehouse' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Magazzino</h2>
                <p className="text-sm text-slate-500">Traccia le scorte degli elementi fisici, imposta soglie critiche e regola le disponibilità.</p>
              </div>
              <Warehouse />
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default App;
