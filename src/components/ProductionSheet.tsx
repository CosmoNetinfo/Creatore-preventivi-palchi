
import React from 'react';
import { QuoteData } from '../types';
import { Hammer, Scissors, Check } from 'lucide-react';

interface ProductionSheetProps {
  data: QuoteData;
}

export const ProductionSheet: React.FC<ProductionSheetProps> = ({ data }) => {
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

    // FORMULE TELAI
    const lisci = (L / 2) * (P + 1) - 1;
    const innesto = (L / 2 + 1) * (P / 2) + 1;

    // FORMULE GAMBE
    const gambe4 = ((L / 2) + 1) * (P / 2) + 1;
    const gambe3 = (L / 2) + 1;

    // FORMULE PARAPETTI E CORRIMANO
    const hasGuardrails = data.items.some(item => item.description.toLowerCase().includes("parapetti"));
    const hasHandrails = data.items.some(item => item.description.toLowerCase().includes("corrimano scaletta"));
    
    let paliMono = 0;
    let paliStereo = 0;
    let paliMonoCorti = 0;
    
    // FORMULA SPONDE 2M (stessa logica già usata in DeliveryNote.tsx)
    let spondeLiscie2m = 0;
    if (hasGuardrails) {
      paliMono = 6;
      paliStereo = Math.round((P / 2 - 1) + (L / 2 - 1) + (P / 2));
      const sponde2mCount = (P / 2) + (L / 2) + ((P / 2) - 1);
      spondeLiscie2m = Math.round(sponde2mCount);
    }

    if (hasHandrails) {
      paliMonoCorti = 2; // Come da specifica: sempre 2 per i corrimano scaletta
    }

    return { 
      L, P, 
      lisci: Math.round(lisci), 
      innesto: Math.round(innesto),
      gambe4: Math.round(gambe4),
      gambe3: Math.round(gambe3),
      paliMono,
      paliStereo,
      paliMonoCorti,
      spondeLiscie2m
    };
  };

  const structural = getStructuralDetails();

  // CALCOLO LUNGHEZZA GAMBA: Altezza Finita - 8.5 cm
  const finishedHeight = data.finishedHeight || 83;
  const actualLegLength = finishedHeight - 8.5;
  const legLengthStr = actualLegLength.toString().replace('.', ',');

  // Totale telai per componenti comuni
  const totalFrames = structural ? (structural.lisci + structural.innesto) : 0;

  // Definizione dei pezzi per la distinta di taglio
  const productionRows = [];

  if (structural) {
    // 1. Telai Lisci
    productionRows.push({
      mainElement: "Telai Lisci",
      mainQty: structural.lisci,
      subComponent: "Longheroni Lisci",
      tubular: "40x40x2",
      length: "195,7",
      totalQty: structural.lisci * 2,
      bgColor: "bg-[#c2d6ad]"
    });

    // 2. Telai Innesto
    productionRows.push({
      mainElement: "Telai Innesto",
      mainQty: structural.innesto,
      subComponent: "Longheroni Innesto",
      tubular: "40x40x2",
      length: "195,7",
      totalQty: structural.innesto * 2,
      bgColor: "bg-white"
    });

    // 3. Diagonali
    productionRows.push({
      mainElement: "Telai (L + I)",
      mainQty: totalFrames,
      subComponent: "Diagonali",
      tubular: "20x20x2",
      length: "51,3",
      totalQty: totalFrames * 4,
      bgColor: "bg-[#c2d6ad]"
    });

    // 4. Rompitratta
    productionRows.push({
      mainElement: "Telai (L + I)",
      mainQty: totalFrames,
      subComponent: "Rompitratta",
      tubular: "20x20x2",
      length: "32",
      totalQty: totalFrames * 2,
      bgColor: "bg-white"
    });

    // 5. Gambe a 4
    productionRows.push({
      mainElement: "Gambe",
      mainQty: structural.gambe4,
      subComponent: "Gambe a 4",
      tubular: "40x40x2",
      length: legLengthStr,
      totalQty: structural.gambe4,
      bgColor: "bg-[#c2d6ad]",
      highlight: true
    });

    // 6. Gambe a 3
    productionRows.push({
      mainElement: "Gambe",
      mainQty: structural.gambe3,
      subComponent: "Gambe a 3",
      tubular: "40x40x2",
      length: legLengthStr,
      totalQty: structural.gambe3,
      bgColor: "bg-white",
      highlight: true
    });

    // 7. Interno Telescopico (Se abilitato nel preventivo)
    if (data.includeTelescopicLegs) {
      const totalLegs = structural.gambe4 + structural.gambe3;
      const telescopicLength = finishedHeight - 13;
      productionRows.push({
        mainElement: "Telescopici",
        mainQty: totalLegs,
        subComponent: "Interno Gambe",
        tubular: "35x35x2",
        length: telescopicLength.toString().replace('.', ','),
        totalQty: totalLegs,
        bgColor: "bg-brand-50",
        highlight: true
      });
    }

    // 8. Pali Mono (Se presenti parapetti)
    if (structural.paliMono > 0) {
      productionRows.push({
        mainElement: "Parapetti",
        mainQty: structural.paliMono,
        subComponent: "Pali Mono",
        tubular: "40x40x2",
        length: "116,3",
        totalQty: structural.paliMono,
        bgColor: "bg-[#c2d6ad]",
        highlight: true
      });
    }

    // 9. Pali Stereo (Se presenti parapetti)
    if (structural.paliStereo > 0) {
      productionRows.push({
        mainElement: "Parapetti",
        mainQty: structural.paliStereo,
        subComponent: "Pali Stereo",
        tubular: "40x40x2",
        length: "116,3",
        totalQty: structural.paliStereo,
        bgColor: "bg-white",
        highlight: true
      });
    }

    // 10. Pali Mono Corti (Se presenti corrimano scaletta)
    if (structural.paliMonoCorti > 0) {
      productionRows.push({
        mainElement: "Corrimano",
        mainQty: structural.paliMonoCorti,
        subComponent: "Pali Mono Corti",
        tubular: "40x40x2",
        length: "99,8",
        totalQty: structural.paliMonoCorti,
        bgColor: "bg-[#c2d6ad]",
        highlight: true
      });
    }

    // 11. Innesti Pali Standard (Mono + Stereo)
    const standardPoles = structural.paliMono + structural.paliStereo;
    if (standardPoles > 0) {
      productionRows.push({
        mainElement: "Innesti Pali",
        mainQty: standardPoles,
        subComponent: "Interno Pali Standard",
        tubular: "35x35x3",
        length: "99,5",
        totalQty: standardPoles,
        bgColor: "bg-white",
        highlight: true
      });
    }

    // 12. Innesti Pali Corti (Solo Corti)
    if (structural.paliMonoCorti > 0) {
      productionRows.push({
        mainElement: "Innesti Corti",
        mainQty: structural.paliMonoCorti,
        subComponent: "Interno Pali Corti",
        tubular: "35x35x3",
        length: "24",
        totalQty: structural.paliMonoCorti,
        bgColor: "bg-[#c2d6ad]",
        highlight: true
      });
    }

    // 13. Bicchierini (Formula: G4*8 + G3*6 + PMono*2 + PMonoCorti*2 + PStereo*4)
    const bicchieriniCount = 
      (structural.gambe4 * 8) + 
      (structural.gambe3 * 6) + 
      (structural.paliMono * 2) + 
      (structural.paliMonoCorti * 2) + 
      (structural.paliStereo * 4);
    
    if (bicchieriniCount > 0) {
      productionRows.push({
        mainElement: "Bicchierini",
        mainQty: bicchieriniCount,
        subComponent: "Bicchierini Fissaggio",
        tubular: "40x40x2",
        length: "6",
        totalQty: bicchieriniCount,
        bgColor: "bg-white",
        highlight: true
      });
    }
  }

  return (
    <div className="a4-page shadow-lg print:shadow-none p-[15mm] bg-white flex flex-col relative border-t-[10mm] border-orange-600">
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b-2 border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="bg-orange-600 p-2 rounded-lg">
                <Hammer className="w-6 h-6 text-white" />
             </div>
             <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
               Foglio Produzione
             </h1>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">EasyEvent Officina Tecnica</p>
        </div>
        <div className="text-right">
           <div className="text-xl font-black text-slate-900 uppercase">Commessa: {data.number.replace('OFF-', 'EE-')}</div>
           <p className="text-[10px] font-bold text-orange-600 uppercase">Data Emissione: {new Date().toLocaleDateString('it-IT')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
         <div className="bg-slate-50 p-4 border-l-4 border-orange-500 rounded-r-xl">
            <h3 className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Committente</h3>
            <p className="text-lg font-bold text-slate-800 leading-tight">{data.client.companyName || "N/A"}</p>
            <p className="text-xs font-medium text-slate-500 mt-1">{data.client.city} ({data.client.province})</p>
         </div>
         <div className="bg-slate-50 p-4 border-l-4 border-slate-300 rounded-r-xl">
            <h3 className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Dettaglio Sistema</h3>
            <p className="text-sm font-bold text-slate-800">{data.title}</p>
            <p className="text-[10px] font-black text-orange-600 uppercase mt-1">SISTEMA: {data.stageType} ({structural?.L}x{structural?.P} mt)</p>
         </div>
      </div>

      <div className="flex-grow space-y-8">
        {/* Tabella Distinta di Taglio e Materiali */}
        <div>
          <div className="flex items-center gap-2 mb-4 border-b-2 border-slate-900 pb-2">
             <Scissors className="w-5 h-5 text-orange-600" />
             <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Distinta di Taglio e Materiali</h2>
          </div>
          <table className="w-full border-collapse border border-slate-300">
             <thead>
                <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                   <th className="py-3 px-2 text-left border border-slate-800">Elemento</th>
                   <th className="py-3 px-2 text-center border border-slate-800 w-16">N° Pezzi</th>
                   <th className="py-3 px-2 text-left border border-slate-800">Descrizione Elemento</th>
                   <th className="py-3 px-2 text-center border border-slate-800">Tubolare</th>
                   <th className="py-3 px-2 text-center border border-slate-800">Lunghezza (cm)</th>
                   <th className="py-3 px-2 text-right border border-slate-800">Q.tà Tot</th>
                   <th className="py-3 px-2 text-center border border-slate-800 w-12">OK</th>
                </tr>
             </thead>
             <tbody>
                {productionRows.map((row, idx) => (
                  <tr key={idx} className={`${row.bgColor} border-b border-slate-400`}>
                     <td className={`py-3 px-2 font-black text-sm uppercase ${row.highlight ? 'text-blue-700' : 'text-slate-900'}`}>{row.mainElement}</td>
                     <td className={`py-3 px-2 text-center font-black text-xl ${row.highlight ? 'text-blue-700' : 'text-slate-900'}`}>{row.mainQty}</td>
                     <td className={`py-3 px-2 font-bold text-sm uppercase ${row.highlight ? 'text-blue-700' : 'text-slate-800'}`}>{row.subComponent}</td>
                     <td className="py-3 px-2 text-center text-slate-800 font-bold text-xs">{row.tubular}</td>
                     <td className="py-3 px-2 text-center text-slate-800 font-bold text-xs">{row.length}</td>
                     <td className={`py-3 px-2 text-right font-black text-xl ${row.highlight ? 'text-blue-700' : 'text-slate-900'}`}>{row.totalQty}</td>
                     <td className="py-3 px-2 text-center border-l border-slate-300">
                        <div className="w-6 h-6 border-2 border-slate-400 rounded bg-white mx-auto flex items-center justify-center">
                          {/* Vuoto per spunta manuale */}
                        </div>
                     </td>
                  </tr>
                ))}
                
                {data.items.some(i => i.description.toLowerCase().includes("parapetti")) && (
                  <>
                    <tr className="bg-emerald-50 border-b border-slate-400">
                        <td className="py-3 px-2 text-emerald-900 font-black text-sm uppercase">Sponde</td>
                        <td className="py-3 px-2 text-center text-slate-400 font-black text-xl">{structural?.spondeLiscie2m || 0}</td>
                        <td className="py-3 px-2 text-slate-700 font-bold text-xs uppercase">Sponde 2m (Lisce/Cerchio)</td>
                        <td className="py-3 px-2 text-center text-slate-800 font-bold text-xs">40x40x2</td>
                        <td className="py-3 px-2 text-center text-slate-800 font-bold text-xs">195,7</td>
                        <td className="py-3 px-2 text-right text-slate-900 font-black text-xl">{structural?.spondeLiscie2m || 0}</td>
                        <td className="py-3 px-2 text-center border-l border-slate-300">
                           <div className="w-6 h-6 border-2 border-slate-400 rounded bg-white mx-auto"></div>
                        </td>
                     </tr>
                  </>
                )}
             </tbody>
          </table>
          <p className="mt-2 text-[8px] italic text-slate-400">* Bicchierini (40x40x2) lunghi 6 cm. Innesti Standard 99,5 cm. Gambe Telescopiche (35x35x2) lunghezza H-{finishedHeight}-13. Lunghezza gamba: Altezza Finita ({finishedHeight} cm) - 8,5 cm.</p>
        </div>

        {/* Note Tecniche */}
        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Annotazioni per la Produzione</h3>
           <div className="space-y-4">
              <div className="flex gap-4">
                 <div className="flex-1 border-b border-slate-200 pb-2"></div>
                 <div className="flex-1 border-b border-slate-200 pb-2"></div>
              </div>
              <div className="flex gap-4">
                 <div className="flex-1 border-b border-slate-200 pb-2"></div>
                 <div className="flex-1 border-b border-slate-200 pb-2"></div>
              </div>
           </div>
        </div>
      </div>

      {/* Approvazione */}
      <div className="mt-auto pt-8 flex justify-between items-end gap-12">
         <div className="flex-1 text-center">
            <p className="text-[8px] font-black text-slate-400 uppercase mb-6 tracking-widest">Responsabile Produzione</p>
            <div className="border-b border-slate-200" />
         </div>
         <div className="flex-1 text-center">
            <p className="text-[8px] font-black text-slate-400 uppercase mb-6 tracking-widest">Controllo Qualità</p>
            <div className="border-b border-slate-200" />
         </div>
         <div className="flex-1 text-center">
            <p className="text-[8px] font-black text-slate-400 uppercase mb-6 tracking-widest">Data Fine Lavorazione</p>
            <div className="border-b border-slate-200 text-[10px] text-slate-300 pb-1">__ / __ / ____</div>
         </div>
      </div>
    </div>
  );
};
