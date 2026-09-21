export interface Client {
  id?: string;
  refNumber: string; // CL-YYYY-#####
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  region?: string;
  propertyType: string; // Residential, Commercial, Industrial, Agricultural, etc.
  gridType: string; // Hybrid with Battery, Off-Grid Standalone, Grid-Tied
  phaseType: string; // Single Phase 230V, Three Phase 400V
  notes: string;
  createdAt?: string;
}

export interface Appliance {
  id: string;
  name: string;
  category: 'Lighting' | 'Refrigeration' | 'HVAC & Cooling' | 'Pumping & Water' | 'Computing & Office' | 'Electronics' | 'Kitchen & Cooking' | 'Heavy Machinery' | 'Other';
  watts: number;
  qty: number;
  hoursPerDay: number;
  usagePercent?: number; // 0-100%, defaults to 100%
  surgeMultiplier: number;
  nightUsagePercent: number; // 0-100%
  notes?: string;
  imageUrls?: string[];
  documentIds?: string[];
}

export interface SizingResult {
  totalDailyKwh: number;
  dayKwh: number;
  nightKwh: number;
  peakWatts: number;
  continuousWatts: number;
  surgeWatts: number;
  sunHours: number; // e.g. 5.0
  systemVoltage: number; // 24 or 48V
  systemEfficiency: number; // e.g. 0.80
  dod: number; // 0.80 for LiFePO4
  recommendedInverterKw: number;
  recommendedPvArrayKwp: number;
  panelCount: number;
  panelWattage: number;
  recommendedBatteryKwh: number;
  recommendedBatteryAh: number;
  connectedLoadWatts?: number;
  designPeakWatts?: number;
  largestSurgeWatts?: number;
  coincidenceFactor?: number;
  pvDerate?: number;
  recommendedChargeControllerA?: number;
  batteryAutonomyDays?: number;
}

export interface BOQItem {
  id: string;
  category: 'Solar Panels' | 'Inverter & MPPT' | 'Battery Storage' | 'Mounting Structures' | 'DC & AC Switchgear' | 'Cabling & Consumables' | 'Installation & Commissioning' | 'Accessories';
  code: string;
  description: string;
  specification: string;
  qty: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface Financials {
  subtotal: number;
  discount: number;
  vatRate: number; // e.g. 16%
  vatAmount: number;
  grandTotal: number;
}

export interface CommercialTerms {
  paymentTerms: string;
  warrantyInverter: string;
  warrantyPanels: string;
  warrantyBattery: string;
  installationPeriod: string;
  validityDays: number;
}

export interface Quotation {
  id: string;
  quoteNumber: string; // PI07337 / QT-YYYY-#####
  clientRef: string; // CL-YYYY-#####
  client: Client;
  date: string;
  validUntil: string;
  status: 'Draft' | 'Issued' | 'Approved' | 'Commissioned';
  currency: string;
  sizing: SizingResult;
  appliances: Appliance[];
  boq: BOQItem[];
  financials: Financials;
  commercialTerms: CommercialTerms;
  attachedImages?: string[]; // IDs or URLs of attached product photos and technical schematics
  sourceDocuments?: string[]; // Source PDF/document names used for this quotation/database record
  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  companyName: string;
  tagline?: string;
  companyPhone: string;
  companyMobile?: string;
  companyEmail: string;
  companyWebsite?: string;
  companyAddress: string;
  pobox?: string;
  currencySymbol: string;
  defaultVatRate: number;
  nextClientSeq: number;
  nextQuoteSeq: number;
  dashboardBackgroundIds?: string[];
  dashboardBackgroundEnabled?: boolean;
}

export interface HardwareItem {
  id: string;
  category: 'Inverter & MPPT' | 'Solar Panels' | 'Battery Storage' | 'Mounting Structures' | 'DC & AC Switchgear' | 'Cabling & Consumables' | 'Installation & Commissioning' | 'Accessories';
  code: string;
  name: string;
  rating: string;
  specification: string;
  unit: string; // pcs, set, units, lot, Nos
  unitPrice: number;
  inStock?: boolean;
  warranty?: string;
  imageUrl?: string;
  imageUrls?: string[];
  documentIds?: string[];
}

export interface DatabaseDocument {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  size: number;
  category: 'Product Datasheet' | 'Technical Manual' | 'Quotation Source' | 'BOQ / Price List' | 'Catalogue' | 'Excel / Spreadsheet' | 'Other';
  linkedItemId?: string;
  linkedItemType?: 'appliance' | 'hardware' | 'gallery';
  uploadedAt: string;
}

export interface InverterTelemetry {
  id: string;
  clientRef: string;
  clientName: string;
  inverterModel: string;
  serialNumber?: string;
  site?: string;
  timestamp: string;
  pvPowerKw: number;
  loadPowerKw: number;
  batteryPowerKw: number;
  batterySoc: number;
  gridPowerKw: number;
  dailyEnergyKwh: number;
  totalEnergyKwh: number;
  status: 'Online' | 'Offline' | 'Warning';
}

export interface GalleryImage {
  id: string;
  title: string;
  category: 'System Schematic' | 'Single Line Diagram' | 'Roof Panel Layout' | 'Inverter Installation' | 'Battery Bank' | 'Site Photo';
  imageUrl: string;
  caption?: string;
  tags?: string[];
  uploadedAt: string;
}

export interface DatabaseBundle {
  appliances: Appliance[];
  inventory: HardwareItem[];
  quotes: Quotation[];
  clients: Client[];
  images: GalleryImage[];
  documents: DatabaseDocument[];
  telemetry: InverterTelemetry[];
  knowledgeBase?: { updatedAt: string; sourceCount: number; sources: string[]; summary: string };
  settings: CompanySettings;
}

