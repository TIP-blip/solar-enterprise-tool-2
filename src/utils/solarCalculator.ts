import { Appliance, HardwareItem, SizingResult, BOQItem } from '../types';

const STANDARD_INVERTER_KW = [1, 1.5, 2, 2.5, 3, 3.5, 5, 6, 8, 10, 12, 15, 20, 30, 50];

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

function standardInverterSize(rawKw: number) {
  return STANDARD_INVERTER_KW.find((size) => size >= rawKw) ?? Math.ceil(rawKw * 2) / 2;
}

/**
 * Transparent load-based solar sizing.
 *
 * Energy: sum(W × qty × hours × utilisation) / 1000.
 * Design peak: connected load × user-selected coincidence factor.
 * Surge: maximum individual appliance running load × its surge multiplier.
 * Inverter: max(design peak × 1.25, largest appliance surge) rounded up.
 * PV: daily energy / (peak-sun-hours × PV derate).
 * Battery: night energy × autonomy days / DoD.
 *
 * The calculator deliberately exposes the assumptions instead of silently
 * inventing a fixed "55% of daily load" battery rule or an arbitrary diversity
 * factor based on the number of appliances.
 */
export function calculateSizing(
  appliances: Appliance[],
  sunHours = 5.0,
  systemVoltage = 48,
  panelWattage = 550,
  dod = 0.80,
  pvDerate = 0.80,
  coincidenceFactor = 0.80,
  batteryAutonomyDays = 1.0,
): SizingResult {
  if (!appliances?.length) {
    return {
      totalDailyKwh: 0, dayKwh: 0, nightKwh: 0, peakWatts: 0, continuousWatts: 0,
      surgeWatts: 0, sunHours, systemVoltage, systemEfficiency: pvDerate, dod,
      recommendedInverterKw: 0, recommendedPvArrayKwp: 0, panelCount: 0,
      panelWattage, recommendedBatteryKwh: 0, recommendedBatteryAh: 0,
      connectedLoadWatts: 0, designPeakWatts: 0, largestSurgeWatts: 0,
      coincidenceFactor, pvDerate, recommendedChargeControllerA: 0, batteryAutonomyDays,
    };
  }

  let totalDailyWh = 0;
  let nightWh = 0;
  let connectedWatts = 0;
  let largestSurgeWatts = 0;

  for (const item of appliances) {
    const watts = Math.max(0, Number(item.watts) || 0);
    const qty = Math.max(1, Number(item.qty) || 1);
    const hours = Math.max(0, Math.min(24, Number(item.hoursPerDay) || 0));
    const utilisation = Math.max(0, Math.min(100, Number(item.usagePercent ?? 100))) / 100;
    const nightShare = Math.max(0, Math.min(100, Number(item.nightUsagePercent ?? 0))) / 100;
    const runningWatts = watts * qty;
    const dailyWh = runningWatts * hours * utilisation;
    const surge = runningWatts * Math.max(1, Number(item.surgeMultiplier) || 1);

    connectedWatts += runningWatts;
    totalDailyWh += dailyWh;
    nightWh += dailyWh * nightShare;
    largestSurgeWatts = Math.max(largestSurgeWatts, surge);
  }

  const totalDailyKwh = round(totalDailyWh / 1000);
  const nightKwh = round(nightWh / 1000);
  const dayKwh = round(Math.max(0, totalDailyKwh - nightKwh));

  const safeCoincidence = Math.max(0.5, Math.min(1, coincidenceFactor));
  const designPeakWatts = Math.round(connectedWatts * safeCoincidence);
  const inverterDesignWatts = Math.max(designPeakWatts * 1.25, largestSurgeWatts);
  const recommendedInverterKw = standardInverterSize(inverterDesignWatts / 1000);
  const surgeWatts = Math.round(largestSurgeWatts);

  const safeSunHours = Math.max(1, Number(sunHours) || 5);
  const safePvDerate = Math.max(0.55, Math.min(0.95, Number(pvDerate) || 0.80));
  const rawPvKwp = totalDailyKwh / (safeSunHours * safePvDerate);
  const recommendedPvArrayKwp = round(Math.max(0.1, rawPvKwp));
  const panelCount = Math.max(1, Math.ceil((recommendedPvArrayKwp * 1000) / Math.max(1, panelWattage)));
  const finalPvArrayKwp = round((panelCount * panelWattage) / 1000);

  const safeDod = Math.max(0.5, Math.min(0.95, Number(dod) || 0.80));
  const safeAutonomy = Math.max(0.5, Math.min(3, Number(batteryAutonomyDays) || 1));
  const recommendedBatteryKwh = round((nightKwh * safeAutonomy) / safeDod);
  const recommendedBatteryAh = Math.round((recommendedBatteryKwh * 1000) / Math.max(12, systemVoltage));
  const recommendedChargeControllerA = Math.ceil(((panelCount * panelWattage) / Math.max(12, systemVoltage)) * 1.25 / 5) * 5;

  return {
    totalDailyKwh,
    dayKwh,
    nightKwh,
    peakWatts: designPeakWatts,
    continuousWatts: connectedWatts,
    surgeWatts,
    sunHours: safeSunHours,
    systemVoltage,
    systemEfficiency: safePvDerate,
    dod: safeDod,
    recommendedInverterKw,
    recommendedPvArrayKwp: finalPvArrayKwp,
    panelCount,
    panelWattage,
    recommendedBatteryKwh,
    recommendedBatteryAh,
    connectedLoadWatts: connectedWatts,
    designPeakWatts,
    largestSurgeWatts: surgeWatts,
    coincidenceFactor: safeCoincidence,
    pvDerate: safePvDerate,
    recommendedChargeControllerA,
    batteryAutonomyDays: safeAutonomy,
  };
}

function parseKw(rating = '') {
  const match = rating.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(?:kW|KW|kVA|KVA)/);
  return match ? Number(match[1]) : 0;
}
function parseVoltage(rating = '') {
  const match = rating.match(/(\d+(?:\.\d+)?)\s*V\s*(?:DC)?/i);
  return match ? Number(match[1]) : 0;
}
function parseCapacityKwh(rating = '', specification = '') {
  const text = `${rating} ${specification}`;
  const kwh = text.match(/(\d+(?:\.\d+)?)\s*kWh/i);
  if (kwh) return Number(kwh[1]);
  const ah = text.match(/(\d+(?:\.\d+)?)\s*Ah/i);
  const v = parseVoltage(text);
  if (ah && v) return (Number(ah[1]) * v) / 1000;
  return 0;
}
function productPriority(item: HardwareItem) {
  // ONE INVERTER catalogue products are preferred whenever they are technically suitable.
  const oneInverter = /one\s*inverter/i.test(`${item.name} ${item.code} ${item.specification}`) ? 1000000 : 0;
  const stock = item.inStock === false ? -100000 : 10000;
  return oneInverter + stock;
}

function pickHardware(inventory: HardwareItem[], category: HardwareItem['category'], predicate?: (item: HardwareItem) => boolean) {
  const candidates = inventory
    .filter((item) => item.category === category && (!predicate || predicate(item)))
    .sort((a, b) => productPriority(b) - productPriority(a));
  return candidates[0];
}

function pickHighestWattagePanel(inventory: HardwareItem[], preferredWattage: number) {
  const panels = inventory
    .filter((item) => item.category === 'Solar Panels')
    .map(item => ({ item, watts: Number((item.rating || '').match(/(\d+(?:\.\d+)?)\s*W/i)?.[1] || 0) }))
    .filter(x => x.watts > 0)
    .sort((a, b) => (b.watts - a.watts) || (productPriority(b.item) - productPriority(a.item)));
  // Explicitly favour the largest panel in the master database. If two have the same wattage,
  // the ONE INVERTER product wins.
  return panels[0]?.item || inventory.find(x => x.category === 'Solar Panels');
}

export function assessHardwareSuitability(item: HardwareItem, sizing: SizingResult): { suitable: boolean; reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];
  if (item.category === 'Solar Panels') {
    const w = Number((item.rating || '').match(/(\d+(?:\.\d+)?)\s*W/i)?.[1] || 0);
    if (w >= sizing.panelWattage) reasons.push(`${w}W module meets/exceeds the requested panel size.`);
    else warnings.push(`${w}W is below the current ${sizing.panelWattage}W design module size.`);
  }
  if (item.category === 'Inverter & MPPT') {
    const kw = parseKw(item.rating); const v = parseVoltage(item.rating);
    if (kw >= sizing.recommendedInverterKw) reasons.push(`${kw || 'Unrated'}kW rating meets the ${sizing.recommendedInverterKw}kW minimum.`);
    else warnings.push(`Inverter rating is below the ${sizing.recommendedInverterKw}kW calculated requirement.`);
    if (v && v !== sizing.systemVoltage) warnings.push(`DC bus is ${v}V while the design is ${sizing.systemVoltage}V.`);
  }
  if (item.category === 'Battery Storage') {
    const kwh = parseCapacityKwh(item.rating, item.specification); const v = parseVoltage(`${item.rating} ${item.specification}`);
    if (kwh >= sizing.recommendedBatteryKwh) reasons.push(`${kwh.toFixed(2)}kWh unit meets the calculated nominal storage requirement.`);
    else warnings.push(`${kwh.toFixed(2)}kWh per unit requires multiple units to reach ${sizing.recommendedBatteryKwh.toFixed(2)}kWh.`);
    if (v && v !== sizing.systemVoltage) warnings.push(`Battery voltage is ${v}V while the design is ${sizing.systemVoltage}V.`);
  }
  return { suitable: warnings.length === 0, reasons, warnings };
}

function makeItem(base: HardwareItem | undefined, fallback: Omit<BOQItem, 'id' | 'qty' | 'unitPrice' | 'totalPrice'>, qty: number): BOQItem {
  const unitPrice = Number(base?.unitPrice ?? 0);
  return {
    id: `boq-${fallback.code.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    ...fallback,
    description: base?.name || fallback.description,
    specification: base?.specification || fallback.specification,
    code: base?.code || fallback.code,
    unit: base?.unit || fallback.unit,
    qty,
    unitPrice,
    totalPrice: round(unitPrice * qty),
  };
}

/** Build the BOQ from the live master inventory rather than hard-coded dollar prices. */
export function generateRecommendedBOQ(
  sizing: SizingResult,
  inventory: HardwareItem[] = [],
  currency = 'KSh ',
): BOQItem[] {
  if (!sizing || sizing.totalDailyKwh <= 0) return [];

  const panel = pickHighestWattagePanel(inventory, sizing.panelWattage);
  const selectedPanelWattage = Number((panel?.rating || '').match(/(\d+(?:\.\d+)?)\s*W/i)?.[1] || sizing.panelWattage);
  const targetPvKwp = sizing.totalDailyKwh > 0 ? sizing.totalDailyKwh / (Math.max(1, sizing.sunHours) * Math.max(0.55, sizing.pvDerate || 0.80)) : sizing.recommendedPvArrayKwp;
  const selectedPanelCount = Math.max(1, Math.ceil((targetPvKwp * 1000) / Math.max(1, selectedPanelWattage)));

  const inverter = pickHardware(inventory, 'Inverter & MPPT', (item) => {
    const kw = parseKw(item.rating);
    const volts = parseVoltage(item.rating);
    return kw >= sizing.recommendedInverterKw && (!volts || volts === sizing.systemVoltage);
  }) || pickHardware(inventory, 'Inverter & MPPT', (item) => !parseVoltage(item.rating) || parseVoltage(item.rating) === sizing.systemVoltage);

  const battery = pickHardware(inventory, 'Battery Storage', (item) => {
    const capacity = parseCapacityKwh(item.rating, item.specification);
    const volts = parseVoltage(item.rating);
    return capacity > 0 && capacity >= sizing.recommendedBatteryKwh && (!volts || volts === sizing.systemVoltage);
  }) || pickHardware(inventory, 'Battery Storage', (item) => !parseVoltage(item.rating) || parseVoltage(item.rating) === sizing.systemVoltage);

  const mounting = pickHardware(inventory, 'Mounting Structures');
  const dcProtection = pickHardware(inventory, 'DC & AC Switchgear', (item) => /DC|combiner|isolator|SPD/i.test(`${item.name} ${item.specification}`));
  const acProtection = pickHardware(inventory, 'DC & AC Switchgear', (item) => /AC|changeover|bypass|RCD/i.test(`${item.name} ${item.specification}`) && item.id !== dcProtection?.id);
  const cable = pickHardware(inventory, 'Cabling & Consumables', (item) => /cable/i.test(`${item.name} ${item.specification}`));
  const earth = pickHardware(inventory, 'Cabling & Consumables', (item) => /earth|ground/i.test(`${item.name} ${item.specification}`) && item.id !== cable?.id);
  const install = pickHardware(inventory, 'Installation & Commissioning');

  const batteryUnitKwh = battery ? parseCapacityKwh(battery.rating, battery.specification) : 0;
  const batteryQty = batteryUnitKwh > 0 ? Math.max(1, Math.ceil(sizing.recommendedBatteryKwh / batteryUnitKwh)) : 1;

  const items: BOQItem[] = [
    makeItem(panel, {
      category: 'Solar Panels', code: 'PV-MODULE', description: `${selectedPanelWattage}W Tier-1 Monocrystalline Solar PV Module`,
      specification: `${selectedPanelCount} modules based on the calculated PV energy target of ${round(targetPvKwp, 2)} kWp.`, unit: 'pcs'
    }, selectedPanelCount),
    makeItem(inverter, {
      category: 'Inverter & MPPT', code: 'INV-HYBRID', description: `${sizing.recommendedInverterKw} kW Hybrid Solar Inverter`,
      specification: `Selected from master inventory for ${sizing.systemVoltage}V DC bus; verify MPPT voltage/current against final string design.`, unit: 'pcs'
    }, 1),
    makeItem(battery, {
      category: 'Battery Storage', code: 'BATTERY-ESS', description: `Battery energy storage sized for ${sizing.recommendedBatteryKwh} kWh nominal capacity`,
      specification: `${batteryQty} unit(s) based on the selected database battery capacity and ${sizing.dod * 100}% design DoD.`, unit: 'pcs'
    }, batteryQty),
    makeItem(mounting, {
      category: 'Mounting Structures', code: 'MOUNTING', description: 'Solar PV mounting structure and clamps',
      specification: `Provide rails, feet, clamps and fasteners for ${sizing.panelCount} PV modules.`, unit: 'lot'
    }, Math.max(1, Math.ceil(sizing.panelCount / 4))),
    makeItem(dcProtection, {
      category: 'DC & AC Switchgear', code: 'DC-PROTECTION', description: 'DC isolation, protection and surge protection',
      specification: 'Final DC protection rating to be verified against PV string Voc/Isc and inverter MPPT limits.', unit: 'set'
    }, 1),
    makeItem(acProtection, {
      category: 'DC & AC Switchgear', code: 'AC-PROTECTION', description: 'AC distribution, isolation and changeover/bypass equipment',
      specification: 'Final breaker/RCD/changeover rating to match the inverter output and site phase arrangement.', unit: 'set'
    }, 1),
    makeItem(cable, {
      category: 'Cabling & Consumables', code: 'SOLAR-CABLE', description: 'Solar DC cable, connectors and electrical consumables',
      specification: 'Cable cross-section and route length to be confirmed from final site layout and voltage-drop check.', unit: 'lot'
    }, 1),
    makeItem(earth, {
      category: 'Cabling & Consumables', code: 'EARTHING', description: 'Earthing and bonding materials',
      specification: 'Earth electrodes, bonding conductors and accessories sized to the site earthing design.', unit: 'set'
    }, 1),
    makeItem(install, {
      category: 'Installation & Commissioning', code: 'INSTALL-COMM', description: 'Installation, testing, commissioning and handover',
      specification: 'Mechanical installation, electrical terminations, protection checks, commissioning and client handover.', unit: 'lot'
    }, 1),
  ];

  // If a database category has no configured price, keep the line visible at zero
  // rather than silently substituting an unrelated currency or invented price.
  void currency;
  return items.filter(Boolean);
}
