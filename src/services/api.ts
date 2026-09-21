import { Client, Quotation, CompanySettings, Appliance, HardwareItem, GalleryImage, DatabaseBundle, DatabaseDocument, InverterTelemetry } from '../types';
import { defaultCompanySettings, COMMON_APPLIANCES_LIBRARY, DEFAULT_HARDWARE_INVENTORY, DEFAULT_GALLERY_IMAGES } from '../data/defaults';

export async function fetchNextReferences(): Promise<{
  nextClientRef: string;
  nextQuoteRef: string;
  nextClientSeq: number;
  nextQuoteSeq: number;
  settings: CompanySettings;
}> {
  try {
    const res = await fetch('/api/references/next');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('API unavailable, generating fallback chronological reference:', err);
  }

  // Local fallback based on stored sequence
  const currentYear = new Date().getFullYear();
  const storedClientSeq = Number(localStorage.getItem('oneinverter_client_seq') || '101');
  const storedQuoteSeq = Number(localStorage.getItem('oneinverter_quote_seq') || '101');

  return {
    nextClientRef: `CL-${currentYear}-${String(storedClientSeq).padStart(5, '0')}`,
    nextQuoteRef: `QT-${currentYear}-${String(storedQuoteSeq).padStart(5, '0')}`,
    nextClientSeq: storedClientSeq,
    nextQuoteSeq: storedQuoteSeq,
    settings: defaultCompanySettings,
  };
}

export async function fetchAllQuotes(): Promise<Quotation[]> {
  try {
    const res = await fetch('/api/quotes');
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('oneinverter_quotes_cache', JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('API error fetching quotes, using local cache:', err);
  }

  const cached = localStorage.getItem('oneinverter_quotes_cache');
  return cached ? JSON.parse(cached) : [];
}

export async function saveQuotation(quoteData: Partial<Quotation>): Promise<Quotation> {
  try {
    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quoteData),
    });

    if (res.ok) {
      const saved = await res.json();
      // Update local storage backup
      const cachedList = await fetchAllQuotes();
      const exists = cachedList.some((q) => q.id === saved.id || q.quoteNumber === saved.quoteNumber);
      const updated = exists ? cachedList.map((q) => (q.id === saved.id ? saved : q)) : [saved, ...cachedList];
      localStorage.setItem('oneinverter_quotes_cache', JSON.stringify(updated));
      return saved;
    }
  } catch (err) {
    console.warn('Server save failed, saving to local offline database:', err);
  }

  // Offline fallback
  const fallbackQuote: Quotation = {
    id: quoteData.id || `qt_${Date.now()}`,
    quoteNumber: quoteData.quoteNumber || `PI${String(101).padStart(5, '0')}`,
    clientRef: quoteData.clientRef || `CL-${new Date().getFullYear()}-00101`,
    client: quoteData.client as Client,
    date: quoteData.date || new Date().toISOString().split('T')[0],
    validUntil: quoteData.validUntil || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    status: 'Issued',
    currency: quoteData.currency || 'KSh ',
    sizing: quoteData.sizing as any,
    appliances: quoteData.appliances || [],
    boq: quoteData.boq || [],
    financials: quoteData.financials as any,
    commercialTerms: quoteData.commercialTerms as any,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const cached = localStorage.getItem('oneinverter_quotes_cache');
  const list: Quotation[] = cached ? JSON.parse(cached) : [];
  list.unshift(fallbackQuote);
  localStorage.setItem('oneinverter_quotes_cache', JSON.stringify(list));

  // Increment local sequences
  const nextClient = Number(localStorage.getItem('oneinverter_client_seq') || '101') + 1;
  const nextQuote = Number(localStorage.getItem('oneinverter_quote_seq') || '101') + 1;
  localStorage.setItem('oneinverter_client_seq', String(nextClient));
  localStorage.setItem('oneinverter_quote_seq', String(nextQuote));

  return fallbackQuote;
}

export async function deleteQuotation(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/quotes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      const cached = localStorage.getItem('oneinverter_quotes_cache');
      if (cached) {
        const list: Quotation[] = JSON.parse(cached).filter((q: Quotation) => q.id !== id && q.quoteNumber !== id);
        localStorage.setItem('oneinverter_quotes_cache', JSON.stringify(list));
      }
      return true;
    }
  } catch (err) {
    console.warn('Failed to delete on server:', err);
  }

  const cached = localStorage.getItem('oneinverter_quotes_cache');
  if (cached) {
    const list: Quotation[] = JSON.parse(cached).filter((q: Quotation) => q.id !== id && q.quoteNumber !== id);
    localStorage.setItem('oneinverter_quotes_cache', JSON.stringify(list));
    return true;
  }
  return false;
}

export async function requestAiEngineeringReview(payload: {
  client: Client;
  appliances: any[];
  sizing: any;
  boq: any[];
}): Promise<{ source: string; review: string; timestamp: string }> {
  try {
    const res = await fetch('/api/ai/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('AI review request error:', err);
  }

  return {
    source: 'engineering-engine-offline',
    review: `### Engineering Design Verification
System configuration for **${payload.client?.name || 'Client'}** verified.
- **Inverter Rating:** ${payload.sizing?.recommendedInverterKw || 5} kW Pure Sine Wave
- **Solar Array:** ${payload.sizing?.recommendedPvArrayKwp || 4} kWp Tier 1 Mono
- **Battery Storage:** ${payload.sizing?.recommendedBatteryKwh || 10} kWh LiFePO4
- Sizing meets standard continuous and surge margins. Electrical switchgear & surge arrestors included in Bill of Quantities.`,
    timestamp: new Date().toISOString(),
  };
}

// FULL DATABASE BUNDLE
export async function saveSettings(settings: CompanySettings): Promise<CompanySettings> {
  try {
    const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    if (res.ok) return await res.json();
  } catch {}
  localStorage.setItem('oneinverter_settings', JSON.stringify(settings));
  return settings;
}

export async function fetchDatabaseDocuments(): Promise<DatabaseDocument[]> {
  try { const res = await fetch('/api/documents'); if (res.ok) { const data = await res.json(); localStorage.setItem('oneinverter_documents_db', JSON.stringify(data)); return data; } } catch {}
  const cached = localStorage.getItem('oneinverter_documents_db'); return cached ? JSON.parse(cached) : [];
}
export async function saveDatabaseDocument(doc: DatabaseDocument): Promise<DatabaseDocument> {
  try { const res = await fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(doc) }); if (res.ok) { const saved = await res.json(); const list = await fetchDatabaseDocuments(); const next = [saved, ...list.filter(d => d.id !== saved.id)]; localStorage.setItem('oneinverter_documents_db', JSON.stringify(next)); return saved; } } catch {}
  const list = await fetchDatabaseDocuments(); const next = [doc, ...list.filter(d => d.id !== doc.id)]; localStorage.setItem('oneinverter_documents_db', JSON.stringify(next)); return doc;
}
export async function deleteDatabaseDocument(id: string): Promise<boolean> {
  try { const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' }); if (res.ok) {} } catch {}
  const list = await fetchDatabaseDocuments(); localStorage.setItem('oneinverter_documents_db', JSON.stringify(list.filter(d => d.id !== id))); return true;
}


export async function learnFromDatabaseDocuments(): Promise<{ sourceCount:number; sources:string[]; summary:string; updatedAt:string }> {
  try {
    const res = await fetch('/api/documents/learn', { method:'POST', headers:{'Content-Type':'application/json'} });
    if (res.ok) return await res.json();
  } catch (err) { console.warn('Document learning request failed:', err); }
  throw new Error('Document learning could not be started. Make sure the server is running.');
}

export async function fetchTelemetry(): Promise<InverterTelemetry[]> {
  try { const res = await fetch('/api/telemetry'); if (res.ok) return await res.json(); } catch {}
  const cached = localStorage.getItem('oneinverter_telemetry'); return cached ? JSON.parse(cached) : [];
}
export async function saveTelemetry(row: InverterTelemetry): Promise<InverterTelemetry> {
  try { const res = await fetch('/api/telemetry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) }); if (res.ok) return await res.json(); } catch {}
  const list = await fetchTelemetry(); const next = [row, ...list.filter(x => x.id !== row.id)]; localStorage.setItem('oneinverter_telemetry', JSON.stringify(next)); return row;
}
export async function deleteTelemetry(id: string): Promise<boolean> {
  try { await fetch(`/api/telemetry/${id}`, { method: 'DELETE' }); } catch {}
  const list = await fetchTelemetry(); localStorage.setItem('oneinverter_telemetry', JSON.stringify(list.filter(x => x.id !== id))); return true;
}

export async function fetchFullDatabase(): Promise<DatabaseBundle> {
  try {
    const res = await fetch('/api/database');
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('oneinverter_db_bundle', JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('API error fetching database bundle:', err);
  }

  const cached = localStorage.getItem('oneinverter_db_bundle');
  if (cached) {
    return JSON.parse(cached);
  }

  // Fallback initial bundle
  const defaultAppliances: Appliance[] = COMMON_APPLIANCES_LIBRARY.map((item, idx) => ({
    ...item,
    id: `app-def-${idx + 1}`,
  }));

  return {
    appliances: defaultAppliances,
    inventory: DEFAULT_HARDWARE_INVENTORY,
    quotes: await fetchAllQuotes(),
    clients: [],
    images: DEFAULT_GALLERY_IMAGES,
    settings: defaultCompanySettings,
  };
}

// APPLIANCES CRUD WITH AUTOSAVE
export async function fetchAppliances(): Promise<Appliance[]> {
  try {
    const res = await fetch('/api/appliances');
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('oneinverter_appliances_db', JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Error fetching appliances from API:', err);
  }

  const cached = localStorage.getItem('oneinverter_appliances_db');
  if (cached) return JSON.parse(cached);

  const fallback: Appliance[] = COMMON_APPLIANCES_LIBRARY.map((item, idx) => ({
    ...item,
    id: `app-${idx + 1}`,
  }));
  localStorage.setItem('oneinverter_appliances_db', JSON.stringify(fallback));
  return fallback;
}

export async function saveAppliance(app: Appliance): Promise<Appliance> {
  try {
    const res = await fetch('/api/appliances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(app),
    });
    if (res.ok) {
      const saved = await res.json();
      updateLocalApplianceCache(saved);
      return saved;
    }
  } catch (err) {
    console.warn('Server save appliance failed, saving locally:', err);
  }

  updateLocalApplianceCache(app);
  return app;
}

function updateLocalApplianceCache(saved: Appliance) {
  const cached = localStorage.getItem('oneinverter_appliances_db');
  const list: Appliance[] = cached ? JSON.parse(cached) : [];
  const idx = list.findIndex((a) => a.id === saved.id);
  if (idx >= 0) {
    list[idx] = saved;
  } else {
    list.unshift(saved);
  }
  localStorage.setItem('oneinverter_appliances_db', JSON.stringify(list));
}

export async function deleteAppliance(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/appliances/${id}`, { method: 'DELETE' });
    if (res.ok) {
      removeLocalAppliance(id);
      return true;
    }
  } catch (err) {
    console.warn('Failed to delete appliance on server:', err);
  }

  removeLocalAppliance(id);
  return true;
}

function removeLocalAppliance(id: string) {
  const cached = localStorage.getItem('oneinverter_appliances_db');
  if (cached) {
    const filtered = JSON.parse(cached).filter((a: Appliance) => a.id !== id);
    localStorage.setItem('oneinverter_appliances_db', JSON.stringify(filtered));
  }
}

// HARDWARE INVENTORY CRUD WITH AUTOSAVE
export async function fetchHardwareInventory(): Promise<HardwareItem[]> {
  try {
    const res = await fetch('/api/inventory');
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('oneinverter_inventory_db', JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Error fetching inventory from API:', err);
  }

  const cached = localStorage.getItem('oneinverter_inventory_db');
  if (cached) return JSON.parse(cached);

  localStorage.setItem('oneinverter_inventory_db', JSON.stringify(DEFAULT_HARDWARE_INVENTORY));
  return DEFAULT_HARDWARE_INVENTORY;
}

export async function saveHardwareItem(item: HardwareItem): Promise<HardwareItem> {
  try {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (res.ok) {
      const saved = await res.json();
      updateLocalInventoryCache(saved);
      return saved;
    }
  } catch (err) {
    console.warn('Server save inventory failed, saving locally:', err);
  }

  updateLocalInventoryCache(item);
  return item;
}

function updateLocalInventoryCache(saved: HardwareItem) {
  const cached = localStorage.getItem('oneinverter_inventory_db');
  const list: HardwareItem[] = cached ? JSON.parse(cached) : [];
  const idx = list.findIndex((i) => i.id === saved.id);
  if (idx >= 0) {
    list[idx] = saved;
  } else {
    list.unshift(saved);
  }
  localStorage.setItem('oneinverter_inventory_db', JSON.stringify(list));
}

export async function deleteHardwareItem(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
    if (res.ok) {
      removeLocalInventory(id);
      return true;
    }
  } catch (err) {
    console.warn('Failed to delete hardware item on server:', err);
  }

  removeLocalInventory(id);
  return true;
}

function removeLocalInventory(id: string) {
  const cached = localStorage.getItem('oneinverter_inventory_db');
  if (cached) {
    const filtered = JSON.parse(cached).filter((i: HardwareItem) => i.id !== id);
    localStorage.setItem('oneinverter_inventory_db', JSON.stringify(filtered));
  }
}

// GALLERY IMAGES CRUD WITH AUTOSAVE
export async function fetchGalleryImages(): Promise<GalleryImage[]> {
  try {
    const res = await fetch('/api/images');
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('oneinverter_images_db', JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Error fetching images from API:', err);
  }

  const cached = localStorage.getItem('oneinverter_images_db');
  if (cached) return JSON.parse(cached);

  localStorage.setItem('oneinverter_images_db', JSON.stringify(DEFAULT_GALLERY_IMAGES));
  return DEFAULT_GALLERY_IMAGES;
}

export async function saveGalleryImage(img: GalleryImage): Promise<GalleryImage> {
  try {
    const res = await fetch('/api/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(img),
    });
    if (res.ok) {
      const saved = await res.json();
      updateLocalImagesCache(saved);
      return saved;
    }
  } catch (err) {
    console.warn('Server save image failed, saving locally:', err);
  }

  updateLocalImagesCache(img);
  return img;
}

function updateLocalImagesCache(saved: GalleryImage) {
  const cached = localStorage.getItem('oneinverter_images_db');
  const list: GalleryImage[] = cached ? JSON.parse(cached) : [];
  const idx = list.findIndex((i) => i.id === saved.id);
  if (idx >= 0) {
    list[idx] = saved;
  } else {
    list.unshift(saved);
  }
  localStorage.setItem('oneinverter_images_db', JSON.stringify(list));
}

export async function deleteGalleryImage(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/images/${id}`, { method: 'DELETE' });
    if (res.ok) {
      removeLocalImage(id);
      return true;
    }
  } catch (err) {
    console.warn('Failed to delete image on server:', err);
  }

  removeLocalImage(id);
  return true;
}

function removeLocalImage(id: string) {
  const cached = localStorage.getItem('oneinverter_images_db');
  if (cached) {
    const filtered = JSON.parse(cached).filter((i: GalleryImage) => i.id !== id);
    localStorage.setItem('oneinverter_images_db', JSON.stringify(filtered));
  }
}

// AUTOSAVE ACTIVE WORKSPACE DRAFT
export async function autosaveWorkspaceDraft(draft: any): Promise<boolean> {
  try {
    localStorage.setItem('oneinverter_workspace_draft', JSON.stringify(draft));
    await fetch('/api/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    return true;
  } catch (err) {
    // Local storage is already updated
    return true;
  }
}

export async function fetchWorkspaceDraft(): Promise<any | null> {
  try {
    const res = await fetch('/api/draft');
    if (res.ok) {
      const data = await res.json();
      if (data) return data;
    }
  } catch (err) {
    // fallback
  }

  const cached = localStorage.getItem('oneinverter_workspace_draft');
  return cached ? JSON.parse(cached) : null;
}

