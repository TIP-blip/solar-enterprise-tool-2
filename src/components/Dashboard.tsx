import React, { useEffect, useMemo, useState } from 'react';
import { Database, FileText, Plus, RefreshCw, Sun, Upload, Zap } from 'lucide-react';
import { Quotation, GalleryImage, CompanySettings } from '../types';
import { saveGalleryImage, saveSettings } from '../services/api';
import { ClientRecordCard } from './ClientRecordCard';

interface DashboardProps {
  quotes: Quotation[]; onStartNewQuotation:()=>void; setActiveTab:(tab:string)=>void; onOpenExistingQuote:(q:Quotation)=>void;
  nextClientRef:string; nextQuoteRef:string; images:GalleryImage[]; settings:CompanySettings; onImagesChange:(x:GalleryImage[])=>void; onSettingsChange:(x:CompanySettings)=>void;
}

export const Dashboard:React.FC<DashboardProps>=({quotes,onStartNewQuotation,setActiveTab,onOpenExistingQuote,nextClientRef,nextQuoteRef,images,settings,onImagesChange,onSettingsChange})=>{
  const [index,setIndex]=useState(0);
  const backgrounds=useMemo(()=>images.filter(i=>i.imageUrl && (settings.dashboardBackgroundIds?.length ? settings.dashboardBackgroundIds.includes(i.id) : true)),[images,settings.dashboardBackgroundIds]);
  useEffect(()=>{if(backgrounds.length<2)return;const t=window.setInterval(()=>setIndex(i=>(i+1)%backgrounds.length),6500);return()=>window.clearInterval(t)},[backgrounds.length]);
  useEffect(()=>{if(index>=backgrounds.length)setIndex(0)},[index,backgrounds.length]);
  const total=quotes.reduce((s,q)=>s+(q.financials?.grandTotal||0),0);
  const pv=quotes.reduce((s,q)=>s+(q.sizing?.recommendedPvArrayKwp||0),0);
  const storage=quotes.reduce((s,q)=>s+(q.sizing?.recommendedBatteryKwh||0),0);
  const uploadBackground=async(e:React.ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(!f)return;const reader=new FileReader();reader.onload=async()=>{const img:GalleryImage={id:`img-bg-${Date.now()}`,title:f.name.replace(/\.[^.]+$/,''),category:'Site Photo',imageUrl:String(reader.result),caption:'Dashboard background',uploadedAt:new Date().toISOString()};const saved=await saveGalleryImage(img);const nextIds=[...(settings.dashboardBackgroundIds||[]),saved.id];onImagesChange([saved,...images]);onSettingsChange(await saveSettings({...settings,dashboardBackgroundIds:nextIds,dashboardBackgroundEnabled:true}));};reader.readAsDataURL(f);e.target.value='';};
  const recent=quotes.slice(0,2);
  return <div className="page-stack">
    <section className="dashboard-hero">
      {settings.dashboardBackgroundEnabled&&backgrounds.length>0&&<><img src={backgrounds[index].imageUrl} className="hero-image"/><div className="hero-wash"/></>}
      <div className="hero-content">
        <div className="eyebrow hero-eyebrow">ONE INVERTER • SOLAR ENGINEERING</div>
        <h1>Commercial quotation workspace</h1>
        <p>Build a client load profile, size the system, generate the BOQ and issue a clean customer quotation.</p>
        <div className="hero-ref"><span>Next client <b>{nextClientRef}</b></span><span>Next quotation <b>{nextQuoteRef}</b></span></div>
        <div className="toolbar-actions">
          <button className="btn-primary" onClick={()=>{onStartNewQuotation();setActiveTab('client')}}><Plus size={15}/> New quotation</button>
          <button className="btn-secondary" onClick={()=>setActiveTab('database')}><Database size={15}/> Master database</button>
          <button className="btn-secondary" onClick={()=>setActiveTab('monitoring')}><Zap size={15}/> Energy Tracker</button>
        </div>
      </div>
    </section>

    <section className="stats-grid">
      <div className="stat-card"><span>Archived quotations</span><strong>{quotes.length}</strong><small>Client records stored</small></div>
      <div className="stat-card"><span>Quoted PV capacity</span><strong>{pv.toFixed(2)} kWp</strong><small>Across archived quotations</small></div>
      <div className="stat-card"><span>Quoted storage</span><strong>{storage.toFixed(2)} kWh</strong><small>Across archived quotations</small></div>
      <div className="stat-card"><span>Quoted value</span><strong>KSh {total.toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong><small>Grand totals</small></div>
    </section>

    <section className="panel">
      <div className="panel-head"><div><div className="eyebrow">Presentation</div><h2>Dashboard background</h2><p>Use a site or solar image as a quiet watermark. It stays behind the content and never competes with the controls.</p></div><div className="toolbar-actions"><label className="btn-secondary"><Upload size={14}/> Upload image<input hidden type="file" accept="image/*,.svg" onChange={uploadBackground}/></label><button className="btn-secondary" onClick={async()=>onSettingsChange(await saveSettings({...settings,dashboardBackgroundEnabled:!settings.dashboardBackgroundEnabled}))}>{settings.dashboardBackgroundEnabled?'Hide background':'Show background'}</button></div></div>
      {backgrounds.length>0&&<div className="background-preview"><img src={backgrounds[index].imageUrl}/><div><b>{backgrounds[index].title}</b><span>Visible only as a restrained dashboard backdrop.</span></div></div>}
    </section>

    <section className="panel">
      <div className="panel-head"><div><div className="eyebrow">Recent client records</div><h2>Recent quotations</h2></div><button className="btn-secondary" onClick={()=>setActiveTab('records')}><FileText size={14}/> View all</button></div>
      <div className="records-list">{recent.length?recent.map(q=><ClientRecordCard key={q.id} quote={q} onOpen={()=>onOpenExistingQuote(q)}/>):<div className="empty-state"><FileText size={26}/><strong>No quotations yet</strong><span>Start a new quotation to create the first client record.</span></div>}</div>
    </section>
  </div>;
};
