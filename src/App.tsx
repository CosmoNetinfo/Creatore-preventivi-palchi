declare const __APP_VERSION__: string;

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
  TrendingUp,
  ArrowUpCircle,
  Bug,
  Settings
} from 'lucide-react';
import { DatabaseService } from './services/database';
import { DebugConsole } from './components/DebugConsole';
import { printElement } from './services/printHelper';
import { SettingsPanel, loadSettings, AppSettings } from './components/SettingsPanel';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';




type ActiveSection = 'quotes' | 'checklists' | 'production' | 'warehouse' | 'settings';

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

  // Controllo aggiornamenti
  const [updateInfo, setUpdateInfo] = useState<{ available: boolean; version: string; url: string } | null>(null);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(loadSettings());
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'downloading' | 'ready' | 'error'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Applica impostazioni globali all'avvio
  useEffect(() => {
    // 1. Dark Mode
    if (appSettings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // 2. Grandezza font
    document.documentElement.classList.remove('font-size-normal', 'font-size-compact', 'font-size-tiny');
    document.documentElement.classList.add(`font-size-${appSettings.fontSize}`);
  }, [appSettings.darkMode, appSettings.fontSize]);



  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const res = await fetch('https://api.github.com/repos/CosmoNetinfo/Creatore-preventivi-palchi/releases/latest');
        if (!res.ok) return;
        const data = await res.json();
        const latestTag: string = data.tag_name || '';
        const latestVersion = latestTag.replace(/^v/, '');
        const currentVersion = __APP_VERSION__;
        if (latestVersion && latestVersion !== currentVersion) {
          const [latMaj, latMin, latPat] = latestVersion.split('.').map(Number);
          const [curMaj, curMin, curPat] = currentVersion.split('.').map(Number);
          const isNewer =
            latMaj > curMaj ||
            (latMaj === curMaj && latMin > curMin) ||
            (latMaj === curMaj && latMin === curMin && latPat > curPat);
          if (isNewer) {
            setUpdateInfo({
              available: true,
              version: latestVersion,
              url: data.html_url || 'https://github.com/CosmoNetinfo/Creatore-preventivi-palchi/releases/latest'
            });
          }
        }
      } catch {
        // Nessuna rete disponibile — non mostrare nulla
      }
    };
    // Controllo al primo avvio dopo 3 secondi (non blocca il caricamento UI)
    const t = setTimeout(checkForUpdates, 3000);
    return () => clearTimeout(t);
  }, []);

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
    console.log("handlePrint: Avvio del processo di stampa/salvataggio PDF tramite printHelper...");
    const originalTitle = document.title;
    try {
      let docTitle = "EasyEvent - Generatore Preventivi";
      const sanitize = (val: string) => val.replace(/[\/\\?%*:|"<>\x00-\x1F]/g, '_').trim();
      
      if (activeSection === 'quotes' && isEditing) {
        const clientName = quoteData.client.companyName || quoteData.client.contactName || "";
        docTitle = `Preventivo_${quoteData.number}${clientName ? `_${clientName}` : ''}`;
      } else if (activeSection === 'checklists' && selectedQuoteForChecklist) {
        const clientName = selectedQuoteForChecklist.client.companyName || selectedQuoteForChecklist.client.contactName || "";
        docTitle = `Checklist_Carico_${selectedQuoteForChecklist.number}${clientName ? `_${clientName}` : ''}`;
      } else if (activeSection === 'production' && selectedQuoteForProduction) {
        const clientName = selectedQuoteForProduction.client.companyName || selectedQuoteForProduction.client.contactName || "";
        docTitle = `Scheda_Produzione_${selectedQuoteForProduction.number}${clientName ? `_${clientName}` : ''}`;
      }
      
      document.title = sanitize(docTitle);
      printElement('printable-root');
      console.log("handlePrint: printElement terminato correttamente.");
    } catch (err: any) {
      console.error("handlePrint: Errore durante l'esecuzione di printElement:", err);
      alert(`Errore Stampa/PDF: ${err.message || err}\nConsulta la Console di Debug per i dettagli.`);
    } finally {
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }
  };

  // Esegue l'aggiornamento automatico nativo di Tauri
  const handleNativeUpdate = async () => {
    try {
      setUpdateStatus('checking');
      console.log("Auto-Updater: Avvio controllo aggiornamenti nativo...");
      const update = await check();
      
      if (update) {
        console.log(`Auto-Updater: Trovata versione ${update.version}. Avvio download...`);
        setUpdateStatus('downloading');
        let downloaded = 0;
        let total = 0;

        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              total = event.data.contentLength || 0;
              console.log(`Auto-Updater: Inizio download. Dimensione totale: ${total} byte`);
              break;
            case 'Progress':
              downloaded += event.data.chunkLength;
              if (total > 0) {
                const percent = Math.round((downloaded / total) * 100);
                setDownloadProgress(percent);
              }
              break;
            case 'Finished':
              console.log('Auto-Updater: Download completato, installazione in corso...');
              break;
          }
        });

        console.log("Auto-Updater: Installazione completata. Riavvio...");
        setUpdateStatus('ready');
        alert("Aggiornamento completato con successo! L'applicazione verrà riavviata.");
        await relaunch();
      } else {
        console.log("Auto-Updater: Nessun aggiornamento nativo disponibile.");
        setUpdateStatus('idle');
      }
    } catch (err: any) {
      console.error("Auto-Updater: Errore durante l'aggiornamento nativo:", err);
      setUpdateStatus('error');
      alert(`Errore durante l'aggiornamento: ${err.message || err}`);
    }
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
      date: new Date().toISOString().split('T')[0],
      discountPercentage: appSettings.defaultDiscount,
      notes: appSettings.defaultNotes,
      company: {
        ...INITIAL_QUOTE.company,
        name: appSettings.companyName,
        vatId: appSettings.companyVatId,
        address: appSettings.companyAddress,
        email: appSettings.companyEmail,
        phone: appSettings.companyPhone,
        website: appSettings.companyWebsite,
        bankName: appSettings.companyBank,
        iban: appSettings.companyIban,
        logoUrl: appSettings.companyLogo
      }
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
    <div className="h-screen w-screen bg-slate-50 dark:bg-slate-950 flex font-sans overflow-hidden">
      
      {/* SIDEBAR SINISTRA */}
      <aside className="w-64 h-full bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 print:hidden select-none">
        {/* Logo / Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <img src="/favicon-512.png" alt="EasyEvent" className="h-10 w-10 object-contain rounded-xl" />
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

          <button
            onClick={() => { setActiveSection('settings'); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeSection === 'settings' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Settings className="h-5 w-5" />
            <span>Impostazioni</span>
          </button>

          <button
            onClick={() => setIsDebugOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-slate-400 hover:bg-slate-850 hover:text-white border border-dashed border-slate-800 mt-4 hover:border-slate-700"
          >
            <Bug className="h-5 w-5 text-amber-500" />
            <span>Console Debug</span>
          </button>
        </nav>



        {/* Footer Sidebar */}
        <div className="mt-auto">
          {/* Banner aggiornamento disponibile */}
          {updateInfo?.available && (
            <button
              onClick={handleNativeUpdate}
              disabled={updateStatus === 'checking' || updateStatus === 'downloading' || updateStatus === 'ready'}
              className="mx-3 mb-2 w-[calc(100%-24px)] flex items-center gap-2 bg-brand-600 hover:bg-brand-500 transition-colors rounded-xl p-3 cursor-pointer text-left border-0 outline-none"
            >
              <ArrowUpCircle className="h-5 w-5 text-white shrink-0" />
              <div>
                <p className="text-white font-black text-[11px] uppercase tracking-wide leading-none">
                  {updateStatus === 'idle' && 'Aggiornamento disponibile'}
                  {updateStatus === 'checking' && 'Verifica in corso...'}
                  {updateStatus === 'downloading' && `Download in corso... ${downloadProgress}%`}
                  {updateStatus === 'ready' && 'Installazione completata'}
                  {updateStatus === 'error' && 'Errore. Riprova'}
                </p>
                <p className="text-brand-100 text-[10px] mt-0.5">
                  {updateStatus === 'downloading' ? 'Attendere...' : `Versione ${updateInfo.version} → Clicca qui`}
                </p>
              </div>
            </button>
          )}

          <div className="p-4 border-t border-slate-800 text-center text-[10px] text-slate-500 font-bold">
            EasyEvent S.r.l.s. v{__APP_VERSION__}
          </div>
        </div>
      </aside>

      {/* CONTENUTO PRINCIPALE */}
      <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
        
        {/* BARRA SUPERIORE */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 print:hidden shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {activeSection === 'quotes' && (isEditing ? 'Preventivi / Modifica' : 'Sezione Preventivi')}
              {activeSection === 'checklists' && (selectedQuoteForChecklist ? 'Checklist / Visualizzazione' : 'Sezione Checklist Carico')}
              {activeSection === 'production' && (selectedQuoteForProduction ? 'Produzione / Visualizzazione' : 'Sezione Schede Produzione')}
              {activeSection === 'warehouse' && 'Gestione Magazzino'}
              {activeSection === 'settings' && 'Impostazioni dell\'applicazione'}
            </span>
          </div>


          <div className="flex items-center gap-4">
            {/* Bottone Stampa visibile solo nelle anteprime dei documenti */}
            {((activeSection === 'quotes' && isEditing) || 
              (activeSection === 'checklists' && selectedQuoteForChecklist) || 
              (activeSection === 'production' && selectedQuoteForProduction)) && (
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 dark:text-white transition-colors"
              >
                <Printer className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                Stampa / Esporta PDF
              </button>
            )}
          </div>
        </header>

        {/* PAGINE DI DETTAGLIO */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-slate-950 print:p-0 print:overflow-visible">
          
          {/* SECTION: PREVENTIVI */}
          {activeSection === 'quotes' && (
            isEditing ? (
              <div className="space-y-6">
                {/* Header editor */}
                <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
                  <button 
                    onClick={() => { setIsEditing(false); loadArchive(); }} 
                    className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" /> Torna all'elenco dei preventivi
                  </button>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-bold block">Stato Attuale</span>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                      quoteData.status === 'sold' ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
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
                      <div id="printable-root" className={`relative ${!appSettings.printShowPrices ? 'print-hide-prices' : ''}`}>
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
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Magazzino</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Traccia le scorte degli elementi fisici, imposta soglie critiche e regola le disponibilità.</p>
              </div>
              <Warehouse />
            </div>
          )}

          {/* SECTION: SETTINGS */}
          {activeSection === 'settings' && (
            <div className="space-y-6 max-w-4xl pb-12">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white font-sans">Impostazioni Globali</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Configura i dati predefiniti dei tuoi documenti, il layout di stampa, la grandezza caratteri e il tema visivo.</p>
              </div>
              <SettingsPanel onSave={setAppSettings} />
            </div>
          )}
        </main>
      </div>

      <DebugConsole isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} />
    </div>
  );
};

export default App;
