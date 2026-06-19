
import React from 'react';
import { QuoteData } from '../types';
import { Truck, LayoutGrid, ClipboardCheck, UserCheck, ShieldAlert, Footprints, ShieldCheck, Layers, Nut } from 'lucide-react';

interface DeliveryNoteProps {
  data: QuoteData;
}

export const DeliveryNote: React.FC<DeliveryNoteProps> = ({ data }) => {
  const getStructuralDetails = () => {
    if (data.stageType === 'PEDANA') return null;

    const stageItem = data.items.find(item => 
      item.description.toLowerCase().includes("modulo") || 
      item.description.toLowerCase().includes("palco")
    );

    if (!stageItem || !stageItem.specs) return null;

    const match = stageItem.specs.match(/([\d.]+)\s*[x*]\s*([\d.]+)/);
    if (!match) return null;

    const L = parseFloat(match[1]); // Lunghezza
    const P = parseFloat(match[2]); // Profondità

    // Estrazione tipo pannello dalle specs
    const panelMatch = stageItem.specs.match(/piano\s+(.*?)\s+-/);
    const tipoPannello = panelMatch ? panelMatch[1] : "Pannelli Standard";

    // FORMULE TELAI
    const lisci = (L / 2) * (P + 1) - 1;
    const innesto = (L / 2 + 1) * (P / 2) + 1;

    // FORMULE GAMBE
    const gambe4 = ((L / 2) + 1) * (P / 2) + 1;
    const gambe3 = (L / 2) + 1;

    // CALCOLO PANNELLI (1 al MQ)
    const pannelliCount = Math.round(L * P);

    // CALCOLO PARAPETTI
    const hasGuardrails = data.items.some(item => item.description.toLowerCase().includes("parapetti"));
    let parapetti = null;

    if (hasGuardrails) {
      const sponde2mCount = (P / 2) + (L / 2) + ((P / 2) - 1);
      const paliStereoCount = (P / 2 - 1) + (L / 2 - 1) + (P / 2);

      parapetti = {
        spondeLiscie2m: Math.round(sponde2mCount),
        spondeCerchio2m: Math.round(sponde2mCount),
        spondeLiscie1m: 2,
        spondeCerchio1m: 2,
        paliMono: 6,
        paliStereo: Math.round(paliStereoCount)
      };
    }

    // CALCOLO SCALE (COMPONENTI FISSI PER SCALETTA)
    const stairsItem = data.items.find(item => item.description.toLowerCase().includes("scala di accesso"));
    const handrailsItem = data.items.find(item => item.description.toLowerCase().includes("corrimano scaletta"));
    let scale = null;

    if (stairsItem) {
      const q = stairsItem.quantity; // Numero di scale
      const type = data.stageType.toLowerCase();
      const isMini = type.includes('mini');
      const isDbPro = type.includes('db pro');

      scale = {
        destro: 1 * q,
        sinistro: 1 * q,
        logheroni: 10 * q,
        gradiniLegno: (isDbPro ? 4 : (isMini ? 2 : 0)) * q,
        gradiniIncavo: (isDbPro || isMini ? 1 : 0) * q,
        hasHandrails: !!handrailsItem,
        corrimano: handrailsItem ? 2 * q : 0,
        paliMonoCorti: handrailsItem ? 2 * q : 0,
        quantity: q
      };
    }

    // CALCOLO PIEDINI LOGISTICA (Formula: G3 + (G4 - 1) + 2*Scale)
    const g3Count = Math.round(gambe3);
    const g4Count = Math.round(gambe4);
    const scaleFeet = scale ? (2 * scale.quantity) : 0;
    const totalChecklistFeet = g3Count + (g4Count - 1) + scaleFeet;

    // CALCOLO BULLONERIA
    // 1. M8x16 (Presente sempre)
    const bulloneriaCount = Math.round(
      (Math.max(0, gambe4 - 1) * 8) +
      (gambe3 * 6) +
      (parapetti ? parapetti.paliMono * 2 : 0) +
      (parapetti ? parapetti.paliStereo * 4 : 0) +
      (scale ? scale.paliMonoCorti * 2 : 0) +
      (scale ? scale.logheroni * 2 : 0) +
      (innesto * 4)
    );
    const weightRounded = Math.ceil((bulloneriaCount * 12.1) / 50) * 50;

    // 2. Componenti SPIN (Back Spin o Fast Spin)
    const isSpinSystem = data.items.some(item => item.description.toLowerCase().includes("spin"));
    let bulloneria35 = null;
    let rondelleEccentriche = null;

    if (isSpinSystem) {
      const count35 = pannelliCount * 3;
      const weight35Rounded = Math.ceil((count35 * 17) / 50) * 50;
      bulloneria35 = { count: count35, weight: weight35Rounded };
      rondelleEccentriche = { count: pannelliCount * 3 };
    }

    return { 
      L, P, 
      lisci: Math.round(lisci), 
      innesto: Math.round(innesto),
      gambe4: g4Count,
      gambe3: g3Count,
      totalChecklistFeet,
      tipoPannello,
      pannelliCount,
      parapetti,
      scale,
      bulloneriaCount,
      weightRounded,
      bulloneria35,
      rondelleEccentriche
    };
  };

  const structural = getStructuralDetails();

  return (
    <div className="a4-page shadow-lg print:shadow-none p-[15mm] bg-white flex flex-col relative border-4 border-emerald-500">
      {/* Header Bolla */}
      <div className="flex justify-between items-center mb-8 bg-emerald-600 text-white p-6 -m-[15mm] mb-12 shadow-md">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
             <Truck className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">
              Bolla di Carico
            </h1>
            <p className="text-[10px] font-bold opacity-80 uppercase tracking-[0.2em] mt-1">EasyEvent Checklist Logistica</p>
          </div>
        </div>
        <div className="text-right">
           <div className="text-2xl font-black">SPED: {data.number.replace('OFF-', 'EE-')}</div>
           <p className="text-[10px] font-bold opacity-70">Emissioni del {new Date().toLocaleDateString('it-IT')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
         <div className="border-l-4 border-emerald-500 pl-4 bg-slate-50 p-4 rounded-r-lg">
            <h3 className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Destinatario / Cliente</h3>
            <p className="text-xl font-bold text-slate-800 leading-tight">{data.client.companyName || "N/A"}</p>
            <p className="text-sm font-medium text-slate-600 mt-1">
              {data.client.locality && data.client.locality !== data.client.city ? `${data.client.locality} - ` : ''}
              {data.client.city} ({data.client.province})
            </p>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1"><UserCheck className="w-3 h-3" /> Ref: {data.client.contactName}</p>
         </div>
         <div className="border-l-4 border-slate-200 pl-4 p-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Dettaglio Commessa</h3>
            <p className="text-sm font-bold text-slate-800">{data.title}</p>
            <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">SISTEMA: {data.stageType} {structural ? `(${structural.L}x${structural.P} MT)` : ''}</p>
         </div>
      </div>

      <div className="flex-grow space-y-3">
        {/* Box Struttura Metallica */}
        {structural && (
          <div className="border-2 border-emerald-200 rounded-2xl overflow-hidden shadow-sm bg-emerald-50/30">
             <div className="bg-emerald-600 px-5 py-2 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                   <LayoutGrid className="w-4 h-4" />
                   <span className="text-[10px] font-black uppercase tracking-[0.1em]">Componenti Struttura Metallica ({structural.L}x{structural.P} mt)</span>
                </div>
             </div>
             
             <div className="grid grid-cols-2 divide-x divide-y divide-emerald-200">
                <div className="p-2 flex items-center justify-between hover:bg-white transition-colors">
                   <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-emerald-400 rounded flex items-center justify-center bg-white"><div className="w-2.5 h-2.5 rounded-full bg-slate-100" /></div>
                      <span className="text-[9px] font-black text-slate-800 uppercase">Telai LISCI</span>
                   </div>
                   <span className="text-xl font-black text-emerald-700">{structural.lisci}</span>
                </div>
                <div className="p-2 flex items-center justify-between hover:bg-white transition-colors">
                   <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-emerald-400 rounded flex items-center justify-center bg-white"><div className="w-2.5 h-2.5 rounded-full bg-slate-100" /></div>
                      <span className="text-[9px] font-black text-slate-800 uppercase">Telai INNESTO</span>
                   </div>
                   <span className="text-xl font-black text-emerald-700">{structural.innesto}</span>
                </div>
                <div className="p-2 flex items-center justify-between hover:bg-white transition-colors">
                   <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-emerald-400 rounded flex items-center justify-center bg-white"><div className="w-2.5 h-2.5 rounded-full bg-slate-100" /></div>
                      <span className="text-[9px] font-black text-slate-800 uppercase">Gambe 4 INN.</span>
                   </div>
                   <span className="text-xl font-black text-emerald-700">{structural.gambe4}</span>
                </div>
                <div className="p-2 flex items-center justify-between hover:bg-white transition-colors">
                   <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-emerald-400 rounded flex items-center justify-center bg-white"><div className="w-2.5 h-2.5 rounded-full bg-slate-100" /></div>
                      <span className="text-[9px] font-black text-slate-800 uppercase">Gambe 3 INN.</span>
                   </div>
                   <span className="text-xl font-black text-emerald-700">{structural.gambe3}</span>
                </div>
                <div className="p-2 flex items-center justify-between hover:bg-white transition-colors col-span-2">
                   <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-emerald-600 rounded flex items-center justify-center bg-white"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /></div>
                      <span className="text-[9px] font-black text-slate-800 uppercase">Piedini Regolabili (Totali Logistica)</span>
                   </div>
                   <div className="text-right">
                      <span className="text-xl font-black text-emerald-800">{structural.totalChecklistFeet}</span>
                      <p className="text-[7px] text-slate-400 font-bold uppercase -mt-1 italic">Formula: G3 + (G4-1) + Scale</p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* Box Pannelli */}
        {structural && (
          <div className="border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
             <div className="bg-slate-800 px-5 py-2 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                   <Layers className="w-4 h-4 text-emerald-400" />
                   <span className="text-[10px] font-black uppercase tracking-[0.1em]">Componenti Piano di Calpestio</span>
                </div>
             </div>
             <div className="p-2 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                   <div className="w-5 h-5 border-2 border-slate-300 rounded flex items-center justify-center bg-white"><div className="w-2.5 h-2.5 rounded-full bg-slate-100" /></div>
                   <span className="text-[9px] font-black text-slate-700 uppercase">{structural.tipoPannello}</span>
                </div>
                <span className="text-xl font-black text-slate-900">{structural.pannelliCount}</span>
             </div>
          </div>
        )}

        {/* Box Bulloneria */}
        {structural && (
          <div className="border-2 border-slate-800 rounded-2xl overflow-hidden shadow-sm bg-slate-50">
             <div className="bg-slate-900 px-5 py-2 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                   <Nut className="w-4 h-4 text-emerald-400" />
                   <span className="text-[10px] font-black uppercase tracking-[0.1em]">Componenti Bulloneria</span>
                </div>
             </div>
             <div className="divide-y divide-slate-200">
               <div className="p-2 flex items-center justify-between hover:bg-white transition-colors">
                  <div className="flex items-center gap-3">
                     <div className="w-5 h-5 border-2 border-slate-400 rounded flex items-center justify-center bg-white"><div className="w-2.5 h-2.5 rounded-full bg-slate-100" /></div>
                     <span className="text-[9px] font-black text-slate-800 uppercase">Bulloncini M8x16</span>
                  </div>
                  <div className="text-right">
                     <div className="text-xl font-black text-emerald-700">{structural.bulloneriaCount}</div>
                     <div className="text-[8px] font-bold text-slate-400 uppercase">Peso: {structural.weightRounded}g</div>
                  </div>
               </div>

               {structural.bulloneria35 && (
                  <div className="p-2 flex items-center justify-between hover:bg-white transition-colors bg-emerald-50/20">
                    <div className="flex items-center gap-3">
                       <div className="w-5 h-5 border-2 border-emerald-400 rounded flex items-center justify-center bg-white"><div className="w-2.5 h-2.5 rounded-full bg-emerald-100" /></div>
                       <span className="text-[9px] font-black text-slate-800 uppercase">Bulloncini M8x35 (Sist. Spin)</span>
                    </div>
                    <div className="text-right">
                       <div className="text-xl font-black text-emerald-700">{structural.bulloneria35.count}</div>
                       <div className="text-[8px] font-bold text-slate-400 uppercase">Peso: {structural.bulloneria35.weight}g</div>
                    </div>
                  </div>
               )}

               {structural.rondelleEccentriche && (
                  <div className="p-2 flex items-center justify-between hover:bg-white transition-colors bg-emerald-50/20">
                    <div className="flex items-center gap-3">
                       <div className="w-5 h-5 border-2 border-emerald-400 rounded flex items-center justify-center bg-white"><div className="w-2.5 h-2.5 rounded-full bg-emerald-100" /></div>
                       <span className="text-[9px] font-black text-slate-800 uppercase">Rondelle Eccentriche (Sist. Spin)</span>
                    </div>
                    <div className="text-right">
                       <div className="text-xl font-black text-emerald-700">{structural.rondelleEccentriche.count}</div>
                    </div>
                  </div>
               )}
             </div>
          </div>
        )}

        {/* Box Parapetti */}
        {structural?.parapetti && (
          <div className="border-2 border-emerald-500 rounded-2xl overflow-hidden shadow-sm bg-white">
             <div className="bg-emerald-700 px-5 py-2 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                   <ShieldAlert className="w-4 h-4" />
                   <span className="text-[10px] font-black uppercase tracking-[0.1em]">Componenti Parapetti di Sicurezza</span>
                </div>
             </div>
             <div className="grid grid-cols-2 divide-x divide-y divide-emerald-100">
                <div className="p-2 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-5 h-5 border-2 border-emerald-100 rounded bg-white" /><span className="text-[9px] font-black text-slate-700 uppercase">Sponde Liscie 2m</span></div><span className="text-xl font-black text-emerald-600">{structural.parapetti.spondeLiscie2m}</span></div>
                <div className="p-2 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-5 h-5 border-2 border-emerald-100 rounded bg-white" /><span className="text-[9px] font-black text-slate-700 uppercase">Sponde Cerchio 2m</span></div><span className="text-xl font-black text-emerald-600">{structural.parapetti.spondeCerchio2m}</span></div>
                <div className="p-2 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-5 h-5 border-2 border-emerald-100 rounded bg-white" /><span className="text-[9px] font-black text-slate-700 uppercase">Sponde Liscie 1m</span></div><span className="text-xl font-black text-emerald-600">{structural.parapetti.spondeLiscie1m}</span></div>
                <div className="p-2 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-5 h-5 border-2 border-emerald-100 rounded bg-white" /><span className="text-[9px] font-black text-slate-700 uppercase">Sponde Cerchio 1m</span></div><span className="text-xl font-black text-emerald-600">{structural.parapetti.spondeCerchio1m}</span></div>
                <div className="p-2 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-5 h-5 border-2 border-emerald-100 rounded bg-white" /><span className="text-[9px] font-black text-slate-700 uppercase">Pali Mono</span></div><span className="text-xl font-black text-emerald-600">{structural.parapetti.paliMono}</span></div>
                <div className="p-2 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-5 h-5 border-2 border-emerald-100 rounded bg-white" /><span className="text-[9px] font-black text-slate-700 uppercase">Pali Stereo</span></div><span className="text-xl font-black text-emerald-600">{structural.parapetti.paliStereo}</span></div>
             </div>
          </div>
        )}

        {/* Box Scaletta */}
        {structural?.scale && (
          <div className="border-2 border-emerald-800 rounded-2xl overflow-hidden shadow-sm bg-slate-50/50">
             <div className="bg-emerald-900 px-5 py-2 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                   <Footprints className="w-4 h-4" />
                   <span className="text-[10px] font-black uppercase tracking-[0.1em]">Componenti Scaletta di Accesso</span>
                </div>
             </div>
             <div className="grid grid-cols-2 divide-x divide-y divide-emerald-100">
                <div className="p-2 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-5 h-5 border-2 border-emerald-200 rounded bg-white" /><span className="text-[9px] font-black text-slate-700 uppercase">Elemento Scaletta DX</span></div><span className="text-xl font-black text-emerald-800">{structural.scale.destro}</span></div>
                <div className="p-2 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-5 h-5 border-2 border-emerald-200 rounded bg-white" /><span className="text-[9px] font-black text-slate-700 uppercase">Elemento Scaletta SX</span></div><span className="text-xl font-black text-emerald-800">{structural.scale.sinistro}</span></div>
                <div className="p-2 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-5 h-5 border-2 border-emerald-200 rounded bg-white" /><span className="text-[9px] font-black text-slate-700 uppercase">Logheroni Scaletta</span></div><span className="text-xl font-black text-emerald-800">{structural.scale.logheroni}</span></div>
                {structural.scale.gradiniLegno > 0 && (
                   <div className="p-2 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-5 h-5 border-2 border-emerald-200 rounded bg-white" /><span className="text-[9px] font-black text-slate-700 uppercase">Gradini in Legno</span></div><span className="text-xl font-black text-emerald-800">{structural.scale.gradiniLegno}</span></div>
                )}
                {structural.scale.gradiniIncavo > 0 && (
                   <div className="p-2 flex items-center justify-between col-span-2"><div className="flex items-center gap-3"><div className="w-5 h-5 border-2 border-emerald-200 rounded bg-white" /><span className="text-[9px] font-black text-slate-700 uppercase">Gradini in Legno con Incavo</span></div><span className="text-xl font-black text-emerald-800">{structural.scale.gradiniIncavo}</span></div>
                )}
             </div>
          </div>
        )}

        {/* Box Corrimano Scaletta */}
        {structural?.scale?.hasHandrails && (
          <div className="border-2 border-emerald-500 rounded-2xl overflow-hidden shadow-sm bg-white">
             <div className="bg-emerald-600 px-5 py-2 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                   <ShieldCheck className="w-4 h-4" />
                   <span className="text-[10px] font-black uppercase tracking-[0.1em]">Componenti Corrimano Scaletta</span>
                </div>
             </div>
             <div className="grid grid-cols-2 divide-x divide-y divide-emerald-100">
                <div className="p-2 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-5 h-5 border-2 border-emerald-400 rounded bg-emerald-50" /><span className="text-[9px] font-black text-emerald-900 uppercase">Elementi Corrimano</span></div><span className="text-xl font-black text-emerald-800">{structural.scale.corrimano}</span></div>
                <div className="p-2 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-5 h-5 border-2 border-emerald-400 rounded bg-emerald-50" /><span className="text-[9px] font-black text-emerald-900 uppercase">Pali Mono Corti</span></div><span className="text-xl font-black text-emerald-800">{structural.scale.paliMonoCorti}</span></div>
             </div>
          </div>
        )}

        {/* Lista Altri Materiali */}
        <div>
          <div className="flex items-center gap-2 mb-2">
             <ClipboardCheck className="w-4 h-4 text-emerald-600" />
             <h2 className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Materiale Accessorio da Caricare</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {data.items
              .filter(item => 
                !item.description.toLowerCase().includes('piedini') && 
                !item.description.toLowerCase().includes('parapetti') &&
                !item.description.toLowerCase().includes('scala di accesso') &&
                !item.description.toLowerCase().includes('corrimano scaletta') &&
                !item.description.toLowerCase().includes('moduli') &&
                !item.description.toLowerCase().includes('palco professionale') &&
                !item.description.toLowerCase().includes('incidenza') &&
                !item.description.toLowerCase().includes('fissaggio')
              )
              .map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                 <div className="w-4 h-4 border-2 border-slate-300 rounded bg-slate-50"></div>
                 <div className="flex-grow">
                    <p className="text-[9px] font-bold text-slate-800 uppercase leading-tight">{item.description}</p>
                 </div>
                 <div className="text-right">
                    <span className="text-lg font-black text-emerald-600">{item.quantity}</span>
                 </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-end gap-10">
         <div className="flex-1 text-center"><p className="text-[8px] font-black text-slate-400 uppercase mb-4">Resp. Carico</p><div className="border-b border-slate-200" /></div>
         <div className="flex-1 text-center"><p className="text-[8px] font-black text-slate-400 uppercase mb-4">Vettore</p><div className="border-b border-slate-200" /></div>
         <div className="flex-1 text-center"><p className="text-[8px] font-black text-slate-400 uppercase mb-4">Data/Ora</p><div className="border-b border-slate-200 pb-1 text-[8px] text-slate-300">__/__/___ __:__</div></div>
      </div>
    </div>
  );
};
