import React from 'react';
import { FileText, UserRound, Activity, Pencil } from 'lucide-react';
import { Quotation } from '../types';

const money = (n:number) => Number(n || 0).toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2});

interface Props {
  quote: Quotation;
  onOpen?: () => void;
  onDelete?: () => void;
  onMonitor?: () => void;
  onDesign?: () => void;
}

export const ClientRecordCard: React.FC<Props> = ({ quote, onOpen, onDelete, onMonitor, onDesign }) => {
  const client = quote.client || ({} as any);
  return (
    <article className="record-card">
      <div className="record-card-head">
        <div className="record-client">
          <div className="record-avatar"><UserRound size={17}/></div>
          <div className="min-w-0">
            <div className="record-eyebrow">Client record</div>
            <div className="record-name truncate">{client.name || 'Unnamed Client'}</div>
            <div className="record-meta"><span>{quote.clientRef || '—'}</span><span>•</span><span>{quote.quoteNumber || '—'}</span></div>
          </div>
        </div>
        <div className="record-actions">
          {onOpen && <button className="btn-secondary btn-small" onClick={onOpen}><FileText size={14}/> Quotation / Design</button>}
          {onMonitor && <button className="btn-primary btn-small" onClick={onMonitor}><Activity size={14}/> Monitoring</button>}
          {onDelete && <button className="btn-danger btn-small" onClick={onDelete}>Delete</button>}
          {onDesign && <button className="btn-secondary btn-small" onClick={onDesign}><Pencil size={14}/> Design</button>}
        </div>
      </div>

      <div className="record-grid">
        <div className="record-metric">
          <span>Client</span>
          <strong>{client.name || 'Not entered'}</strong>
          <small>{client.contactPerson || client.phone || 'Contact details not supplied'}</small>
        </div>
        <div className="record-metric">
          <span>System</span>
          <strong>{quote.sizing?.recommendedInverterKw || 0} kW / {quote.sizing?.recommendedPvArrayKwp || 0} kWp</strong>
          <small>{client.gridType || 'System type not specified'}</small>
        </div>
        <div className="record-metric">
          <span>Storage</span>
          <strong>{quote.sizing?.recommendedBatteryKwh || 0} kWh</strong>
          <small>{quote.sizing?.systemVoltage || 48}V DC • {quote.sizing?.batteryAutonomyDays || 1} day design autonomy</small>
        </div>
        <div className="record-metric record-total">
          <span>Grand total</span>
          <strong>KSh {money(quote.financials?.grandTotal || 0)}</strong>
          <small>{quote.date || '—'} {client.address ? `• ${client.address}` : ''}</small>
        </div>
      </div>
    </article>
  );
};
