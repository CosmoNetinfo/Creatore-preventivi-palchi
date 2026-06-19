
export const DEFAULT_LOGO_URL = '/logo_completo.png';

export type QuoteStatus = 'draft' | 'sold';

export interface LineItem {
  id: string;
  description: string;
  specs?: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

export interface ClientDetails {
  companyName: string;
  contactName: string;
  whatsapp?: string;
  email?: string;
  leadSource?: string;
  locality?: string;
  city?: string;
  province?: string;
  region?: string;
}

export interface CompanyDetails {
  name: string;
  vatId: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  bankName: string;
  iban: string;
  logoUrl?: string;
}

export interface SpecialModuleConfig {
  L: number;
  P: number;
}

export interface QuoteData {
  id?: string;
  number: string;
  date: string;
  validUntil: string;
  title: string;
  status: QuoteStatus; 
  stageType: string;
  finishedHeight: number; 
  includeTelescopicLegs: boolean; 
  introduction: string;
  notes: string;
  extraContent?: string;
  client: ClientDetails;
  company: CompanyDetails;
  items: LineItem[];
  discountPercentage: number;
  isIslands: boolean;
  specialModules: {
    s20x15: SpecialModuleConfig;
    s15x15: SpecialModuleConfig;
    s20x10: SpecialModuleConfig;
    s15x10: SpecialModuleConfig;
    s10x10: SpecialModuleConfig;
    s10x05: SpecialModuleConfig;
    s05x05: SpecialModuleConfig;
  };
}

export interface QuoteRecord {
  id: string;
  quote_number: string;
  client_name: string;
  status: QuoteStatus;
  data: QuoteData;
  created_at: string;
}

export interface StagePriceConfig {
  module: number;
  incidence: number;
  guardrail: number;
  stairs: number;
  handrail: number;
  feet: number;
}

export type PricingConfig = Record<string, StagePriceConfig>;
export type PanelConfig = Record<string, number>;

export const INITIAL_QUOTE: QuoteData = {
  number: ``,
  date: new Date().toISOString().split('T')[0],
  validUntil: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  title: "Palco Modulare DB PRO 6",
  status: 'draft',
  stageType: "DB PRO 6",
  finishedHeight: 83, 
  includeTelescopicLegs: false,
  introduction: "Gentile Cliente,\ncon la presente siamo lieti di sottoporre alla Vostra attenzione la nostra migliore offerta per la realizzazione del Palco/Pedana in oggetto.\n\nDi seguito il dettaglio della nostra offerta con relativa quotazione economica.",
  notes: "Pagamento: Bonifico Bancario all'ordine",
  client: {
    companyName: "",
    contactName: "",
    whatsapp: "",
    email: "",
    leadSource: "Google",
    locality: "",
    city: "",
    province: "",
    region: ""
  },
  company: {
    name: "Easyevent S.r.l.s.",
    vatId: "03595360540",
    address: "C.so Flaminio 81, 83, 85, 87 - Fraz. San Giacomo - 06049 Spoleto (PG)",
    email: "easyevent.it@gmail.com",
    phone: "+39 328.2376480",
    website: "www.easyevent.it",
    bankName: "Poste Italiane",
    iban: "IT60S0760103000001040693069",
    logoUrl: DEFAULT_LOGO_URL
  },
  items: [],
  discountPercentage: 3,
  isIslands: false,
  specialModules: {
    s20x15: { L: 0, P: 0 },
    s15x15: { L: 0, P: 0 },
    s20x10: { L: 0, P: 0 },
    s15x10: { L: 0, P: 0 },
    s10x10: { L: 0, P: 0 },
    s10x05: { L: 0, P: 0 },
    s05x05: { L: 0, P: 0 }
  }
};
