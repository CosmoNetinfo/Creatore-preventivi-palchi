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

    const pesoBulloneria = bulloneriaCount * 30; // 30g a bullone circa
    const weightRounded = Math.round(pesoBulloneria);

    // 2. M8x35 + Rondelle Eccentriche per sistemi Spin (i modelli DB PRO utilizzano il sistema Spin)
    const isSpin = data.stageType.toUpperCase().includes("SPIN") || data.stageType.toUpperCase().includes("DB PRO");
    let bulloneria35 = null;
    let rondelleEccentriche = null;

    if (isSpin) {
      const b35Count = Math.round(
        (Math.max(0, gambe4 - 1) * 4) +
        (gambe3 * 2)
      );
      bulloneria35 = {
        count: b35Count,
        weight: Math.round(b35Count * 45) // 45g a bullone M8x35
      };
      rondelleEccentriche = {
        count: b35Count
      };
    }

    return {
      L,
      P,
      tipoPannello,
      lisci,
      innesto,
      gambe4,
      gambe3,
      pannelliCount,
      totalChecklistFeet,
      bulloneriaCount,
      weightRounded,
      bulloneria35,
      rondelleEccentriche,
      parapetti,
      scale
    };
  };

  const structural = getStructuralDetails();

  return (
    <div className="a4-page shadow-lg print:shadow-none p-[12mm] bg-white flex flex-col relative border-4 border-emerald-500">
      {/* Header Bolla - Spaziature ridotte */}
      <div className="flex justify-between items-center bg-emerald-600 text-white p-4 -m-[12mm] mb-6 shadow-md select-none">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
             <Truck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter leading-none">
              Bolla di Carico
            </h1>
            <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest mt-0.5">EasyEvent Checklist Logistica</p>
          </div>
        </div>
        <div className="text-right">
           <div className="text-xl font-black">SPED: {data.number.replace('OFF-', 'EE-')}</div>
           <p className="text-[9px] font-bold opacity-70">Emissioni del {new Date().toLocaleDateString('it-IT')}</p>
        </div>
      </div>

      {/* Dettaglio commessa - Più compatto */}
      <div className="grid grid-cols-2 gap-4 mb-4 select-none">
         <div className="border-l-4 border-emerald-500 pl-3 bg-slate-50 p-2.5 rounded-r-lg text-xs">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Destinatario / Cliente</h3>
            <p className="text-base font-bold text-slate-800 leading-tight">{data.client.companyName || "N/A"}</p>
            <p className="text-xs font-semibold text-slate-600">
              {data.client.locality && data.client.locality !== data.client.city ? `${data.client.locality} - ` : ''}
              {data.client.city} ({data.client.province})
            </p>
            <p className="text-[10px] text-slate-400 font-bold mt-1 flex items-center gap-1"><UserCheck className="w-3 h-3" /> Ref: {data.client.contactName}</p>
         </div>
         <div className="border-l-4 border-slate-200 pl-3 p-2.5 text-xs">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Dettaglio Commessa</h3>
            <p className="text-xs font-bold text-slate-850">{data.title}</p>
            <p className="text-[9px] font-bold text-emerald-600 uppercase mt-0.5">SISTEMA: {data.stageType} {structural ? `(${structural.L}x${structural.P} MT)` : ''}</p>
         </div>
      </div>

      {/* Spazio carte - Ridotto a space-y-2 */}
      <div className="flex-grow space-y-2 select-none">
        
        {/* Box Struttura Metallica */}
        {structural && (
          <div className="border-2 border-emerald-250/60 rounded-xl overflow-hidden shadow-sm bg-emerald-50/20 break-inside-avoid">
             <div className="bg-emerald-600 px-4 py-1.5 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                   <LayoutGrid className="w-3.5 h-3.5" />
                   <span className="text-[9px] font-black uppercase tracking-wider">Componenti Struttura Metallica ({structural.L}x{structural.P} mt)</span>
                </div>
             </div>
             
             <div className="grid grid-cols-2 divide-x divide-y divide-emerald-200/50">
                <div className="p-1.5 px-3 flex items-center justify-between hover:bg-white transition-colors">
                   <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 border-2 border-emerald-400 rounded flex items-center justify-center bg-white"><div className="w-1.5 h-1.5 rounded-full bg-slate-100" /></div>
                      <span className="text-[8.5px] font-bold text-slate-800 uppercase">Telai LISCI</span>
                   </div>
                   <span className="text-base font-black text-emerald-700">{structural.lisci}</span>
                </div>
                <div className="p-1.5 px-3 flex items-center justify-between hover:bg-white transition-colors">
                   <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 border-2 border-emerald-400 rounded flex items-center justify-center bg-white"><div className="w-1.5 h-1.5 rounded-full bg-slate-100" /></div>
                      <span className="text-[8.5px] font-bold text-slate-800 uppercase">Telai INNESTO</span>
                   </div>
                   <span className="text-base font-black text-emerald-700">{structural.innesto}</span>
                </div>
                <div className="p-1.5 px-3 flex items-center justify-between hover:bg-white transition-colors">
                   <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 border-2 border-emerald-400 rounded flex items-center justify-center bg-white"><div className="w-1.5 h-1.5 rounded-full bg-slate-100" /></div>
                      <span className="text-[8.5px] font-bold text-slate-800 uppercase">Gambe 4 INN.</span>
                   </div>
                   <span className="text-base font-black text-emerald-700">{structural.gambe4}</span>
                </div>
                <div className="p-1.5 px-3 flex items-center justify-between hover:bg-white transition-colors">
                   <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 border-2 border-emerald-400 rounded flex items-center justify-center bg-white"><div className="w-1.5 h-1.5 rounded-full bg-slate-100" /></div>
                      <span className="text-[8.5px] font-bold text-slate-800 uppercase">Gambe 3 INN.</span>
                   </div>
                   <span className="text-base font-black text-emerald-700">{structural.gambe3}</span>
                </div>
                <div className="p-1.5 px-3 flex items-center justify-between hover:bg-white transition-colors col-span-2">
                   <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 border-2 border-emerald-600 rounded flex items-center justify-center bg-white"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /></div>
                      <span className="text-[8.5px] font-bold text-slate-800 uppercase">Piedini Regolabili (Totali Logistica)</span>
                   </div>
                   <div className="text-right">
                      <span className="text-base font-black text-emerald-800">{structural.totalChecklistFeet}</span>
                      <span className="text-[7px] text-slate-400 font-bold uppercase ml-1.5">Formula: G3 + (G4-1) + Scale</span>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* Box Pannelli */}
        {structural && (
          <div className="border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white break-inside-avoid">
             <div className="bg-slate-800 px-4 py-1.5 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                   <Layers className="w-3.5 h-3.5 text-emerald-400" />
                   <span className="text-[9px] font-black uppercase tracking-wider">Componenti Piano di Calpestio</span>
                </div>
             </div>
             <div className="p-1.5 px-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2.5">
                   <div className="w-4 h-4 border-2 border-slate-300 rounded flex items-center justify-center bg-white"><div className="w-1.5 h-1.5 rounded-full bg-slate-100" /></div>
                   <span className="text-[8.5px] font-bold text-slate-700 uppercase">{structural.tipoPannello}</span>
                </div>
                <span className="text-base font-black text-slate-900">{structural.pannelliCount}</span>
             </div>
          </div>
        )}

        {/* Box Bulloneria */}
        {structural && (
          <div className="border-2 border-slate-300 rounded-xl overflow-hidden shadow-sm bg-slate-50 break-inside-avoid">
             <div className="bg-slate-800 px-4 py-1.5 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                   <Nut className="w-3.5 h-3.5 text-emerald-400" />
                   <span className="text-[9px] font-black uppercase tracking-wider">Componenti Bulloneria</span>
                </div>
             </div>
             <div className="divide-y divide-slate-200/50">
                <div className="p-1.5 px-3 flex items-center justify-between hover:bg-white transition-colors">
                   <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 border-2 border-slate-400 rounded flex items-center justify-center bg-white"><div className="w-1.5 h-1.5 rounded-full bg-slate-100" /></div>
                      <span className="text-[8.5px] font-bold text-slate-800 uppercase">Bulloncini M8x16</span>
                   </div>
                   <div className="text-right">
                      <div className="text-sm font-black text-emerald-600">{structural.bulloneriaCount}</div>
                      <div className="text-[8px] font-bold text-slate-450 uppercase leading-none mt-0.5">Peso: {structural.weightRounded}g</div>
                   </div>
                </div>

                {structural.bulloneria35 && (
                   <div className="p-1.5 px-3 flex items-center justify-between hover:bg-white transition-colors bg-emerald-50/10">
                     <div className="flex items-center gap-2.5">
                        <div className="w-4 h-4 border-2 border-emerald-400 rounded flex items-center justify-center bg-white"><div className="w-1.5 h-1.5 rounded-full bg-emerald-100" /></div>
                        <span className="text-[8.5px] font-bold text-slate-800 uppercase">Bulloncini M8x35 (Sist. Spin)</span>
                     </div>
                     <div className="text-right">
                        <div className="text-sm font-black text-emerald-600">{structural.bulloneria35.count}</div>
                        <div className="text-[8px] font-bold text-slate-450 uppercase leading-none mt-0.5">Peso: {structural.bulloneria35.weight}g</div>
                     </div>
                   </div>
                )}

                {structural.rondelleEccentriche && (
                   <div className="p-1.5 px-3 flex items-center justify-between hover:bg-white transition-colors bg-emerald-50/10">
                     <div className="flex items-center gap-2.5">
                        <div className="w-4 h-4 border-2 border-emerald-400 rounded flex items-center justify-center bg-white"><div className="w-1.5 h-1.5 rounded-full bg-emerald-100" /></div>
                        <span className="text-[8.5px] font-bold text-slate-800 uppercase">Rondelle Eccentriche (Sist. Spin)</span>
                     </div>
                     <span className="text-base font-black text-emerald-700">{structural.rondelleEccentriche.count}</span>
                   </div>
                )}
             </div>
          </div>
        )}

        {/* Box Parapetti */}
        {structural?.parapetti && (
          <div className="border-2 border-emerald-500 rounded-xl overflow-hidden shadow-sm bg-white break-inside-avoid">
             <div className="bg-emerald-600 px-4 py-1.5 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                   <ShieldAlert className="w-3.5 h-3.5" />
                   <span className="text-[9px] font-black uppercase tracking-wider">Componenti Parapetti di Sicurezza</span>
                </div>
             </div>
             <div className="grid grid-cols-2 divide-x divide-y divide-emerald-100">
                <div className="p-1.5 px-3 flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="w-4 h-4 border border-emerald-200 rounded bg-white" /><span className="text-[8.5px] font-bold text-slate-700 uppercase">Sponde Liscie 2m</span></div><span className="text-base font-black text-emerald-600">{structural.parapetti.spondeLiscie2m}</span></div>
                <div className="p-1.5 px-3 flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="w-4 h-4 border border-emerald-200 rounded bg-white" /><span className="text-[8.5px] font-bold text-slate-700 uppercase">Sponde Cerchio 2m</span></div><span className="text-base font-black text-emerald-600">{structural.parapetti.spondeCerchio2m}</span></div>
                <div className="p-1.5 px-3 flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="w-4 h-4 border border-emerald-200 rounded bg-white" /><span className="text-[8.5px] font-bold text-slate-700 uppercase">Sponde Liscie 1m</span></div><span className="text-base font-black text-emerald-600">{structural.parapetti.spondeLiscie1m}</span></div>
                <div className="p-1.5 px-3 flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="w-4 h-4 border border-emerald-200 rounded bg-white" /><span className="text-[8.5px] font-bold text-slate-700 uppercase">Sponde Cerchio 1m</span></div><span className="text-base font-black text-emerald-600">{structural.parapetti.spondeCerchio1m}</span></div>
                <div className="p-1.5 px-3 flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="w-4 h-4 border border-emerald-200 rounded bg-white" /><span className="text-[8.5px] font-bold text-slate-700 uppercase">Pali Mono</span></div><span className="text-base font-black text-emerald-600">{structural.parapetti.paliMono}</span></div>
                <div className="p-1.5 px-3 flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="w-4 h-4 border border-emerald-200 rounded bg-white" /><span className="text-[8.5px] font-bold text-slate-700 uppercase">Pali Stereo</span></div><span className="text-base font-black text-emerald-600">{structural.parapetti.paliStereo}</span></div>
             </div>
          </div>
        )}

        {/* Box Scaletta */}
        {structural?.scale && (
          <div className="border-2 border-emerald-800 rounded-xl overflow-hidden shadow-sm bg-slate-50/50 break-inside-avoid">
             <div className="bg-emerald-950 px-4 py-1.5 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                   <Footprints className="w-3.5 h-3.5" />
                   <span className="text-[9px] font-black uppercase tracking-wider">Componenti Scaletta di Accesso</span>
                </div>
             </div>
             <div className="grid grid-cols-2 divide-x divide-y divide-emerald-100">
                <div className="p-1.5 px-3 flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="w-4 h-4 border border-emerald-200 rounded bg-white" /><span className="text-[8.5px] font-bold text-slate-700 uppercase">Elemento Scaletta DX</span></div><span className="text-base font-black text-emerald-800">{structural.scale.destro}</span></div>
                <div className="p-1.5 px-3 flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="w-4 h-4 border border-emerald-200 rounded bg-white" /><span className="text-[8.5px] font-bold text-slate-700 uppercase">Elemento Scaletta SX</span></div><span className="text-base font-black text-emerald-800">{structural.scale.sinistro}</span></div>
                <div className="p-1.5 px-3 flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="w-4 h-4 border border-emerald-200 rounded bg-white" /><span className="text-[8.5px] font-bold text-slate-700 uppercase">Logheroni Scaletta</span></div><span className="text-base font-black text-emerald-800">{structural.scale.logheroni}</span></div>
                {structural.scale.gradiniLegno > 0 && (
                   <div className="p-1.5 px-3 flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="w-4 h-4 border border-emerald-200 rounded bg-white" /><span className="text-[8.5px] font-bold text-slate-700 uppercase">Gradini in Legno</span></div><span className="text-base font-black text-emerald-800">{structural.scale.gradiniLegno}</span></div>
                )}
                {structural.scale.gradiniIncavo > 0 && (
                   <div className="p-1.5 px-3 flex items-center justify-between col-span-2"><div className="flex items-center gap-2.5"><div className="w-4 h-4 border border-emerald-200 rounded bg-white" /><span className="text-[8.5px] font-bold text-slate-700 uppercase">Gradini in Legno con Incavo</span></div><span className="text-base font-black text-emerald-800">{structural.scale.gradiniIncavo}</span></div>
                )}
             </div>
          </div>
        )}

        {/* Box Corrimano Scaletta */}
        {structural?.scale?.hasHandrails && (
          <div className="border-2 border-emerald-500 rounded-xl overflow-hidden shadow-sm bg-white break-inside-avoid">
             <div className="bg-emerald-600 px-4 py-1.5 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                   <ShieldCheck className="w-3.5 h-3.5" />
                   <span className="text-[9px] font-black uppercase tracking-wider">Componenti Corrimano Scaletta</span>
                </div>
             </div>
             <div className="grid grid-cols-2 divide-x divide-y divide-emerald-100">
                <div className="p-1.5 px-3 flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="w-4 h-4 border border-emerald-300 rounded bg-emerald-50" /><span className="text-[8.5px] font-bold text-emerald-900 uppercase">Elementi Corrimano</span></div><span className="text-base font-black text-emerald-800">{structural.scale.corrimano}</span></div>
                <div className="p-1.5 px-3 flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="w-4 h-4 border border-emerald-300 rounded bg-emerald-50" /><span className="text-[8.5px] font-bold text-emerald-900 uppercase">Pali Mono Corti</span></div><span className="text-base font-black text-emerald-800">{structural.scale.paliMonoCorti}</span></div>
             </div>
          </div>
        )}

        {/* Lista Altri Materiali */}
        <div className="break-inside-avoid">
          <div className="flex items-center gap-2 mb-1.5">
             <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
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
              <div key={item.id} className="flex items-center gap-2.5 p-1.5 px-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                 <div className="w-3.5 h-3.5 border border-slate-350 rounded bg-slate-50"></div>
                 <div className="flex-grow">
                    <p className="text-[8.5px] font-bold text-slate-800 uppercase leading-tight">{item.description}</p>
                 </div>
                 <div className="text-right">
                    <span className="text-sm font-black text-emerald-600">{item.quantity}</span>
                 </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-end gap-10 select-none">
         <div className="flex-1 text-center"><p className="text-[7.5px] font-black text-slate-400 uppercase mb-3">Resp. Carico</p><div className="border-b border-slate-200" /></div>
         <div className="flex-1 text-center"><p className="text-[7.5px] font-black text-slate-400 uppercase mb-3">Vettore</p><div className="border-b border-slate-200" /></div>
         <div className="flex-1 text-center"><p className="text-[7.5px] font-black text-slate-400 uppercase mb-3">Data/Ora</p><div className="border-b border-slate-200 pb-1 text-[7.5px] text-slate-300">__/__/___ __:__</div></div>
      </div>
    </div>
  );
};
