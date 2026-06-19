
import React, { useState, useEffect } from 'react';
import { QuoteData, LineItem, PricingConfig, PanelConfig } from '../types';
import { Box, Save, Search, CheckCircle, Loader2, Users, Check, Ruler, Sparkles, Layers } from 'lucide-react';
import { getLocationInfo } from '../services/geocoding';
import { DatabaseService } from '../services/database';

interface QuoteEditorProps {
  data: QuoteData;
  onChange: (data: QuoteData) => void;
}

const DEFAULT_STAGE_PRICING: PricingConfig = {
  'DB PRO 6': { module: 109.80, incidence: 4.90, guardrail: 39.50, stairs: 395.00, handrail: 94.90, feet: 19.80 },
  'DB PRO 6 INOX': { module: 129.80, incidence: 5.80, guardrail: 54.80, stairs: 448.80, handrail: 108.90, feet: 19.80 },
  'MINI': { module: 129.80, incidence: 5.80, guardrail: 39.50, stairs: 345.00, handrail: 89.80, feet: 19.80 },
  'MINI INOX': { module: 154.80, incidence: 6.80, guardrail: 54.80, stairs: 395.00, handrail: 105.90, feet: 19.80 },
  'PEDANA': { module: 97.80, incidence: 0, guardrail: 39.50, stairs: 395.00, handrail: 94.90, feet: 12.80 }
};

const DEFAULT_PANEL_TYPES: PanelConfig = {
  'Pannelli Gialli': 0,
  'Pannelli Kauffmann': 10.00,
  'Multistrato di Betulla': 45.00
};

const LEAD_SOURCES = [
  "Google",
  "Subito.it",
  "Facebook Marketplace",
  "Sito Web EasyEvent",
  "Passaparola",
  "Instagram",
  "Altro"
];

const FISSAGGIO_TYPES = ["Nessuno", "Back Spin", "Fast Spin", "Zavorra", "Tasselli"];

const INPUT_STYLE = "w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-brand-500 shadow-sm transition-all text-xs font-bold";
const LABEL_STYLE = "block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1";

export const QuoteEditor: React.FC<QuoteEditorProps> = ({ data, onChange }) => {
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(DEFAULT_STAGE_PRICING);
  const [panelConfig, setPanelConfig] = useState<PanelConfig>(DEFAULT_PANEL_TYPES);

  const [stageType, setStageType] = useState<string>(data.stageType || 'DB PRO 6');
  const [panelType, setPanelType] = useState<string>('Pannelli Gialli');
  const [stageWidth, setStageWidth] = useState<number>(6);
  const [stageDepth, setStageDepth] = useState<number>(4);
  
  // Stati per i componenti
  const [includeFissaggio, setIncludeFissaggio] = useState<boolean>(true);
  const [fissaggioType, setFissaggioType] = useState<string>("Back Spin");
  const [includeGuardrails, setIncludeGuardrails] = useState<boolean>(true);
  const [includeFeet, setIncludeFeet] = useState<boolean>(true);
  const [includeStairs, setIncludeStairs] = useState<boolean>(true);
  const [stairsQuantity, setStairsQuantity] = useState<number>(1);
  const [includeHandrails, setIncludeHandrails] = useState<boolean>(true);
  const [includeTelescopicLegs, setIncludeTelescopicLegs] = useState<boolean>(data.includeTelescopicLegs || false);

  // Stato per altezza palco finita (UI)
  const [isStandardHeight, setIsStandardHeight] = useState<boolean>(data.finishedHeight === 83);
  const [customFinishedHeight, setCustomFinishedHeight] = useState<number>(data.finishedHeight === 83 ? 60 : data.finishedHeight);

  useEffect(() => {
    const initApp = async () => {
      const dbPrices = await DatabaseService.loadPriceList();
      if (dbPrices.pricing) setPricingConfig(dbPrices.pricing);
      if (dbPrices.panels) setPanelConfig(dbPrices.panels);
      if (!data.number) {
        const nextNum = await DatabaseService.getNextQuoteNumber(new Date().getFullYear());
        onChange({ ...data, number: nextNum });
      }
    };
    initApp();
  }, []);

  const markAsSold = async () => {
    setIsProcessing(true);
    const newStatus = data.status === 'sold' ? 'draft' : 'sold';
    const updated = { ...data, status: newStatus as any };
    onChange(updated);
    await DatabaseService.saveQuote(updated);
    await DatabaseService.applyWarehouseMovement(data.id, data.items, newStatus);
    setIsProcessing(false);
  };

  const handleLocationLookup = async () => {
    if (!data.client.locality) return;
    setLoadingLocation(true);
    const info = await getLocationInfo(data.client.locality);
    if (info) {
      onChange({ 
        ...data, 
        client: { 
          ...data.client, 
          city: info.comune, 
          province: info.provincia, 
          region: info.regione 
        } 
      });
    }
    setLoadingLocation(false);
  };

  const updateSpecialModule = (key: keyof typeof data.specialModules, field: 'L' | 'P', value: number) => {
    onChange({
      ...data,
      specialModules: {
        ...data.specialModules,
        [key]: {
          ...data.specialModules[key],
          [field]: value
        }
      }
    });
  };

  const addStageItem = () => {
    const area = stageWidth * stageDepth;
    const currentPrices = pricingConfig[stageType] || DEFAULT_STAGE_PRICING['DB PRO 6'];
    const newItems: LineItem[] = [];
    const timestamp = Date.now();
    const finalFinishedHeight = isStandardHeight ? 83 : customFinishedHeight;

    newItems.push({ 
        id: `m-${timestamp}`,
        description: stageType === 'PEDANA' ? 'Moduli Pedana' : 'Moduli Palco Professionale', 
        specs: `Struttura Acciaio Zincato, piano ${panelType} - Dim. ${stageWidth}x${stageDepth} mt - Altezza Palco Finita ${finalFinishedHeight} cm`, 
        quantity: area, 
        unitPrice: currentPrices.module + (panelConfig[panelType] || 0), 
        vatRate: 22 
    });

    if (stageType !== 'PEDANA') {
      newItems.push({
        id: `i-${timestamp}`,
        description: "Incidenza certificazione sovraccarico 600 kg/mq",
        specs: "Relazione tecnica e calcoli strutturali inclusi",
        quantity: area,
        unitPrice: currentPrices.incidence,
        vatRate: 22
      });
    }

    if (includeFissaggio && fissaggioType !== "Nessuno") {
      let fixPrice = 5.50; 
      let fixSpecs = "Ancoraggio di sicurezza";

      if (fissaggioType === "Back Spin") {
        fixPrice = 0;
        fixSpecs = "Sistema di bloccaggio rapido (Incluso)";
      } else if (fissaggioType === "Fast Spin") {
        fixPrice = 4.90;
        fixSpecs = "Sistema di bloccaggio evoluto";
      }

      newItems.push({
        id: `fix-${timestamp}`,
        description: `Sistema di Fissaggio ${fissaggioType}`,
        specs: fixSpecs,
        quantity: area,
        unitPrice: fixPrice, 
        vatRate: 22
      });
    }

    const legG4 = Math.round(((stageWidth / 2) + 1) * (stageDepth / 2) + 1);
    const legG3 = Math.round((stageWidth / 2) + 1);
    const totalStructuralLegs = legG4 + legG3;

    if (includeFeet) {
      let billedFtCount = (totalStructuralLegs - 1);
      if (includeStairs) billedFtCount += (2 * stairsQuantity);
      
      newItems.push({ 
        id: `f-${timestamp}`, 
        description: "Piedini Regolabili", 
        specs: "Acciaio Zincato, vite M30, base snodata", 
        quantity: Math.max(0, billedFtCount), 
        unitPrice: currentPrices.feet, 
        vatRate: 22 
      });
    }

    if (includeTelescopicLegs) {
      newItems.push({
        id: `tel-${timestamp}`,
        description: "Gambe Telescopiche",
        specs: "Sistema di regolazione altezza variabile",
        quantity: totalStructuralLegs,
        unitPrice: 24.80,
        vatRate: 22
      });
    }

    if (includeGuardrails) {
      const perimeter = stageWidth + (stageDepth * 2);
      newItems.push({ id: `g-${timestamp}`, description: "Parapetti di Sicurezza", specs: "H 110cm, corrimano rinforzato", quantity: perimeter, unitPrice: currentPrices.guardrail, vatRate: 22 });
    }

    if (includeStairs) {
      newItems.push({ id: `s-${timestamp}`, description: "Scala di Accesso", specs: "Gradini antisdrucciolo", quantity: stairsQuantity, unitPrice: currentPrices.stairs, vatRate: 22 });
      if (includeHandrails) newItems.push({ id: `h-${timestamp}`, description: "Corrimano Scaletta", specs: "Elementi di protezione", quantity: 2 * stairsQuantity, unitPrice: currentPrices.handrail, vatRate: 22 });
    }

    onChange({ 
      ...data, 
      stageType, 
      finishedHeight: finalFinishedHeight,
      includeTelescopicLegs,
      items: newItems 
    });
  };

  const renderSpecialModuleCard = (title: string, key: keyof typeof data.specialModules) => (
    <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm hover:border-emerald-300 transition-colors">
      <h4 className="text-[10px] font-black text-slate-800 uppercase mb-2 flex items-center gap-1.5">
        <Layers className="w-3 h-3 text-emerald-500" /> Modulo {title}
      </h4>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Lunghezza</label>
          <input 
            type="number" 
            value={data.specialModules[key].L} 
            onChange={(e) => updateSpecialModule(key, 'L', Number(e.target.value))} 
            className={INPUT_STYLE} 
          />
        </div>
        <div>
          <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Profondità</label>
          <input 
            type="number" 
            value={data.specialModules[key].P} 
            onChange={(e) => updateSpecialModule(key, 'P', Number(e.target.value))} 
            className={INPUT_STYLE} 
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-6 bg-white rounded-2xl shadow-xl border border-slate-200">
      
      {/* Azioni Rapide */}
      <div className="grid grid-cols-1 gap-2 pb-6 border-b border-slate-100">
        <button 
          onClick={markAsSold}
          disabled={isProcessing}
          className={`flex items-center justify-center gap-3 py-4 rounded-xl border-2 font-black text-xs uppercase tracking-widest transition-all ${data.status === 'sold' ? 'bg-emerald-600 border-emerald-700 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-500 hover:text-emerald-600'}`}
        >
          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : data.status === 'sold' ? <CheckCircle className="w-5 h-5" /> : <Box className="w-5 h-5" />}
          {data.status === 'sold' ? 'ORDINE VENDUTO' : 'SEGNA COME VENDUTO'}
        </button>
        <button 
          onClick={() => DatabaseService.saveQuote(data).then(() => alert("Salvato!"))}
          className="flex items-center justify-center gap-2 py-3 bg-brand-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-brand-700"
        >
          <Save className="w-4 h-4" /> Salva Preventivo
        </button>
      </div>

      <section className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
          <Users className="w-3 h-3" /> Anagrafica Cliente
        </h3>
        
        <div className="space-y-3">
          <div>
            <label className={LABEL_STYLE}>Ragione Sociale / Nome Cliente</label>
            <input type="text" placeholder="Es. Mario Rossi S.r.l." value={data.client.companyName} onChange={(e) => onChange({...data, client: { ...data.client, companyName: e.target.value }})} className={INPUT_STYLE}/>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div>
                <label className={LABEL_STYLE}>Referente</label>
                <input type="text" placeholder="Nome contatto" value={data.client.contactName} onChange={(e) => onChange({...data, client: { ...data.client, contactName: e.target.value }})} className={INPUT_STYLE}/>
             </div>
             <div>
                <label className={LABEL_STYLE}>WhatsApp / Cell.</label>
                <input type="tel" placeholder="328..." value={data.client.whatsapp} onChange={(e) => onChange({...data, client: { ...data.client, whatsapp: e.target.value }})} className={INPUT_STYLE}/>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
           <div>
              <label className={LABEL_STYLE}>Email Cliente</label>
              <input type="email" placeholder="email@esempio.it" value={data.client.email || ''} onChange={(e) => onChange({...data, client: { ...data.client, email: e.target.value }})} className={INPUT_STYLE}/>
           </div>
           <div>
              <label className={LABEL_STYLE}>Origine Contatto</label>
              <select 
                value={data.client.leadSource || 'Google'} 
                onChange={(e) => onChange({...data, client: { ...data.client, leadSource: e.target.value }})} 
                className={INPUT_STYLE}
              >
                {LEAD_SOURCES.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
           </div>
        </div>

        <div>
          <label className={LABEL_STYLE}>Località (Paese / Frazione)</label>
          <div className="flex gap-2">
              <input type="text" placeholder="Es. San Giacomo di Spoleto" value={data.client.locality || ''} onChange={(e) => onChange({...data, client: { ...data.client, locality: e.target.value }})} className={INPUT_STYLE}/>
              <button 
                onClick={handleLocationLookup} 
                disabled={loadingLocation}
                className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50"
              >
                {loadingLocation ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
           <div>
              <label className={LABEL_STYLE}>Comune</label>
              <input type="text" placeholder="Comune" value={data.client.city} onChange={(e) => onChange({...data, client: { ...data.client, city: e.target.value }})} className={INPUT_STYLE}/>
           </div>
           <div>
              <label className={LABEL_STYLE}>Provincia</label>
              <input type="text" placeholder="Provincia" value={data.client.province} onChange={(e) => onChange({...data, client: { ...data.client, province: e.target.value }})} className={INPUT_STYLE}/>
           </div>
           <div>
              <label className={LABEL_STYLE}>Regione</label>
              <input type="text" placeholder="Regione" value={data.client.region} onChange={(e) => onChange({...data, client: { ...data.client, region: e.target.value }})} className={INPUT_STYLE}/>
           </div>
        </div>
      </section>

      {/* SEZIONE CONFIGURAZIONE PALCO */}
      <section className="pt-6 border-t border-slate-100">
        <div className="bg-emerald-50/30 p-5 rounded-2xl border border-emerald-100 space-y-6">
           
           <div className="space-y-4">
             <h3 className="text-[10px] font-black text-emerald-800 uppercase tracking-[0.2em] flex items-center gap-2">
               <Box className="w-3 h-3" /> Moduli Standard (2x2)
             </h3>
             <div className="grid grid-cols-2 gap-3">
                <div><label className={LABEL_STYLE}>Modello</label><select value={stageType} onChange={(e) => setStageType(e.target.value)} className={INPUT_STYLE}>{Object.keys(pricingConfig).map(k => <option key={k} value={k}>{k}</option>)}</select></div>
                <div><label className={LABEL_STYLE}>Piano</label><select value={panelType} onChange={(e) => setPanelType(e.target.value)} className={INPUT_STYLE}>{Object.keys(panelConfig).map(k => <option key={k} value={k}>{k}</option>)}</select></div>
             </div>
             <div className="grid grid-cols-2 gap-3">
                <div><label className={LABEL_STYLE}>Lunghezza (L)</label><input type="number" value={stageWidth} onChange={(e) => setStageWidth(Number(e.target.value))} className={INPUT_STYLE} /></div>
                <div><label className={LABEL_STYLE}>Profondità (P)</label><input type="number" value={stageDepth} onChange={(e) => setStageDepth(Number(e.target.value))} className={INPUT_STYLE} /></div>
             </div>
           </div>

           {/* NUOVA SEZIONE: MODULI SPECIALI */}
           <div className="space-y-4 pt-4 border-t border-emerald-100">
             <h3 className="text-[10px] font-black text-emerald-800 uppercase tracking-[0.2em] flex items-center gap-2">
               <Layers className="w-3 h-3" /> Moduli Speciali / Fuori Misura
             </h3>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {renderSpecialModuleCard("2 x 1,5", "s20x15")}
                {renderSpecialModuleCard("1,5 x 1,5", "s15x15")}
                {renderSpecialModuleCard("2 x 1", "s20x10")}
                {renderSpecialModuleCard("1,5 x 1", "s15x10")}
                {renderSpecialModuleCard("1 x 1", "s10x10")}
                {renderSpecialModuleCard("1 x 0,5", "s10x05")}
                {renderSpecialModuleCard("0,5 x 0,5", "s05x05")}
             </div>
           </div>

           {/* BOX CONFIGURAZIONE COMPONENTI */}
           <div className="space-y-3 pt-4 border-t border-emerald-100">
              
              {/* Altezza */}
              <div className="bg-white border border-emerald-200 rounded-xl p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div 
                      onClick={() => setIsStandardHeight(!isStandardHeight)}
                      className={`w-6 h-6 border-2 rounded-md flex items-center justify-center cursor-pointer transition-colors ${isStandardHeight ? 'bg-emerald-500 border-emerald-600 text-white' : 'border-emerald-300'}`}
                    >
                      {isStandardHeight && <Check className="w-4 h-4" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-emerald-900 uppercase">Altezza Palco Finita</span>
                      <span className="text-[9px] text-emerald-600 font-bold uppercase">Standard (83 cm)</span>
                    </div>
                  </div>
                  {!isStandardHeight && (
                    <div className="flex items-center gap-2">
                      <Ruler className="w-3 h-3 text-emerald-400" />
                      <input 
                        type="number" 
                        value={customFinishedHeight} 
                        onChange={(e) => setCustomFinishedHeight(Number(e.target.value))}
                        className="w-16 bg-emerald-50 border border-emerald-100 text-emerald-900 text-xs font-bold py-1 px-2 rounded-lg outline-none text-center"
                        placeholder="cm"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Telescopiche */}
              <div className="bg-white border-2 border-brand-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div 
                    onClick={() => setIncludeTelescopicLegs(!includeTelescopicLegs)}
                    className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${includeTelescopicLegs ? 'bg-brand-600' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${includeTelescopicLegs ? 'left-5' : 'left-1'}`} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-brand-900 uppercase">Gambe Telescopiche</span>
                    <span className="text-[8px] font-bold text-brand-500 uppercase">+24,80 € / cad.</span>
                  </div>
                </div>
              </div>

              {/* Fissaggio */}
              <div className="bg-white border border-emerald-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div 
                    onClick={() => setIncludeFissaggio(!includeFissaggio)}
                    className={`w-6 h-6 border-2 rounded-md flex items-center justify-center cursor-pointer transition-colors ${includeFissaggio ? 'bg-emerald-500 border-emerald-600 text-white' : 'border-emerald-300'}`}
                  >
                    {includeFissaggio && <Check className="w-4 h-4" />}
                  </div>
                  <span className="text-sm font-black text-emerald-900 uppercase">Fissaggio</span>
                </div>
                <select 
                  value={fissaggioType} 
                  onChange={(e) => setFissaggioType(e.target.value)}
                  className="bg-emerald-50 border border-emerald-100 text-emerald-900 text-[10px] font-bold py-1 px-2 rounded-lg outline-none"
                >
                  {FISSAGGIO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Parapetti */}
              <div className="bg-white border border-emerald-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div 
                    onClick={() => setIncludeGuardrails(!includeGuardrails)}
                    className={`w-6 h-6 border-2 rounded-md flex items-center justify-center cursor-pointer transition-colors ${includeGuardrails ? 'bg-emerald-500 border-emerald-600 text-white' : 'border-emerald-300'}`}
                  >
                    {includeGuardrails && <Check className="w-4 h-4" />}
                  </div>
                  <span className="text-sm font-black text-emerald-900 uppercase">Parapetti</span>
                </div>
              </div>

              {/* Piedini */}
              <div className="bg-white border border-emerald-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div 
                    onClick={() => setIncludeFeet(!includeFeet)}
                    className={`w-6 h-6 border-2 rounded-md flex items-center justify-center cursor-pointer transition-colors ${includeFeet ? 'bg-emerald-500 border-emerald-600 text-white' : 'border-emerald-300'}`}
                  >
                    {includeFeet && <Check className="w-4 h-4" />}
                  </div>
                  <span className="text-sm font-black text-emerald-900 uppercase">Piedini</span>
                </div>
              </div>

              {/* Scala */}
              <div className="bg-white border border-emerald-200 rounded-xl p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div 
                      onClick={() => setIncludeStairs(!includeStairs)}
                      className={`w-6 h-6 border-2 rounded-md flex items-center justify-center cursor-pointer transition-colors ${includeStairs ? 'bg-emerald-500 border-emerald-600 text-white' : 'border-emerald-300'}`}
                    >
                      {includeStairs && <Check className="w-4 h-4" />}
                    </div>
                    <span className="text-sm font-black text-emerald-900 uppercase">Scala</span>
                  </div>
                  <select 
                    value={stairsQuantity} 
                    onChange={(e) => setStairsQuantity(Number(e.target.value))}
                    className="bg-emerald-50 border border-emerald-100 text-emerald-900 text-[10px] font-bold py-1 px-2 rounded-lg outline-none"
                  >
                    {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                
                <div className="ml-9 flex items-center gap-2 mt-2 opacity-80">
                   <div 
                    onClick={() => setIncludeHandrails(!includeHandrails)}
                    className={`w-5 h-5 border-2 rounded-md flex items-center justify-center cursor-pointer transition-colors ${includeHandrails ? 'bg-emerald-500 border-emerald-600 text-white' : 'border-emerald-300'}`}
                  >
                    {includeHandrails && <Check className="w-3 h-3" />}
                  </div>
                  <span className="text-xs font-bold text-emerald-800">Corrimano</span>
                </div>
              </div>

           </div>

           <button 
             onClick={addStageItem} 
             className="w-full py-4 mt-4 bg-emerald-400 hover:bg-emerald-500 text-white rounded-xl font-black text-[11px] uppercase tracking-wider shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
           >
             Aggiorna Preventivo e Produzione
           </button>
        </div>
      </section>
    </div>
  );
};
