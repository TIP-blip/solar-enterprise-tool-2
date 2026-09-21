import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ClientIntakeForm } from './components/ClientIntakeForm';
import { LoadAudit } from './components/LoadAudit';
import { BOQEditor } from './components/BOQEditor';
import { PDFPreview } from './components/PDFPreview';
import { RecordsCentre } from './components/RecordsCentre';
import { AICopilot } from './components/AICopilot';
import { DatabaseManager } from './components/DatabaseManager';
import { InverterMonitoring } from './components/InverterMonitoring';
import { 
  Client, 
  Appliance, 
  SizingResult, 
  BOQItem, 
  Financials, 
  CommercialTerms, 
  Quotation, 
  CompanySettings,
  HardwareItem,
  GalleryImage,
  DatabaseBundle,
  DatabaseDocument
} from './types';
import { 
  createBlankClient, 
  initialBlankSizing, 
  defaultCommercialTerms, 
  defaultCompanySettings,
  DEFAULT_HARDWARE_INVENTORY,
  DEFAULT_GALLERY_IMAGES,
  COMMON_APPLIANCES_LIBRARY
} from './data/defaults';
import { calculateSizing, generateRecommendedBOQ } from './utils/solarCalculator';
import { 
  fetchNextReferences, 
  fetchAllQuotes, 
  saveQuotation, 
  deleteQuotation,
  fetchFullDatabase,
  saveAppliance,
  deleteAppliance,
  saveHardwareItem,
  deleteHardwareItem,
  saveGalleryImage,
  deleteGalleryImage,
  fetchDatabaseDocuments, saveDatabaseDocument, deleteDatabaseDocument,
  autosaveWorkspaceDraft,
  fetchWorkspaceDraft
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [nextClientRef, setNextClientRef] = useState<string>('CL-2026-00101');
  const [nextQuoteRef, setNextQuoteRef] = useState<string>('QT-2026-00101');
  const [settings, setSettings] = useState<CompanySettings>(defaultCompanySettings);
  
  // Database Collections State
  const [dbAppliances, setDbAppliances] = useState<Appliance[]>(() =>
    COMMON_APPLIANCES_LIBRARY.map((item, idx) => ({ ...item, id: `app-def-${idx + 1}` }))
  );
  const [dbInventory, setDbInventory] = useState<HardwareItem[]>(DEFAULT_HARDWARE_INVENTORY);
  const [dbImages, setDbImages] = useState<GalleryImage[]>(DEFAULT_GALLERY_IMAGES);
  const [dbDocuments, setDbDocuments] = useState<DatabaseDocument[]>([]);
  const [dbClients, setDbClients] = useState<Client[]>([]);
  const [dbKnowledge, setDbKnowledge] = useState<DatabaseBundle['knowledgeBase']>();
  const [monitoringClient, setMonitoringClient] = useState<Client | null>(null);
  const [attachedPdfImageIds, setAttachedPdfImageIds] = useState<string[]>([]);

  // Active Working Job State - Genuinely Blank on Startup
  const [client, setClient] = useState<Client>(() => createBlankClient(nextClientRef));
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [sunHours, setSunHours] = useState<number>(5.0);
  const [systemVoltage, setSystemVoltage] = useState<number>(48);
  const [panelWattage, setPanelWattage] = useState<number>(550);
  const [coincidenceFactor, setCoincidenceFactor] = useState<number>(0.80);
  const [pvDerate, setPvDerate] = useState<number>(0.80);
  const [batteryAutonomyDays, setBatteryAutonomyDays] = useState<number>(1.0);
  const [boq, setBoq] = useState<BOQItem[]>([]);
  const [commercialTerms, setCommercialTerms] = useState<CommercialTerms>(defaultCommercialTerms);

  const [financials, setFinancials] = useState<Financials>({
    subtotal: 0,
    discount: 0,
    vatRate: 16,
    vatAmount: 0,
    grandTotal: 0,
  });

  // Load database quotes, master catalog & next chronological references on mount
  const refreshDatabaseAndReferences = useCallback(async () => {
    try {
      const [refData, allQuotes, dbBundle, dbDocs] = await Promise.all([
        fetchNextReferences(),
        fetchAllQuotes(),
        fetchFullDatabase(),
        fetchDatabaseDocuments(),
      ]);

      if (refData) {
        setNextClientRef(refData.nextClientRef);
        setNextQuoteRef(refData.nextQuoteRef);
        if (refData.settings) {
          setSettings({ ...refData.settings, currencySymbol: 'KSh ' });
        }

        // If client doesn't have a ref yet, set it
        setClient((prev) => {
          if (!prev.refNumber) {
            return { ...prev, refNumber: refData.nextClientRef };
          }
          return prev;
        });
      }

      if (allQuotes) {
        setQuotes(allQuotes);
      }

      if (dbDocs) setDbDocuments(dbDocs);

      if (dbBundle?.clients) setDbClients(dbBundle.clients);
      if (dbBundle?.knowledgeBase) setDbKnowledge(dbBundle.knowledgeBase);
      if (dbBundle) {
        if (dbBundle.appliances && dbBundle.appliances.length > 0) {
          setDbAppliances(dbBundle.appliances);
        }
        if (dbBundle.inventory && dbBundle.inventory.length > 0) {
          setDbInventory(dbBundle.inventory);
        }
        if (dbBundle.images && dbBundle.images.length > 0) {
          setDbImages(dbBundle.images);
        }
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  }, []);

  useEffect(() => {
    refreshDatabaseAndReferences();
  }, [refreshDatabaseAndReferences]);

  // Autosave workspace draft to server and local storage
  useEffect(() => {
    const timer = setTimeout(() => {
      if (client.name || appliances.length > 0 || boq.length > 0) {
        void autosaveWorkspaceDraft({
          client,
          appliances,
          sunHours,
          systemVoltage,
          panelWattage,
          coincidenceFactor,
          pvDerate,
          batteryAutonomyDays,
          boq,
          financials,
          commercialTerms,
          activeTab,
          savedAt: new Date().toISOString(),
        });
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [client, appliances, sunHours, systemVoltage, panelWattage, coincidenceFactor, pvDerate, batteryAutonomyDays, boq, financials, commercialTerms, activeTab]);

  // DATABASE CRUD HANDLERS
  const handleSaveDatabaseAppliance = async (app: Appliance) => {
    const saved = await saveAppliance(app);
    setDbAppliances((prev) => {
      const idx = prev.findIndex((a) => a.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  };

  const handleDeleteDatabaseAppliance = async (id: string) => {
    await deleteAppliance(id);
    setDbAppliances((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSaveDatabaseHardware = async (item: HardwareItem) => {
    const saved = await saveHardwareItem(item);
    setDbInventory((prev) => {
      const idx = prev.findIndex((i) => i.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  };

  const handleDeleteDatabaseHardware = async (id: string) => {
    await deleteHardwareItem(id);
    setDbInventory((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSaveDatabaseImage = async (img: GalleryImage) => {
    const saved = await saveGalleryImage(img);
    setDbImages((prev) => {
      const idx = prev.findIndex((i) => i.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  };

  const handleDeleteDatabaseImage = async (id: string) => {
    await deleteGalleryImage(id);
    setDbImages((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSaveDatabaseDocument = async (doc: DatabaseDocument) => { const saved=await saveDatabaseDocument(doc); setDbDocuments(prev=>[saved,...prev.filter(d=>d.id!==saved.id)]); };
  const handleDeleteDatabaseDocument = async (id:string) => { await deleteDatabaseDocument(id); setDbDocuments(prev=>prev.filter(d=>d.id!==id)); };

  // Recalculate sizing dynamically whenever appliances, sunHours, or systemVoltage change
  const sizing: SizingResult = useMemo(() => {
    return calculateSizing(appliances, sunHours, systemVoltage, panelWattage, 0.80, pvDerate, coincidenceFactor, batteryAutonomyDays);
  }, [appliances, sunHours, systemVoltage, panelWattage, pvDerate, coincidenceFactor, batteryAutonomyDays]);

  // Auto-generate BOQ if BOQ is currently empty and appliances were added
  const handleProceedToBOQ = () => {
    if (boq.length === 0 && sizing.totalDailyKwh > 0) {
      const autoItems = generateRecommendedBOQ(sizing, dbInventory, 'KSh ');
      setBoq(autoItems);
    }
    setActiveTab('boq');
  };

  // Reset / Start fresh quotation workflow (100% blank client and empty appliance/boq lists)
  const handleStartNewQuotation = useCallback(async () => {
    try {
      const refData = await fetchNextReferences();
      const nextCRef = refData?.nextClientRef || `CL-${new Date().getFullYear()}-00101`;
      const nextQRef = refData?.nextQuoteRef || `QT-${new Date().getFullYear()}-00101`;
      
      setNextClientRef(nextCRef);
      setNextQuoteRef(nextQRef);
      setClient(createBlankClient(nextCRef));
      setAppliances([]);
      setBoq([]);
      setFinancials({
        subtotal: 0,
        discount: 0,
        vatRate: 16,
        vatAmount: 0,
        grandTotal: 0,
      });
      setCommercialTerms(defaultCommercialTerms);
      setAttachedPdfImageIds([]);
    } catch (err) {
      console.error('Error starting new quote:', err);
    }
  }, []);

  // Save Quotation and clear active workspace
  const handleSaveAndClearWorkspace = async (): Promise<Quotation> => {
    const payload: Partial<Quotation> = {
      quoteNumber: nextQuoteRef,
      clientRef: client.refNumber || nextClientRef,
      client,
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + (commercialTerms.validityDays || 30) * 86400000).toISOString().split('T')[0],
      status: 'Issued',
      currency: 'KSh ',
      sizing,
      appliances,
      boq,
      financials,
      commercialTerms,
      attachedImages: attachedPdfImageIds,
    };

    const saved = await saveQuotation(payload);

    // Refresh database records list and get newly incremented references
    await refreshDatabaseAndReferences();

    // Now clear workspace ready for the next client!
    const newRefData = await fetchNextReferences();
    const newClientRef = newRefData.nextClientRef;
    const newQuoteRef = newRefData.nextQuoteRef;

    setNextClientRef(newClientRef);
    setNextQuoteRef(newQuoteRef);
    setClient(createBlankClient(newClientRef));
    setAppliances([]);
    setBoq([]);
    setFinancials({
      subtotal: 0,
      discount: 0,
      vatRate: 16,
      vatAmount: 0,
      grandTotal: 0,
    });
    setAttachedPdfImageIds([]);

    return saved;
  };

  // Open existing quote from database archive
  const handleOpenExistingQuote = (quote: Quotation) => {
    if (quote.client) {
      setClient(quote.client);
    }
    if (quote.appliances) {
      setAppliances(quote.appliances);
    }
    if (quote.boq) {
      setBoq(quote.boq);
    }
    if (quote.financials) {
      setFinancials(quote.financials);
    }
    if (quote.commercialTerms) {
      setCommercialTerms(quote.commercialTerms);
    }
    setAttachedPdfImageIds(quote.attachedImages || []);
    if (quote.quoteNumber) {
      setNextQuoteRef(quote.quoteNumber);
    }
    if (quote.clientRef) {
      setNextClientRef(quote.clientRef);
    }

    setActiveTab('preview');
  };

  // Delete quote
  const handleDeleteQuote = async (id: string) => {
    await deleteQuotation(id);
    await refreshDatabaseAndReferences();
  };

  // Determine if workspace has active entered data
  const isWorkspaceDirty = Boolean(client.name || appliances.length > 0 || boq.length > 0);

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 flex flex-col font-sans selection:bg-emerald-200 selection:text-emerald-900">
      {/* Top Header & Navigation (NO BANNERS, NO WORKFLOW STEP NUMBERS, NO PYTHON ERP TAB) */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        clientRef={client.refNumber || nextClientRef}
        quoteRef={nextQuoteRef}
        clientName={client.name}
        currency={'KSh '}
        onCurrencyChange={() => setSettings((prev) => ({ ...prev, currencySymbol: 'KSh ' }))}
        onStartNewQuotation={() => {
          handleStartNewQuotation();
          setActiveTab('client');
        }}
        isWorkspaceDirty={isWorkspaceDirty}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            quotes={quotes}
            onStartNewQuotation={() => {
              handleStartNewQuotation();
              setActiveTab('client');
            }}
            setActiveTab={setActiveTab}
            onOpenExistingQuote={handleOpenExistingQuote}
            nextClientRef={nextClientRef}
            nextQuoteRef={nextQuoteRef}
            images={dbImages}
            settings={settings}
            onImagesChange={setDbImages}
            onSettingsChange={setSettings}
          />
        )}

        {activeTab === 'database' && (
          <DatabaseManager
            appliances={dbAppliances}
            inventory={dbInventory}
            images={dbImages}
            documents={dbDocuments}
            quotes={quotes}
            onSaveAppliance={handleSaveDatabaseAppliance}
            onDeleteAppliance={handleDeleteDatabaseAppliance}
            onSaveHardware={handleSaveDatabaseHardware}
            onDeleteHardware={handleDeleteDatabaseHardware}
            onSaveImage={handleSaveDatabaseImage}
            onDeleteImage={handleDeleteDatabaseImage}
            onSaveDocument={handleSaveDatabaseDocument}
            onDeleteDocument={handleDeleteDatabaseDocument}
            onOpenQuote={handleOpenExistingQuote}
            onDeleteQuote={handleDeleteQuote}
            onRefreshDatabase={refreshDatabaseAndReferences}
            onStartNewQuotation={() => {
              handleStartNewQuotation();
              setActiveTab('client');
            }}
          />
        )}

        {activeTab === 'client' && (
          <ClientIntakeForm
            client={client}
            setClient={setClient}
            quoteRef={nextQuoteRef}
            onProceedToAudit={() => setActiveTab('audit')}
            onResetClient={() => setClient(createBlankClient(nextClientRef))}
          />
        )}

        {activeTab === 'audit' && (
          <LoadAudit
            appliances={appliances}
            setAppliances={setAppliances}
            sizing={sizing}
            sunHours={sunHours}
            setSunHours={setSunHours}
            systemVoltage={systemVoltage}
            setSystemVoltage={setSystemVoltage}
            panelWattage={panelWattage}
            setPanelWattage={setPanelWattage}
            coincidenceFactor={coincidenceFactor}
            setCoincidenceFactor={setCoincidenceFactor}
            pvDerate={pvDerate}
            setPvDerate={setPvDerate}
            batteryAutonomyDays={batteryAutonomyDays}
            setBatteryAutonomyDays={setBatteryAutonomyDays}
            onProceedToBOQ={handleProceedToBOQ}
            databaseAppliances={dbAppliances}
          />
        )}

        {activeTab === 'boq' && (
          <BOQEditor
            boq={boq}
            setBoq={setBoq}
            sizing={sizing}
            financials={financials}
            setFinancials={setFinancials}
            commercialTerms={commercialTerms}
            setCommercialTerms={setCommercialTerms}
            currency={'KSh '}
            inventory={dbInventory}
            onProceedToPreview={() => setActiveTab('preview')}
            onPanelWattageChange={setPanelWattage}
            onSystemVoltageChange={setSystemVoltage}
            knowledgeBase={dbKnowledge}
          />
        )}

        {activeTab === 'preview' && (
          <PDFPreview
            client={client}
            appliances={appliances}
            sizing={sizing}
            boq={boq}
            financials={financials}
            commercialTerms={commercialTerms}
            quoteRef={nextQuoteRef}
            currency={'KSh '}
            settings={settings}
            inventory={dbInventory}
            images={dbImages}
            attachedImageIds={attachedPdfImageIds}
            onAttachedImagesChange={setAttachedPdfImageIds}
            onSaveAndClearWorkspace={handleSaveAndClearWorkspace}
            setActiveTab={setActiveTab}
            onStartNewQuotation={handleStartNewQuotation}
          />
        )}

        {activeTab === 'records' && (
          <RecordsCentre
            quotes={quotes}
            onOpenExistingQuote={handleOpenExistingQuote}
            onDeleteQuote={handleDeleteQuote}
            onRefreshRecords={refreshDatabaseAndReferences}
            onStartNewQuotation={() => {
              handleStartNewQuotation();
              setActiveTab('client');
            }}
            setActiveTab={setActiveTab}
            onMonitorClient={(quote) => { setMonitoringClient(quote.client); setActiveTab('monitoring'); }}
          />
        )}

        {activeTab === 'monitoring' && <InverterMonitoring clients={dbClients.length ? dbClients : quotes.map(q=>q.client)} selectedClient={monitoringClient} onBackToRecords={()=>setActiveTab('records')} />}

        {activeTab === 'copilot' && (
          <AICopilot
            client={client}
            appliances={appliances}
            sizing={sizing}
            boq={boq}
          />
        )}
      </main>
    </div>
  );
}
