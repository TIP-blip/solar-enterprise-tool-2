import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Safe fallback for both development (tsx/ESM) and production (CJS bundle)
const __filename =
  typeof __filename !== "undefined"
    ? __filename
    : fileURLToPath(import.meta.url || `file://${process.cwd()}`);
const __dirname = path.dirname(__filename);

// Render dynamically assigns a port via process.env.PORT, fallback to 3000 locally
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DBData {
  clients: any[];
  quotes: any[];
  appliances: any[];
  inventory: any[];
  images: any[];
  documents: any[];
  telemetry: any[];
  knowledgeBase?: {
    updatedAt: string;
    sourceCount: number;
    sources: string[];
    summary: string;
  };
  draft?: any;
  settings: {
    nextClientSeq: number;
    nextQuoteSeq: number;
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
    dashboardBackgroundIds?: string[];
    dashboardBackgroundEnabled?: boolean;
  };
}

const defaultDB: DBData = {
  clients: [],
  quotes: [],
  appliances: [
    {
      id: "app-1",
      name: "LED Indoor/Outdoor Lighting (Set of 10)",
      category: "Lighting",
      watts: 90,
      qty: 1,
      hoursPerDay: 6,
      surgeMultiplier: 1.1,
      nightUsagePercent: 90,
      notes: "Energy efficient 9W warm/daylight LED bulbs",
    },
    {
      id: "app-2",
      name: "Inverter Refrigerator / Freezer",
      category: "Refrigeration",
      watts: 180,
      qty: 1,
      hoursPerDay: 12,
      surgeMultiplier: 2.5,
      nightUsagePercent: 50,
      notes: "Low inrush A++ smart inverter compressor",
    },
    {
      id: "app-3",
      name: 'Smart 55" 4K UHD Television',
      category: "Electronics",
      watts: 110,
      qty: 1,
      hoursPerDay: 5,
      surgeMultiplier: 1.2,
      nightUsagePercent: 80,
      notes: "Includes decoder and audio bar",
    },
    {
      id: "app-4",
      name: "Ceiling Fans (High Efficiency DC)",
      category: "HVAC & Cooling",
      watts: 35,
      qty: 3,
      hoursPerDay: 8,
      surgeMultiplier: 1.5,
      nightUsagePercent: 70,
      notes: "Brushless DC motor ceiling fans",
    },
    {
      id: "app-5",
      name: "Submersible Borehole / Well Water Pump (1 HP)",
      category: "Pumping & Water",
      watts: 750,
      qty: 1,
      hoursPerDay: 2,
      surgeMultiplier: 3.5,
      nightUsagePercent: 0,
      notes: "Daytime solar pumping directly to overhead storage",
    },
    {
      id: "app-6",
      name: "Split Air Conditioner Inverter (12,000 BTU / 1 Ton)",
      category: "HVAC & Cooling",
      watts: 1100,
      qty: 1,
      hoursPerDay: 5,
      surgeMultiplier: 2.2,
      nightUsagePercent: 40,
      notes: "Inverter model with soft starter",
    },
    {
      id: "app-7",
      name: "Laptops & Workstations (Office Setup)",
      category: "Computing & Office",
      watts: 85,
      qty: 2,
      hoursPerDay: 7,
      surgeMultiplier: 1.2,
      nightUsagePercent: 20,
      notes: "Office laptop workstations with external monitors",
    },
    {
      id: "app-8",
      name: "Wi-Fi Fiber Router & CCTV Surveillance Hub",
      category: "Computing & Office",
      watts: 45,
      qty: 1,
      hoursPerDay: 24,
      surgeMultiplier: 1.1,
      nightUsagePercent: 50,
      notes: "Critical 24/7 continuous base security load",
    },
    {
      id: "app-9",
      name: "Microwave Oven (800W Output)",
      category: "Kitchen & Cooking",
      watts: 1200,
      qty: 1,
      hoursPerDay: 0.5,
      surgeMultiplier: 1.8,
      nightUsagePercent: 40,
      notes: "Short duration intermittent kitchen load",
    },
    {
      id: "app-10",
      name: "Automatic Washing Machine",
      category: "Other",
      watts: 500,
      qty: 1,
      hoursPerDay: 1,
      surgeMultiplier: 2.5,
      nightUsagePercent: 10,
      notes: "Cold wash cycle to optimize solar power",
    },
    {
      id: "app-11",
      name: "Electric Water Booster Pump (0.5 HP)",
      category: "Pumping & Water",
      watts: 375,
      qty: 1,
      hoursPerDay: 1.5,
      surgeMultiplier: 3.0,
      nightUsagePercent: 25,
      notes: "Domestic pressure booster",
    },
    {
      id: "app-12",
      name: "Desktop Workstation & Server",
      category: "Computing & Office",
      watts: 250,
      qty: 1,
      hoursPerDay: 10,
      surgeMultiplier: 1.3,
      nightUsagePercent: 30,
      notes: "Local office database server",
    },
  ],
  inventory: [
    {
      id: "hw-inv-5kw",
      category: "Inverter & MPPT",
      code: "INV-HYB-5KW",
      name: "5kW 48V Pure Sine Wave Smart Hybrid Inverter Dual MPPT",
      rating: "5.0 kW / 48V DC",
      specification:
        "Pure Sine Wave, Dual MPPT (120V-450V), 80A Solar Charger, Wi-Fi Monitoring, Parallel Capable",
      unit: "set",
      unitPrice: 95000,
      inStock: true,
      warranty: "5 Years Manufacturer Warranty",
    },
    {
      id: "hw-inv-8kw",
      category: "Inverter & MPPT",
      code: "INV-HYB-8KW",
      name: "8kW 48V Heavy-Duty Pure Sine Smart Hybrid Inverter",
      rating: "8.0 kW / 48V DC",
      specification:
        "Dual MPPT (up to 500V DC input), 120A Solar Charger, BMS CAN/RS485 comms, Generator Auto-Start",
      unit: "set",
      unitPrice: 155000,
      inStock: true,
      warranty: "5 Years Manufacturer Warranty",
    },
    {
      id: "hw-inv-10kw-3p",
      category: "Inverter & MPPT",
      code: "INV-HYB-10KW-3P",
      name: "10kW Three-Phase 400V Commercial Hybrid Solar Inverter",
      rating: "10.0 kW / 400V 3-Phase",
      specification:
        "Three Phase 400V AC Output, Dual High-Voltage MPPT strings, Smart Zero-Export grid limiter",
      unit: "set",
      unitPrice: 220000,
      inStock: true,
      warranty: "5 Years Manufacturer Warranty",
    },
    {
      id: "hw-inv-3kw",
      category: "Inverter & MPPT",
      code: "INV-HYB-3KW",
      name: "3kW 24V Pure Sine Smart Hybrid Solar Inverter",
      rating: "3.0 kW / 24V DC",
      specification:
        "Single MPPT 60V-115V, 60A Solar Charger, Compact Wall Mount, LCD Display",
      unit: "set",
      unitPrice: 55000,
      inStock: true,
      warranty: "3 Years Warranty",
    },
    {
      id: "hw-bat-lead-200ah",
      category: "Battery Storage",
      code: "BAT-AGM-12V-200AH",
      name: "12V 200AH Maintenance free Lead acid batteries",
      rating: "12V 200Ah (2.4 kWh)",
      specification:
        "Deep Cycle Maintenance-Free Sealed AGM/Gel, Heavy Duty Lead Calcium Plates, Low Self Discharge",
      unit: "Nos",
      unitPrice: 28000,
      inStock: true,
      warranty: "2 Years Manufacturer Warranty",
    },
    {
      id: "hw-bat-lifepo4-5.12",
      category: "Battery Storage",
      code: "BAT-LIFEPO4-5.12",
      name: "5.12kWh 100Ah 51.2V LiFePO4 Smart Lithium Battery Module",
      rating: "51.2V 100Ah (5.12 kWh)",
      specification:
        "Grade-A Prismatic Cells, Integrated Smart BMS, CAN/RS485/Bluetooth, 6000 Cycles @ 80% DoD",
      unit: "units",
      unitPrice: 145000,
      inStock: true,
      warranty: "10 Years / 6,000 Cycles Warranty",
    },
    {
      id: "hw-bat-lifepo4-10.24",
      category: "Battery Storage",
      code: "BAT-LIFEPO4-10.24",
      name: "10.24kWh 200Ah 51.2V High-Capacity Lithium Battery Bank",
      rating: "51.2V 200Ah (10.24 kWh)",
      specification:
        "Floor/Rack Mount Cabinet, Dual Breaker Protection, Active Cell Balancing, LCD Screen",
      unit: "units",
      unitPrice: 280000,
      inStock: true,
      warranty: "10 Years Warranty",
    },
    {
      id: "hw-pv-550w",
      category: "Solar Panels",
      code: "PV-MONO-550",
      name: "550W Tier-1 High Efficiency Monocrystalline Half-Cell PV Module",
      rating: "550 Wp Tier-1",
      specification:
        "144 Monocrystalline Half-Cut Cells, 21.8% Module Efficiency, IP68 Junction Box, Anodized Silver/Black Frame",
      unit: "pcs",
      unitPrice: 14500,
      inStock: true,
      warranty: "25 Years Linear Guarantee",
    },
    {
      id: "hw-pv-600w-bifacial",
      category: "Solar Panels",
      code: "PV-TOPCON-600",
      name: "600W N-Type TOPCon Bifacial Dual-Glass Solar Module",
      rating: "600 Wp TOPCon Bifacial",
      specification:
        "Dual Glass 2.0mm+2.0mm, +30% Albedo Rear Harvest, Low PID degradation",
      unit: "pcs",
      unitPrice: 17500,
      inStock: true,
      warranty: "30 Years Linear Guarantee",
    },
    {
      id: "hw-mnt-rail",
      category: "Mounting Structures",
      code: "MNT-ALUM-RAIL",
      name: "Anodized Marine-Grade AL6005-T5 Aluminum Roof Rail Kit",
      rating: "Universal Roof Kit",
      specification:
        "High strength extruded aluminum rails, SUS304 stainless fasteners, adjustable L-feet for iron sheets",
      unit: "sets",
      unitPrice: 3500,
      inStock: true,
      warranty: "15 Years Warranty",
    },
    {
      id: "hw-dc-comb",
      category: "DC & AC Switchgear",
      code: "DC-COMB-2IN2OUT",
      name: "Weatherproof IP65 DC Array Combiner & Protection Enclosure",
      rating: "1000V DC IP65",
      specification:
        "Includes 1000V 32A DC Isolator Switch, 15A gPV 1000V DC Fuses, Type II 1000V DC SPD",
      unit: "set",
      unitPrice: 22000,
      inStock: true,
      warranty: "3 Years Warranty",
    },
    {
      id: "hw-ac-dist",
      category: "DC & AC Switchgear",
      code: "AC-DIST-ENCL",
      name: "AC Incomer Distribution & Protection Board with Manual Bypass Switch",
      rating: "63A 230V/400V",
      specification:
        "Double pole MCBs, 30mA Type B Earth Leakage RCD, 275V AC Class II SPD, 63A 3-position rotary Changeover",
      unit: "set",
      unitPrice: 24000,
      inStock: true,
      warranty: "3 Years Warranty",
    },
    {
      id: "hw-sw-ats",
      category: "DC & AC Switchgear",
      code: "SW-ATS-63A",
      name: "Automatic Transfer Switch (ATS) 63A Dual Power Changeover",
      rating: "63A Dual Source ATS",
      specification:
        "Sub-10ms transfer between Inverter/Solar and Utility Grid or Standby Diesel Generator",
      unit: "pcs",
      unitPrice: 18500,
      inStock: true,
      warranty: "2 Years Warranty",
    },
    {
      id: "hw-cab-dc",
      category: "Cabling & Consumables",
      code: "CAB-SOL-6MM",
      name: "TUV Certified Double-Insulated 6mm² Solar DC Cable (100m Drum)",
      rating: "6mm² 1500V DC",
      specification:
        "Tinned copper fine wire, XLPE crosslinked halogen-free insulation, UV & Weather proof",
      unit: "lot",
      unitPrice: 16500,
      inStock: true,
      warranty: "25 Years Lifespan",
    },
    {
      id: "hw-earth-kit",
      category: "Cabling & Consumables",
      code: "EARTH-KIT-PRO",
      name: "Substation Grade Copper-Bonded Grounding & Lightning Protection Kit",
      rating: "< 5 Ohms System",
      specification:
        '5/8" x 1.5m Pure Copper-clad earth rod, earth clamp, inspection test chamber, 16mm² copper conductor',
      unit: "set",
      unitPrice: 12000,
      inStock: true,
      warranty: "20 Years Durability",
    },
    {
      id: "hw-srv-inst",
      category: "Installation & Commissioning",
      code: "SRV-INST-COMM",
      name: "Installation and commissioning",
      rating: "Turnkey Solar Engineering",
      specification:
        "Turnkey mechanical mounting, electrical wiring, system commissioning, earth test & client handover",
      unit: "Lot",
      unitPrice: 45000,
      inStock: true,
      warranty: "1 Year Workmanship Guarantee",
    },
  ],
  documents: [],
  telemetry: [],
  images: [
    {
      id: "img-sch-1",
      title: "Hybrid Solar Inverter & Storage Topology Single-Line Diagram",
      category: "Single Line Diagram",
      imageUrl:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500"><rect width="800" height="500" fill="%230f172a"/><rect x="40" y="40" width="720" height="420" rx="12" fill="%231e293b" stroke="%23009e49" stroke-width="2"/><text x="400" y="80" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="20" fill="%23ffffff">ONE INVERTER - SYSTEM ELECTRICAL SCHEMATIC (SLD)</text><text x="400" y="105" text-anchor="middle" font-family="monospace" font-size="12" fill="%23009e49">STANDARD HYBRID ARCHITECTURE WITH ESSENTIAL LOAD SUB-PANEL</text><rect x="70" y="150" width="130" height="200" rx="8" fill="%230f172a" stroke="%23009e49" stroke-width="1.5"/><text x="135" y="180" text-anchor="middle" font-weight="bold" font-size="13" fill="%23ffffff">SOLAR PV ARRAY</text><text x="135" y="200" text-anchor="middle" font-size="11" fill="%2394a3b8">Tier-1 Mono Half-Cell</text><text x="135" y="220" text-anchor="middle" font-size="11" fill="%23009e49">Voc: 450V DC</text><rect x="90" y="240" width="90" height="80" rx="4" fill="%231e293b" stroke="%23334155"/><line x1="90" y1="280" x2="180" y2="280" stroke="%23334155"/><line x1="135" y1="240" x2="135" y2="320" stroke="%23334155"/><path d="M200 250 L 320 250" stroke="%23009e49" stroke-width="3" stroke-dasharray="6,3"/><rect x="320" y="150" width="180" height="220" rx="10" fill="%23042713" stroke="%23009e49" stroke-width="2"/><text x="410" y="185" text-anchor="middle" font-weight="900" font-size="15" fill="%23ffffff">HYBRID INVERTER</text><text x="410" y="205" text-anchor="middle" font-size="11" fill="%23009e49">Pure Sine • Dual MPPT</text><rect x="345" y="220" width="130" height="60" rx="6" fill="%230f172a" stroke="%23009e49"/><text x="410" y="255" text-anchor="middle" font-family="monospace" font-size="13" font-weight="bold" fill="%23ffffff">5.0 kW / 48V</text><text x="410" y="320" text-anchor="middle" font-size="11" fill="%2394a3b8">BMS Comms: CAN/RS485</text><text x="410" y="340" text-anchor="middle" font-size="11" fill="%2394a3b8">Eff: 98% Peak</text><path d="M410 370 L 410 430 L 135 430 L 135 390" stroke="%23009e49" stroke-width="2"/><rect x="70" y="360" width="130" height="60" rx="6" fill="%230f172a" stroke="%23009e49" stroke-width="1.5"/><text x="135" y="385" text-anchor="middle" font-weight="bold" font-size="11" fill="%23ffffff">DC ISOLATOR %26 SPD</text><text x="135" y="405" text-anchor="middle" font-size="10" fill="%23009e49">1000V 32A / 15A Fuses</text><path d="M500 220 L 600 220" stroke="%2322c55e" stroke-width="3"/><rect x="600" y="150" width="140" height="110" rx="8" fill="%230f172a" stroke="%2322c55e" stroke-width="1.5"/><text x="670" y="180" text-anchor="middle" font-weight="bold" font-size="12" fill="%23ffffff">AC DISTRIBUTION</text><text x="670" y="200" text-anchor="middle" font-size="11" fill="%2322c55e">Manual Bypass 63A</text><text x="670" y="220" text-anchor="middle" font-size="11" fill="%2394a3b8">30mA Type B RCD</text><text x="670" y="240" text-anchor="middle" font-size="10" fill="%2394a3b8">Essential Loads</text><path d="M500 300 L 600 300" stroke="%23009e49" stroke-width="3"/><rect x="600" y="280" width="140" height="110" rx="8" fill="%230f172a" stroke="%23009e49" stroke-width="1.5"/><text x="670" y="310" text-anchor="middle" font-weight="bold" font-size="12" fill="%23ffffff">BATTERY BANK</text><text x="670" y="330" text-anchor="middle" font-size="11" fill="%23009e49">LiFePO4 / Lead Acid</text><text x="670" y="350" text-anchor="middle" font-size="11" fill="%2394a3b8">48V DC 100Ah-200Ah</text><text x="670" y="370" text-anchor="middle" font-size="10" fill="%2394a3b8">80% DoD Autonomy</text></svg>',
      caption:
        "Official single-line technical electrical schematics depicting DC array inputs, dual MPPT hybrid inverter, AC manual bypass changeover, and battery bank integration.",
      uploadedAt: "2026-09-18T10:00:00Z",
    },
    {
      id: "img-sch-2",
      title: "Roof Solar PV Array Stringing & Clamping Layout Plan",
      category: "Roof Panel Layout",
      imageUrl:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500"><rect width="800" height="500" fill="%230f172a"/><rect x="40" y="40" width="720" height="420" rx="12" fill="%231e293b" stroke="%23009e49" stroke-width="2"/><text x="400" y="80" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="20" fill="%23ffffff">ROOF SOLAR PV STRINGING %26 STRUCTURAL ORIENTATION</text><text x="400" y="105" text-anchor="middle" font-family="monospace" font-size="12" fill="%23009e49">OPTIMAL EQUATORIAL AZIMUTH: DUE NORTH 12-15° TILT</text><rect x="80" y="140" width="640" height="280" rx="8" fill="%23042713" stroke="%23009e49" stroke-width="1.5"/><g fill="%231e293b" stroke="%23009e49" stroke-width="1.5"><rect x="110" y="160" width="80" height="110" rx="4"/><rect x="200" y="160" width="80" height="110" rx="4"/><rect x="290" y="160" width="80" height="110" rx="4"/><rect x="380" y="160" width="80" height="110" rx="4"/><rect x="470" y="160" width="80" height="110" rx="4"/><rect x="560" y="160" width="80" height="110" rx="4"/><rect x="110" y="290" width="80" height="110" rx="4"/><rect x="200" y="290" width="80" height="110" rx="4"/><rect x="290" y="290" width="80" height="110" rx="4"/><rect x="380" y="290" width="80" height="110" rx="4"/><rect x="470" y="290" width="80" height="110" rx="4"/><rect x="560" y="290" width="80" height="110" rx="4"/></g><text x="400" y="445" text-anchor="middle" font-weight="bold" font-size="13" fill="%23ffffff">STRING 1 (6 x 550W Modules) + STRING 2 (6 x 550W Modules) = 6.6 kWp Total</text></svg>',
      caption:
        "Engineering structural layout diagram for solar panel mounting, rail spans, wind-loading tolerance, and string series connections.",
      uploadedAt: "2026-09-18T10:15:00Z",
    },
    {
      id: "img-sch-3",
      title: "Inverter & LiFePO4 / Lead Acid Battery Rack Wall Installation",
      category: "Inverter Installation",
      imageUrl:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500"><rect width="800" height="500" fill="%230f172a"/><rect x="40" y="40" width="720" height="420" rx="12" fill="%231e293b" stroke="%23009e49" stroke-width="2"/><text x="400" y="80" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="20" fill="%23ffffff">POWER ROOM WALL INSTALLATION ELEVATION</text><text x="400" y="105" text-anchor="middle" font-family="monospace" font-size="12" fill="%23009e49">PROPER AIRFLOW CLEARANCE: 50CM TOP/BOTTOM, 20CM SIDES</text><rect x="150" y="140" width="220" height="280" rx="8" fill="%23042713" stroke="%23009e49" stroke-width="2"/><circle cx="260" cy="220" r="45" fill="%230f172a" stroke="%23009e49" stroke-width="2"/><text x="260" y="225" text-anchor="middle" font-family="sans-serif" font-weight="black" font-size="14" fill="%23009e49">INVERTER</text><text x="260" y="320" text-anchor="middle" font-weight="bold" font-size="14" fill="%23ffffff">ONE INVERTER</text><text x="260" y="340" text-anchor="middle" font-size="12" fill="%2394a3b8">Pure Sine Hybrid 5kW-10kW</text><rect x="430" y="140" width="220" height="280" rx="8" fill="%230f172a" stroke="%23009e49" stroke-width="2"/><rect x="450" y="160" width="180" height="60" rx="4" fill="%231e293b" stroke="%23334155"/><text x="540" y="195" text-anchor="middle" font-size="12" fill="%23ffffff">MODULE 1 (5.12 kWh / 200Ah)</text><rect x="450" y="235" width="180" height="60" rx="4" fill="%231e293b" stroke="%23334155"/><text x="540" y="270" text-anchor="middle" font-size="12" fill="%23ffffff">MODULE 2 (5.12 kWh / 200Ah)</text><rect x="450" y="310" width="180" height="60" rx="4" fill="%231e293b" stroke="%23334155"/><text x="540" y="345" text-anchor="middle" font-size="12" fill="%23ffffff">BATTERY DC COMBINER BREAKER</text></svg>',
      caption:
        "Plant room mechanical layout specifying wall mounting clearances, DC cable runs, battery rack grounding, and ventilation paths.",
      uploadedAt: "2026-09-18T10:30:00Z",
    },
  ],
  settings: {
    nextClientSeq: 101,
    nextQuoteSeq: 7337,
    companyName: "one inverter",
    tagline: "Your Gateway To Reliable Power",
    companyAddress: "Mombasa Road, Vision Plaza, First Floor, Office No. 47",
    pobox: "P.O. Box 78788-00507, Nairobi-Kenya",
    companyPhone: "020-3500652",
    companyMobile: "0795855754, 0780390004/7",
    companyEmail: "info@oneinverter.com",
    companyWebsite: "www.oneinverter.com",
    currencySymbol: "KSh ",
    defaultVatRate: 16,
    dashboardBackgroundIds: [],
    dashboardBackgroundEnabled: true,
  },
};

function readDB(): DBData {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(content);
      return {
        ...defaultDB,
        ...parsed,
        appliances:
          parsed.appliances && parsed.appliances.length > 0
            ? parsed.appliances
            : defaultDB.appliances,
        inventory:
          parsed.inventory && parsed.inventory.length > 0
            ? parsed.inventory
            : defaultDB.inventory,
        images:
          parsed.images && parsed.images.length > 0
            ? parsed.images
            : defaultDB.images,
        documents: parsed.documents || [],
        telemetry: parsed.telemetry || [],
        knowledgeBase: parsed.knowledgeBase || defaultDB.knowledgeBase,
        settings: { ...defaultDB.settings, ...(parsed.settings || {}) },
      };
    }
  } catch (err) {
    console.error("Error reading db.json, using defaults:", err);
  }
  return defaultDB;
}

function writeDB(data: DBData) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing to db.json:", err);
  }
}

function formatRef(prefix: string, seq: number): string {
  const year = new Date().getFullYear();
  const padded = String(seq).padStart(5, "0");
  if (prefix === "PI") {
    return `PI${padded}`;
  }
  return `${prefix}-${year}-${padded}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "25mb" }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.get("/api/references/next", (req, res) => {
    const db = readDB();
    const nextClientRef = formatRef("CL", db.settings.nextClientSeq || 101);
    const nextQuoteRef = formatRef("PI", db.settings.nextQuoteSeq || 7337);
    res.json({
      nextClientRef,
      nextQuoteRef,
      nextClientSeq: db.settings.nextClientSeq,
      nextQuoteSeq: db.settings.nextQuoteSeq,
      settings: db.settings,
    });
  });

  app.get("/api/clients", (req, res) => {
    const db = readDB();
    res.json(db.clients);
  });

  app.post("/api/clients", (req, res) => {
    const db = readDB();
    const clientData = req.body;
    const refNumber =
      clientData.refNumber || formatRef("CL", db.settings.nextClientSeq++);

    const newClient = {
      id:
        clientData.id ||
        `cl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      refNumber,
      name: clientData.name || "Unnamed Client",
      contactPerson: clientData.contactPerson || "",
      phone: clientData.phone || "",
      email: clientData.email || "",
      address: clientData.address || "",
      propertyType: clientData.propertyType || "Residential",
      gridType: clientData.gridType || "Hybrid with Battery",
      phaseType: clientData.phaseType || "Single Phase (230V)",
      notes: clientData.notes || "",
      createdAt: new Date().toISOString(),
    };

    db.clients.unshift(newClient);
    writeDB(db);
    res.json(newClient);
  });

  app.get("/api/quotes", (req, res) => {
    const db = readDB();
    res.json(db.quotes);
  });

  app.get("/api/quotes/:id", (req, res) => {
    const db = readDB();
    const quote = db.quotes.find(
      (q: any) => q.id === req.params.id || q.quoteNumber === req.params.id,
    );
    if (!quote) {
      return res.status(404).json({ error: "Quotation not found" });
    }
    res.json(quote);
  });

  app.post("/api/quotes", (req, res) => {
    const db = readDB();
    const payload = req.body;

    const quoteNumber =
      payload.quoteNumber || formatRef("QT", db.settings.nextQuoteSeq);
    const clientRef =
      payload.clientRef || formatRef("CL", db.settings.nextClientSeq);

    if (
      !payload.quoteNumber ||
      payload.quoteNumber === formatRef("PI", db.settings.nextQuoteSeq)
    ) {
      db.settings.nextQuoteSeq++;
    }
    if (
      !payload.clientRef ||
      payload.clientRef === formatRef("CL", db.settings.nextClientSeq)
    ) {
      db.settings.nextClientSeq++;
    }

    if (payload.client && payload.client.name) {
      const existingClientIndex = db.clients.findIndex(
        (c: any) => c.refNumber === clientRef,
      );
      const clientRecord = {
        id: payload.client.id || `cl_${Date.now()}`,
        refNumber: clientRef,
        name: payload.client.name,
        contactPerson: payload.client.contactPerson || "",
        phone: payload.client.phone || "",
        email: payload.client.email || "",
        address: payload.client.address || "",
        propertyType: payload.client.propertyType || "Residential",
        gridType: payload.client.gridType || "Hybrid with Battery",
        phaseType: payload.client.phaseType || "Single Phase (230V)",
        notes: payload.client.notes || "",
        createdAt: payload.client.createdAt || new Date().toISOString(),
        lastQuoteNumber: quoteNumber,
      };

      if (existingClientIndex >= 0) {
        db.clients[existingClientIndex] = {
          ...db.clients[existingClientIndex],
          ...clientRecord,
        };
      } else {
        db.clients.unshift(clientRecord);
      }
    }

    const newQuote = {
      id:
        payload.id ||
        `qt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      quoteNumber,
      clientRef,
      client: payload.client || {},
      date: payload.date || new Date().toISOString().split("T")[0],
      validUntil:
        payload.validUntil ||
        new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      status: payload.status || "Issued",
      currency: payload.currency || db.settings.currencySymbol || "KSh ",

      sizing: payload.sizing || {
        totalDailyKwh: 0,
        peakWatts: 0,
        continuousWatts: 0,
        recommendedInverterKw: 0,
        recommendedPvArrayKwp: 0,
        recommendedBatteryKwh: 0,
        sunHours: 5,
        systemVoltage: 48,
      },

      appliances: payload.appliances || [],
      boq: payload.boq || [],

      financials: payload.financials || {
        subtotal: 0,
        discount: 0,
        vatRate: 16,
        vatAmount: 0,
        grandTotal: 0,
      },

      attachedImages: payload.attachedImages || [],
      sourceDocuments: payload.sourceDocuments || [],

      commercialTerms: payload.commercialTerms || {
        paymentTerms:
          "70% Advance with Purchase Order, 20% on Delivery of Equipment, 10% on Testing & Handover",
        warrantyInverter: "5 Years Manufacturer Warranty",
        warrantyPanels:
          "25 Years Linear Performance Warranty (10 Years Product Warranty)",
        warrantyBattery: "10 Years / 6,000 Cycles Warranty (80% DOD)",
        installationPeriod: "3 - 7 Working Days from site handover",
      },

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.quotes.unshift(newQuote);
    writeDB(db);

    res.status(201).json(newQuote);
  });

  app.delete("/api/quotes/:id", (req, res) => {
    const db = readDB();
    const initialLen = db.quotes.length;
    db.quotes = db.quotes.filter(
      (q: any) => q.id !== req.params.id && q.quoteNumber !== req.params.id,
    );
    if (db.quotes.length === initialLen) {
      return res.status(404).json({ error: "Quotation not found" });
    }
    writeDB(db);
    res.json({ success: true, message: "Quotation deleted successfully" });
  });

  app.post("/api/settings", (req, res) => {
    const db = readDB();
    db.settings = { ...db.settings, ...req.body };
    writeDB(db);
    res.json(db.settings);
  });

  app.get("/api/documents", (req, res) => {
    const db = readDB();
    res.json(db.documents || []);
  });

  app.post("/api/documents", (req, res) => {
    const db = readDB();
    const doc = {
      ...req.body,
      id: req.body.id || `doc-${Date.now()}`,
      uploadedAt: req.body.uploadedAt || new Date().toISOString(),
    };
    const idx = db.documents.findIndex((d: any) => d.id === doc.id);
    if (idx >= 0) db.documents[idx] = doc;
    else db.documents.unshift(doc);
    writeDB(db);
    res.json(doc);
  });

  app.delete("/api/documents/:id", (req, res) => {
    const db = readDB();
    const before = db.documents.length;
    db.documents = db.documents.filter((d: any) => d.id !== req.params.id);
    if (before === db.documents.length)
      return res.status(404).json({ error: "Document not found" });
    writeDB(db);
    res.json({ success: true });
  });

  // Vite middleware for development, static file serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "../dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ONE INVERTER Solar ERP Server running on port ${PORT}`);
  });
}

startServer();
