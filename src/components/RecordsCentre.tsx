import React, { useMemo, useState } from 'react';
import { Database, Plus, RefreshCw, Search } from 'lucide-react';
import { Quotation } from '../types';
import { ClientRecordCard } from './ClientRecordCard';

interface RecordsCentreProps {
  quotes: Quotation[];
  onOpenExistingQuote: (quote: Quotation) => void;
  onDeleteQuote: (id: string) => void;
  onRefreshRecords: () => void;
  onStartNewQuotation: () => void;
  setActiveTab: (tab: string) => void;
  onMonitorClient: (quote: Quotation) => void;
}

export const RecordsCentre: React.FC<RecordsCentreProps> = ({quotes,onOpenExistingQuote,onDeleteQuote,onRefreshRecords,onStartNewQuotation,setActiveTab,onMonitorClient}) => {
  const [searchTerm,setSearchTerm] = useState('');
  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return quotes;
    return quotes.filter(q => `${q.quoteNumber} ${q.clientRef} ${q.client?.name||''} ${q.client?.contactPerson||''} ${q.client?.phone||''}`.toLowerCase().includes(term));
  },[quotes,searchTerm]);

  return <div className="page-stack">
    <section className="page-header">
      <div className="page-heading">
        <div className="section-icon"><Database size={18}/></div>
        <div><div className="eyebrow">Client records</div><h1>Quotation records</h1><p>Each completed quotation is stored as one clear client record. Open it to review or regenerate the document.</p></div>
      </div>
      <div className="toolbar-actions">
        <button className="btn-secondary" onClick={onRefreshRecords}><RefreshCw size={14}/> Refresh</button>
        <button className="btn-primary" onClick={()=>{onStartNewQuotation();setActiveTab('client')}}><Plus size={15}/> New quotation</button>
      </div>
    </section>

    <section className="search-strip">
      <Search size={16}/><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search client name, client reference, quotation number or phone"/><span>{filtered.length} of {quotes.length}</span>
    </section>

    <section className="records-list">
      {filtered.length ? filtered.map(q=><ClientRecordCard key={q.id} quote={q} onOpen={()=>onOpenExistingQuote(q)} onDelete={()=>{if(window.confirm(`Delete quotation ${q.quoteNumber}?`)) onDeleteQuote(q.id)}} onMonitor={()=>onMonitorClient(q)}/>) : <div className="empty-state"><Database size={28}/><strong>No client records found</strong><span>{searchTerm?'Try another search.':'Completed quotations will appear here.'}</span></div>}
    </section>
  </div>;
};
