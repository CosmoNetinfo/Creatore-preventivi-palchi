
import React, { useMemo } from 'react';
import { QuoteData } from '../types';
import { loadSettings } from './SettingsPanel';


interface QuotePreviewProps {
  data: QuoteData;
}

import backgroundCover from '../assets/quote/background-cover.jpg';
import dbPro6Image from '../assets/quote/db-pro-6.png';
import miniImage from '../assets/quote/mini.png';
import miniInoxImage from '../assets/quote/mini-inox.png';
import firmaImage from '../assets/quote/firma.png';
import bannerImage from '../assets/quote/banner.jpeg';
import portfolioImage from '../assets/quote/portfolio-clienti.png';

const FIRST_PAGE_BG = backgroundCover;

// Map stage types to placeholders if no real image provided yet
const PRODUCT_IMAGES: Record<string, string> = {
  'DB PRO 6': dbPro6Image,
  'DB PRO 6 INOX': 'https://placehold.co/800x600/eeeeee/333333?text=DB+PRO+6+INOX',
  'MINI': miniImage,
  'MINI INOX': miniInoxImage,
  'PEDANA': 'https://placehold.co/800x600/eeeeee/333333?text=PEDANA+MODULARE'
};

export const QuotePreview: React.FC<QuotePreviewProps> = ({ data }) => {
  const totals = useMemo(() => {
    let subtotal = 0;
    let totalModulesSqm = 0;

    data.items.forEach(item => {
      const lineTotal = item.quantity * item.unitPrice;
      subtotal += lineTotal;
      
      // Calcolo MQ per Trasporto (cerca "Moduli" nella descrizione)
      if (item.description.includes("Moduli")) {
        totalModulesSqm += item.quantity;
      }
    });

    const discountMultiplier = 1 - (data.discountPercentage / 100);
    const discountedAmount = subtotal * discountMultiplier;
    const roundedAmount = Math.floor(discountedAmount / 100) * 100;
    const finalAmount = roundedAmount - 20;

    return {
      subtotal,
      discountedAmount,
      roundedAmount,
      finalAmount,
      totalModulesSqm
    };
  }, [data.items, data.discountPercentage]);

  const displayQuoteNumber = useMemo(() => {
    if (!data.number) return '';
    const parts = data.number.split('-');
    if (parts.length === 2 && !data.number.startsWith('OFF-')) {
        const year = new Date(data.date).getFullYear();
        return `${parts[1]} / ${year}`;
    }
    return data.number;
  }, [data.number, data.date]);

  const transportCost = totals.totalModulesSqm * (data.isIslands ? 16 : 12);
  const packagingCost = totals.subtotal * 0.03;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getUnit = (desc: string) => {
    const d = desc.toLowerCase();
    if (d.includes('moduli') || d.includes('incidenza') || d.includes('supplemento') || d.includes('fissaggio')) return 'mq';
    if (d.includes('parapetti')) return 'ml';
    if (d.includes('piedini') || d.includes('scala') || d.includes('corrimano')) return 'pz.';
    return '';
  };

  const CompanyFooter = () => (
    <div className="absolute bottom-[10mm] left-[15mm] right-[15mm] text-center text-[9px] leading-tight text-slate-500 border-t border-slate-200 pt-3">
       <p className="font-semibold text-slate-700">Easyevent S.r.l.s. - C.so Flaminio 81, 83, 85, 87 - Fraz. San Giacomo - 06049 Spoleto (PG) C.FISC/P.IVA: 03595360540</p>
       <p className="mt-0.5">Mob. + 39 328.2376480 | +39 328.9514396 Sede Legale: +39 0743.522865 | Sede Operativa: +39 0743.681320</p>
       <p className="mt-0.5">email: easyevent.it@gmail.com</p>
    </div>
  );

  const productImage = PRODUCT_IMAGES[data.stageType || 'DB PRO 6'] || PRODUCT_IMAGES['DB PRO 6'];

  return (
    <div className="flex flex-col gap-8 print:block print:gap-0">
      
      {/* ----------------- PAGE 1: COVER (RESTYLED) ----------------- */}
      <div 
        className="a4-page shadow-lg print:shadow-none p-[15mm] flex flex-col relative print:mb-0"
        style={{ 
          backgroundImage: `url(${FIRST_PAGE_BG})`,
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Client Info Row - WHITE TEXT */}
        <div className="mt-[40mm] mb-12 text-white text-sm">
           {data.client.companyName && (
              <p><span className="font-light opacity-70">Spett.le</span> <span className="font-bold block text-xl mt-1">{data.client.companyName}</span></p>
           )}
           {data.client.contactName && (
              <p className="mt-4"><span className="font-light opacity-70">C.A. Sig./ra</span> <span className="font-bold block text-lg">{data.client.contactName}</span></p>
           )}
           {!data.client.companyName && !data.client.contactName && (
             <p className="text-white/40 italic">Dati cliente mancanti...</p>
           )}
        </div>

        {/* Object & Offer Info Row - WHITE TEXT */}
        <div className="mb-10 flex justify-between items-end">
          <div className="w-2/3 pr-4">
            <h2 className="text-xs font-bold text-white/70 uppercase tracking-widest mb-2">OGGETTO</h2>
            <div className="text-4xl font-light text-white leading-tight">
               {data.title || 'Oggetto Preventivo'}
            </div>
            <div className="w-24 h-1 bg-white mt-6"></div>
          </div>

          <div className="w-1/3 text-right border-l-2 border-white/50 pl-4 py-1">
             <div className="text-xs text-white/60 uppercase tracking-widest mb-1">Offerta n°</div>
             <div className="text-2xl font-bold text-white">{displayQuoteNumber}</div>
             <div className="text-xs text-white/60 mt-2">Spoleto lì, {formatDate(data.date)}</div>
          </div>
        </div>

        {/* Main Content: Image & Text - WHITE TEXT */}
        <div className="flex flex-col flex-grow mt-6">
          <div className="w-full flex justify-center items-center py-6 mb-10">
             <img 
               src={productImage} 
               alt={data.stageType}
               className="max-w-full max-h-[100mm] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
             />
          </div>

          <div className="text-white/90 leading-relaxed whitespace-pre-wrap text-sm text-justify max-w-[160mm] mx-auto">
             {data.introduction || "Nessuna introduzione inserita."}
          </div>
        </div>

        {/* Footer removed for Page 1 as requested */}
      </div>

      {/* ----------------- PAGE 2: DETAILS & COSTS ----------------- */}
      <div className="a4-page shadow-lg print:shadow-none p-[15mm] flex flex-col relative print:mb-0">
        <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
           <div className="text-brand-600 font-bold text-xl">
              {data.company.logoUrl ? (
                 <img src={data.company.logoUrl} alt="Logo" className="h-8 object-contain" />
              ) : "EasyEvent"}
           </div>
        </div>

        <div className="flex-grow">
          <h2 className="text-lg font-bold text-slate-800 mb-3">Dettaglio</h2>
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                <th className="py-1.5 px-4 text-left font-semibold w-[35%] rounded-tl-lg whitespace-nowrap">Descrizione</th>
                <th className="py-1.5 px-4 text-left font-semibold w-[25%] whitespace-nowrap">Specs</th>
                <th className="py-1.5 px-4 text-center font-semibold whitespace-nowrap">Q.tà</th>
                {loadSettings().printShowPrices && (
                  <>
                    <th className="py-1.5 px-4 text-right font-semibold whitespace-nowrap">Prezzo Unit.</th>
                    <th className="py-1.5 px-4 text-right font-semibold rounded-tr-lg whitespace-nowrap">Totale</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-1.5 px-4 text-slate-700 font-medium align-top">{item.description}</td>
                  <td className="py-1.5 px-4 text-slate-500 italic align-top">{item.specs}</td>
                  <td className="py-1.5 px-4 text-center text-slate-600 align-top whitespace-nowrap">
                    {item.quantity} <span className="text-xs text-slate-400 font-normal">{getUnit(item.description)}</span>
                  </td>
                  {loadSettings().printShowPrices && (
                    <>
                      <td className="py-1.5 px-4 text-right text-slate-600 align-top whitespace-nowrap">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-1.5 px-4 text-right text-slate-800 font-semibold align-top whitespace-nowrap">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-row gap-8 mb-4 items-start">
            <div className={`${loadSettings().printShowPrices ? 'w-1/2' : 'w-full'} space-y-4`}>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                    <h4 className="font-bold text-slate-700 mb-2 uppercase">Dati Bancari</h4>
                    <p><span className="font-semibold text-slate-500">Banca:</span> {data.company.bankName}</p>
                    <p><span className="font-semibold text-slate-500">IBAN:</span> {data.company.iban}</p>
                </div>
                <div className="text-xs text-slate-500">
                    <p className="whitespace-pre-wrap mb-2">{data.notes}</p>
                    <p className="font-medium text-slate-700">Offerta valida fino al: {formatDate(data.validUntil)}</p>
                </div>
                {loadSettings().printShowPrices && (
                  <div className="border-t border-slate-200 pt-2 text-xs text-slate-500 space-y-1">
                      <div className="flex justify-between">
                          <span>Trasporto ({data.isIslands ? 'Isole' : 'Standard'}):</span>
                          <span className="font-semibold">{formatCurrency(transportCost)}</span>
                      </div>
                      <div className="flex justify-between">
                          <span>Imballaggio (3%):</span>
                          <span className="font-semibold">{formatCurrency(packagingCost)}</span>
                      </div>
                  </div>
                )}
            </div>

            {loadSettings().printShowPrices && (
              <div className="w-1/2 bg-slate-50 p-6 rounded-lg border border-slate-100 relative">
                <div className="flex justify-between text-base font-bold text-slate-800 mb-4">
                  <span>Totale Imponibile</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="space-y-2 pt-2 border-t border-slate-200 border-dashed">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Sconto ({data.discountPercentage}%)</span>
                    <span className="font-medium text-slate-700">{formatCurrency(totals.discountedAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Arrotondamento</span>
                    <span className="font-medium text-slate-700">{formatCurrency(totals.roundedAmount)}</span>
                  </div>
                  <div className="mt-3 flex justify-between items-center text-lg font-bold text-brand-700 bg-brand-50 p-3 rounded border border-brand-100">
                     <span>Netto a lei Riservato</span>
                     <span>{formatCurrency(totals.finalAmount)}</span>
                  </div>
                </div>
                <div className="mt-4 text-right">
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      Tutti i prezzi sono IVA 22% Esclusa
                    </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {loadSettings().printShowSignature && (
          <div className="mt-auto mb-20 grid grid-cols-2 gap-20">
             <div className="border-t border-slate-300 pt-2 text-center text-xs text-slate-400 relative">
                <img src={firmaImage} alt="Firma" className="absolute bottom-4 left-1/2 -translate-x-1/2 max-h-20 object-contain pointer-events-none" />
                Timbro e Firma EasyEvent
             </div>
             <div className="border-t border-slate-300 pt-2 text-center text-xs text-slate-400">
                Timbro e Firma Cliente per accettazione
             </div>
          </div>
        )}
        <CompanyFooter />
      </div>

      {/* ----------------- PAGE 3: EXTRA ----------------- */}
      <div className="a4-page shadow-lg print:shadow-none p-[15mm] flex flex-col relative print:mb-0">
        <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
           <div className="text-brand-600 font-bold text-xl">
              {data.company.logoUrl ? <img src={data.company.logoUrl} alt="Logo" className="h-8 object-contain" /> : "EasyEvent"}
           </div>
        </div>
        <div className="w-full mb-8 relative group">
            <div className="absolute top-0 right-0 p-2">
                 <div className="bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-800 px-2 py-1 text-[9px] font-bold uppercase tracking-widest shadow-sm rounded-bl-lg">
                    PALCO REALIZZATO PER UNA TAPPA DEL TOUR DEI NEGRITA
                 </div>
            </div>
            <img src={bannerImage} alt="Banner" className="w-full h-auto object-contain" />
            <div className="absolute bottom-4 left-0">
                 <div className="bg-brand-600 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest shadow-lg rounded-r-lg">
                    Banner Minigonna PVC Omaggio
                 </div>
            </div>
        </div>
        <div className="flex-grow flex flex-col justify-end pb-24">
            <div className="text-center w-full">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">
                    ABBIAMO AVUTO L’ONORE ED IL PIACERE DI COLLABORARE CON:
                </h3>
                 <div className="w-full border-t border-slate-100 pt-6">
                   <img src={portfolioImage} alt="Portfolio" className="w-full h-auto object-contain max-h-[180mm]" />
                 </div>
            </div>
        </div>
        <CompanyFooter />
      </div>

    </div>
  );
};
