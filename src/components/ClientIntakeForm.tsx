import React, { useMemo } from 'react';
import { ArrowRight, MapPin, Phone, Mail, UserRound, RotateCcw, ShieldCheck } from 'lucide-react';
import { Client } from '../types';

interface Props { client:Client; setClient:React.Dispatch<React.SetStateAction<Client>>; quoteRef:string; onProceedToAudit:()=>void; onResetClient:()=>void; }
const titleCase=(value:string)=>value.replace(/\s+/g,' ').trimStart().split(' ').map(w=>w?`${w.charAt(0).toUpperCase()}${w.slice(1).toLowerCase()}`:'').join(' ');
const digits=(value:string)=>value.replace(/\D/g,'').slice(0,10);

export const ClientIntakeForm:React.FC<Props>=({client,setClient,quoteRef,onProceedToAudit,onResetClient})=>{
 const set=(field:keyof Client,value:any)=>setClient(prev=>({...prev,[field]:value}));
 const phoneDigits=digits(client.phone);
 const valid=client.name.trim().length>=2 && phoneDigits.length===10;
 const nameHint=useMemo(()=>client.name.trim()&&!/^[A-Z][a-z]+(?: [A-Z][a-z]+)*$/.test(client.name.trim()),[client.name]);
 return <div className="page-stack narrow-page">
   <section className="page-header">
     <div className="page-heading"><div className="section-icon"><UserRound size={18}/></div><div><div className="eyebrow">Client intake</div><h1>Client & project details</h1><p>Enter the customer record once. The same clean details are carried into sizing, BOQ, quotation and archived records.</p></div></div>
     <div className="ref-block"><span>Client ref</span><b>{client.refNumber||'—'}</b><span>Quotation</span><b>{quoteRef||'—'}</b></div>
   </section>

   <section className="panel form-panel">
     <div className="form-section"><div className="form-section-title"><span>01</span><div><h2>Customer</h2><p>Names are formatted in normal title case when you leave the field.</p></div></div>
       <div className="form-grid two">
         <label className="form-field full"><span>Client / company name *</span><input value={client.name} onChange={e=>set('name',e.target.value)} onBlur={e=>set('name',titleCase(e.target.value))} placeholder="e.g. Fish Mang" autoComplete="name"/><small>{nameHint?'Will be formatted as title case on leaving the field.':'Use the customer or registered company name.'}</small></label>
         <label className="form-field"><span>Contact person</span><input value={client.contactPerson} onChange={e=>set('contactPerson',e.target.value)} onBlur={e=>set('contactPerson',titleCase(e.target.value))} placeholder="e.g. Clinton Maritim" autoComplete="name"/></label>
         <label className="form-field"><span><Phone size={13}/> Phone / WhatsApp *</span><input value={client.phone} onChange={e=>set('phone',digits(e.target.value))} inputMode="numeric" maxLength={10} placeholder="0792798733" autoComplete="tel"/><small className={phoneDigits.length===10?'valid-note':'error-note'}>{phoneDigits.length}/10 digits</small></label>
         <label className="form-field"><span><Mail size={13}/> Email</span><input type="email" value={client.email} onChange={e=>set('email',e.target.value.trim())} placeholder="client@example.com" autoComplete="email"/></label>
         <label className="form-field"><span><MapPin size={13}/> Site / physical location</span><input value={client.address} onChange={e=>set('address',e.target.value)} placeholder="Nairobi, Kenya" autoComplete="street-address"/></label>
         <label className="form-field"><span>Region / county</span><input value={client.region||''} onChange={e=>set('region',titleCase(e.target.value))} placeholder="Nairobi County"/></label>
       </div>
     </div>

     <div className="form-section">
       <div className="form-section-title"><span>02</span><div><h2>System context</h2><p>These fields guide the sizing workflow and appear only where useful in the quotation.</p></div></div>
       <div className="form-grid three">
         <label className="form-field"><span>Property type</span><select value={client.propertyType} onChange={e=>set('propertyType',e.target.value)}><option>Residential Villa</option><option>Commercial Facility</option><option>Industrial / Factory</option><option>Agricultural Farm</option><option>Healthcare / Clinic</option><option>Hospitality / Resort</option><option>Educational / School</option></select></label>
         <label className="form-field"><span>Grid connection</span><select value={client.gridType} onChange={e=>set('gridType',e.target.value)}><option>Hybrid with Battery</option><option>Off-Grid Pure Standalone</option><option>Grid-Tied (No Battery)</option><option>Microgrid / Multi-Source</option></select></label>
         <label className="form-field"><span>Electrical phase</span><select value={client.phaseType} onChange={e=>set('phaseType',e.target.value)}><option>Single Phase (230V)</option><option>Three Phase (400V)</option><option>Split Phase (120/240V)</option></select></label>
       </div>
     </div>

     <div className="form-section">
       <div className="form-section-title"><span>03</span><div><h2>Notes</h2><p>Internal observations stay out of the customer-facing quotation unless deliberately included later.</p></div></div>
       <label className="form-field"><span>Site notes / backup requirement</span><textarea rows={4} value={client.notes} onChange={e=>set('notes',e.target.value)} placeholder="Outage duration, roof observations, critical loads, backup expectations..."/></label>
     </div>

     <div className="form-footer"><button className="btn-secondary" onClick={onResetClient}><RotateCcw size={14}/> Clear form</button><div className="form-submit-note">{valid?<><ShieldCheck size={14}/> Client record is ready.</>:<>Enter a name and exactly 10 phone digits to continue.</>}</div><button className="btn-primary" disabled={!valid} onClick={onProceedToAudit}>Continue to load audit <ArrowRight size={15}/></button></div>
   </section>
 </div>;
};
