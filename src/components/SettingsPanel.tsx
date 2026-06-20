import React, { useState, useEffect } from 'react';
import { Save, Building, Printer, Tag, Eye, EyeOff, Sparkles, Moon, Sun, Type, Sliders } from 'lucide-react';
import { DEFAULT_LOGO_URL } from '../types';

export interface AppSettings {
  // Azienda
  companyName: string;
  companyVatId: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  companyWebsite: string;
  companyBank: string;
  companyIban: string;
  companyLogo: string;

  // Stampa
  fontSize: 'normal' | 'compact' | 'tiny';
  printShowPrices: boolean;
  printShowSignature: boolean;
  defaultNotes: string;

  // Default Nuovi
  defaultVatRate: number;
  defaultDiscount: number;

  // Interfaccia
  darkMode: boolean;
}

export const loadSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem('easyevent_app_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        companyName: parsed.companyName ?? 'Easyevent S.r.l.s.',
        companyVatId: parsed.companyVatId ?? '03595360540',
        companyAddress: parsed.companyAddress ?? 'C.so Flaminio 81, 83, 85, 87 - Fraz. San Giacomo - 06049 Spoleto (PG)',
        companyEmail: parsed.companyEmail ?? 'easyevent.it@gmail.com',
        companyPhone: parsed.companyPhone ?? '+39 328.2376480',
        companyWebsite: parsed.companyWebsite ?? 'www.easyevent.it',
        companyBank: parsed.companyBank ?? 'Poste Italiane',
        companyIban: parsed.companyIban ?? 'IT60S0760103000001040693069',
        companyLogo: parsed.companyLogo ?? DEFAULT_LOGO_URL,
        fontSize: parsed.fontSize ?? 'normal',
        printShowPrices: parsed.printShowPrices ?? true,
        printShowSignature: parsed.printShowSignature ?? true,
        defaultNotes: parsed.defaultNotes ?? "Pagamento: Bonifico Bancario all'ordine",
        defaultVatRate: parsed.defaultVatRate ?? 22,
        defaultDiscount: parsed.defaultDiscount ?? 3,
        darkMode: parsed.darkMode ?? false,
      };
    }
  } catch (e) {
    console.error("Errore nel caricamento delle impostazioni:", e);
  }

  // Valori iniziali predefiniti
  return {
    companyName: 'Easyevent S.r.l.s.',
    companyVatId: '03595360540',
    companyAddress: 'C.so Flaminio 81, 83, 85, 87 - Fraz. San Giacomo - 06049 Spoleto (PG)',
    companyEmail: 'easyevent.it@gmail.com',
    companyPhone: '+39 328.2376480',
    companyWebsite: 'www.easyevent.it',
    companyBank: 'Poste Italiane',
    companyIban: 'IT60S0760103000001040693069',
    companyLogo: DEFAULT_LOGO_URL,
    fontSize: 'normal',
    printShowPrices: true,
    printShowSignature: true,
    defaultNotes: "Pagamento: Bonifico Bancario all'ordine",
    defaultVatRate: 22,
    defaultDiscount: 3,
    darkMode: false,
  };
};

interface SettingsPanelProps {
  onSave: (settings: AppSettings) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onSave }) => {
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [successMsg, setSuccessMsg] = useState(false);

  const handleTextChange = (field: keyof AppSettings, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleToggle = (field: keyof AppSettings) => {
    setSettings(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({
          ...prev,
          companyLogo: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    console.log("Salvataggio impostazioni globali:", settings);
    localStorage.setItem('easyevent_app_settings', JSON.stringify(settings));
    
    // Aggiorna la Dark Mode a livello di DOM HTML
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    onSave(settings);
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 3000);
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans text-slate-800 dark:text-slate-100">
      {successMsg && (
        <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 p-4 rounded-xl font-bold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-5 h-5" />
          <span>Impostazioni salvate con successo! Modifiche applicate globalmente.</span>
        </div>
      )}

      {/* SEZIONE 1: DATI AZIENDALI */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Building className="w-5 h-5 text-brand-600" />
          <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Profilo Aziendale di Default</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ragione Sociale / Nome</label>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => handleTextChange('companyName', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Partita IVA / Codice Fiscale</label>
            <input
              type="text"
              value={settings.companyVatId}
              onChange={(e) => handleTextChange('companyVatId', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Sede Legale ed Operativa</label>
            <input
              type="text"
              value={settings.companyAddress}
              onChange={(e) => handleTextChange('companyAddress', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Indirizzo Email</label>
            <input
              type="email"
              value={settings.companyEmail}
              onChange={(e) => handleTextChange('companyEmail', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Recapito Telefonico</label>
            <input
              type="text"
              value={settings.companyPhone}
              onChange={(e) => handleTextChange('companyPhone', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Sito Web Ufficiale</label>
            <input
              type="text"
              value={settings.companyWebsite}
              onChange={(e) => handleTextChange('companyWebsite', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Istituto Bancario (Appoggio)</label>
            <input
              type="text"
              value={settings.companyBank}
              onChange={(e) => handleTextChange('companyBank', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">IBAN di Accredito</label>
            <input
              type="text"
              value={settings.companyIban}
              onChange={(e) => handleTextChange('companyIban', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500 font-mono"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-6 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-250/30">
            <div className="h-16 w-32 border border-slate-200 dark:border-slate-850 rounded-lg flex items-center justify-center overflow-hidden bg-white shrink-0">
              <img src={settings.companyLogo} alt="Logo Anteprima" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Logo Azienda (PNG/SVG)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-350 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SEZIONE 2: IMPOSTAZIONI DI STAMPA */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Printer className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Opzioni di Stampa & PDF</h3>
        </div>

        <div className="space-y-5">
          {/* FontSize */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Type className="w-4 h-4 text-slate-450" />
              <span>Grandezza dei Caratteri (Documento A4)</span>
            </label>
            <div className="flex gap-2 max-w-md bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
              {(['normal', 'compact', 'tiny'] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => handleTextChange('fontSize', sz)}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                    settings.fontSize === sz
                      ? 'bg-white dark:bg-slate-850 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  {sz === 'normal' && 'Normale'}
                  {sz === 'compact' && 'Compatto (-15%)'}
                  {sz === 'tiny' && 'Molto Compatto (-30%)'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {/* Toggle prezzi */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-250/20">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-slate-800 dark:text-white block">Mostra Prezzi Singoli</span>
                <span className="text-xs text-slate-400">Mostra o ometti i costi unitari e i totali riga.</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('printShowPrices')}
                className={`p-2 rounded-xl transition-all ${
                  settings.printShowPrices 
                    ? 'bg-brand-100 text-brand-600 dark:bg-brand-950/30' 
                    : 'bg-slate-200 text-slate-400 dark:bg-slate-850'
                }`}
              >
                {settings.printShowPrices ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>

            {/* Toggle firma */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-250/20">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-slate-800 dark:text-white block">Spazio Firma Cliente</span>
                <span className="text-xs text-slate-400">Mostra il riquadro per accettazione firma.</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('printShowSignature')}
                className={`p-2 rounded-xl transition-all ${
                  settings.printShowSignature 
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30' 
                    : 'bg-slate-200 text-slate-400 dark:bg-slate-850'
                }`}
              >
                {settings.printShowSignature ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Note predefinite */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Note ed Annotazioni Predefinite</label>
            <textarea
              rows={3}
              value={settings.defaultNotes}
              onChange={(e) => handleTextChange('defaultNotes', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500 font-sans"
            />
          </div>
        </div>
      </div>

      {/* SEZIONE 3: VALORI E DEFAULT */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Tag className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Parametri Nuovi Preventivi</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Aliquota IVA Standard (%)</label>
            <select
              value={settings.defaultVatRate}
              onChange={(e) => handleTextChange('defaultVatRate', Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500 font-bold"
            >
              <option value={22}>22% (Ordinaria)</option>
              <option value={10}>10% (Agevolata)</option>
              <option value={4}>4% (Minima)</option>
              <option value={0}>0% (Esente)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Sconto di Default (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={settings.defaultDiscount}
              onChange={(e) => handleTextChange('defaultDiscount', Number(e.target.value))}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500 font-bold"
            />
          </div>
        </div>
      </div>

      {/* SEZIONE 4: INTERFACCIA E TEMA */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Sliders className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Interfaccia Utente</h3>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-250/20">
          <div className="space-y-0.5">
            <span className="text-sm font-bold text-slate-800 dark:text-white block">Modalità Scura (Dark Mode)</span>
            <span className="text-xs text-slate-400">Rende l'interfaccia dell'applicazione scura per l'uso serale.</span>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('darkMode')}
            className={`p-2.5 rounded-xl transition-all ${
              settings.darkMode 
                ? 'bg-purple-100 text-purple-600 dark:bg-purple-950/30' 
                : 'bg-slate-250 text-slate-500 dark:bg-slate-850'
            }`}
          >
            {settings.darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Pulsante Salva Impostazioni */}
      <div className="flex justify-end pt-2 print:hidden">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-lg shadow-brand-600/20 transition-all hover:scale-102"
        >
          <Save className="w-4 h-4" />
          <span>Salva Impostazioni</span>
        </button>
      </div>
    </div>
  );
};
