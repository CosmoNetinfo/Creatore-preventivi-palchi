import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/database';
import { Box, ArrowUpRight, ArrowDownRight, ShieldAlert, Plus, Save, History, ClipboardList, Info } from 'lucide-react';

interface WarehouseItem {
  id: string;
  stage_type: string | null;
  item_key: string;
  description: string;
  quantity_available: number;
  minimum_threshold: number;
  unit: string;
}

export const Warehouse: React.FC = () => {
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Stati per la regolazione rapida
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [adjustQty, setAdjustQty] = useState<number>(10);
  const [adjustNote, setAdjustNote] = useState<string>('Carico rifornimento');
  const [adjustType, setAdjustType] = useState<'add' | 'sub'>('add');
  const [isAdjusting, setIsAdjusting] = useState(false);

  useEffect(() => {
    loadWarehouse();
  }, []);

  const loadWarehouse = async () => {
    setLoading(true);
    const data = await DatabaseService.getWarehouseItems();
    setItems(data);
    if (data.length > 0 && !selectedItemId) {
      setSelectedItemId(data[0].id);
    }
    setLoading(false);
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) return;
    
    setIsAdjusting(true);
    const delta = adjustType === 'add' ? adjustQty : -adjustQty;
    const success = await DatabaseService.adjustWarehouseItem(selectedItemId, delta, adjustNote);
    if (success) {
      setAdjustQty(10);
      setAdjustNote('Rifornimento magazzino');
      await loadWarehouse();
    } else {
      alert("Errore nella regolazione della giacenza.");
    }
    setIsAdjusting(false);
  };

  const handleThresholdChange = async (itemId: string, newThreshold: number) => {
    const success = await DatabaseService.updateWarehouseThreshold(itemId, newThreshold);
    if (success) {
      setItems(prev => prev.map(item => item.id === itemId ? { ...item, minimum_threshold: newThreshold } : item));
    }
  };

  // Raggruppa gli articoli per tipo di palco
  const groupedItems = items.reduce((acc, item) => {
    const group = item.stage_type || 'Generale';
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as Record<string, WarehouseItem[]>);

  const lowStockCount = items.filter(i => i.quantity_available <= i.minimum_threshold).length;

  return (
    <div className="space-y-6 text-slate-800 animate-in fade-in duration-300">
      
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card Stato Generale */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 rounded-2xl shadow-xl text-white border border-slate-700/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Stato Articoli</span>
            <h3 className="text-3xl font-black">{items.length}</h3>
            <span className="text-xs text-slate-400 mt-2 block font-medium">Componenti censiti</span>
          </div>
          <div className="bg-brand-500/10 p-4 rounded-2xl border border-brand-500/20 text-brand-400">
            <Box className="w-8 h-8" />
          </div>
        </div>

        {/* Card Sotto Soglia */}
        <div className={`p-6 rounded-2xl shadow-xl text-white border transition-all flex items-center justify-between ${lowStockCount > 0 ? 'bg-gradient-to-br from-rose-950 via-rose-900 to-rose-950 border-rose-500/20 animate-pulse' : 'bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 border-emerald-500/20'}`}>
          <div>
            <span className="text-[10px] font-black text-rose-300/80 uppercase tracking-widest block mb-1">Sotto Soglia</span>
            <h3 className="text-3xl font-black">{lowStockCount}</h3>
            <span className="text-xs text-slate-300 mt-2 block font-medium">
              {lowStockCount > 0 ? 'Richiesto riassortimento!' : 'Tutte le scorte sono ok'}
            </span>
          </div>
          <div className={`p-4 rounded-2xl border ${lowStockCount > 0 ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'}`}>
            <ShieldAlert className="w-8 h-8" />
          </div>
        </div>

        {/* Pannello Informativo */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 flex items-start gap-4">
          <div className="bg-slate-100 p-3 rounded-xl text-slate-600 shrink-0">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-black text-xs uppercase tracking-wider text-slate-500 mb-1">Scarico Automatico alla Vendita</h4>
            <p className="text-xs leading-relaxed text-slate-600">
              Quando contrassegni un preventivo come <strong className="text-emerald-600">VENDUTO</strong> nell'editor, il sistema detrae automaticamente i materiali richiesti dalle scorte. Se l'ordine viene riportato a bozza, le scorte vengono ripristinate.
            </p>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* TABELLA SCORTE (2/3 Larghezza) */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-black text-sm uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-brand-600" /> Situazione Giacenze per Palco
            </h3>
            {loading && <span className="text-xs text-slate-400 italic">Caricamento...</span>}
          </div>

          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {Object.keys(groupedItems).map(groupName => (
              <div key={groupName} className="space-y-3">
                <h4 className="text-xs font-black text-brand-600 bg-brand-50/70 py-1.5 px-3 rounded-lg border-l-4 border-brand-500 uppercase tracking-widest inline-block">
                  {groupName}
                </h4>
                
                <div className="border border-slate-150 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                        <th className="py-3 px-4">Componente</th>
                        <th className="py-3 px-4 text-center">Giacenza</th>
                        <th className="py-3 px-4 text-center">Soglia Minima</th>
                        <th className="py-3 px-4 text-right">Stato</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groupedItems[groupName].map(item => {
                        const isLowStock = item.quantity_available <= item.minimum_threshold;
                        return (
                          <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${isLowStock ? 'bg-rose-50/30' : ''}`}>
                            <td className="py-3 px-4">
                              <p className="font-bold text-slate-900">{item.description}</p>
                              <p className="text-[10px] text-slate-400 font-mono">chiave: {item.item_key}</p>
                            </td>
                            <td className="py-3 px-4 text-center font-black text-sm">
                              {item.quantity_available} <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <input 
                                type="number" 
                                value={item.minimum_threshold}
                                onChange={(e) => handleThresholdChange(item.id, Number(e.target.value))}
                                className="w-16 bg-slate-50 border border-slate-200 text-center font-bold rounded-lg py-1 focus:ring-1 focus:ring-brand-500 outline-none"
                              />
                            </td>
                            <td className="py-3 px-4 text-right">
                              {isLowStock ? (
                                <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-700 font-black text-[9px] uppercase px-2.5 py-1 rounded-full border border-rose-200">
                                  <ShieldAlert className="w-3 h-3" /> Sotto Soglia
                                </span>
                              ) : (
                                <span className="inline-flex items-center bg-emerald-100 text-emerald-700 font-black text-[9px] uppercase px-2.5 py-1 rounded-full border border-emerald-200">
                                  Disponibile
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* REGOLAZIONE MANUALE SCORTE (1/3 Larghezza) */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden self-start">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-black text-sm uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <History className="w-4 h-4 text-brand-600" /> Movimento Manuale
            </h3>
          </div>

          <form onSubmit={handleAdjustStock} className="p-6 space-y-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Articolo da movimentare</label>
              <select 
                value={selectedItemId} 
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500"
              >
                {items.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.stage_type ? `[${i.stage_type}] ` : ''}{i.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tipo Operazione</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setAdjustType('add'); setAdjustNote('Carico rifornimento'); }}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-black transition-all ${adjustType === 'add' ? 'bg-emerald-600 border-emerald-700 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                >
                  <ArrowUpRight className="w-4 h-4" /> CARICA
                </button>
                <button
                  type="button"
                  onClick={() => { setAdjustType('sub'); setAdjustNote('Rettifica inventario'); }}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-black transition-all ${adjustType === 'sub' ? 'bg-rose-600 border-rose-700 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                >
                  <ArrowDownRight className="w-4 h-4" /> SCARICA
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Quantità</label>
              <input 
                type="number" 
                value={adjustQty}
                onChange={(e) => setAdjustQty(Math.max(1, Number(e.target.value)))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 font-bold rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500"
                min="1"
              />
            </div>

            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nota Movimento</label>
              <input 
                type="text" 
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="Es. Inventario Giugno, Rifornimento..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 font-bold rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isAdjusting || !selectedItemId}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAdjusting ? 'Elaborazione...' : <><Plus className="w-4 h-4" /> Registra Movimento</>}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
