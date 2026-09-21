import React, { useMemo, useState } from 'react';
import { ArrowRight, BatteryCharging, Calculator, ChevronDown, ChevronUp, CircleHelp, Plus, Save, Sun, Trash2, Zap } from 'lucide-react';
import { Appliance, SizingResult } from '../types';
import { COMMON_APPLIANCES_LIBRARY } from '../data/defaults';

interface LoadAuditProps {
  appliances: Appliance[];
  setAppliances: React.Dispatch<React.SetStateAction<Appliance[]>>;
  sizing: SizingResult;
  sunHours: number;
  setSunHours: (h: number) => void;
  systemVoltage: number;
  setSystemVoltage: (v: number) => void;
  panelWattage: number;
  setPanelWattage: (v: number) => void;
  coincidenceFactor: number;
  setCoincidenceFactor: (v: number) => void;
  pvDerate: number;
  setPvDerate: (v: number) => void;
  batteryAutonomyDays: number;
  setBatteryAutonomyDays: (v: number) => void;
  onProceedToBOQ: () => void;
  databaseAppliances?: Appliance[];
}

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100';
const smallInput = 'w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-100';
const fmt = (n: number) => Number(n || 0).toLocaleString('en-KE', { maximumFractionDigits: 2 });

export const LoadAudit: React.FC<LoadAuditProps> = ({
  appliances, setAppliances, sizing, sunHours, setSunHours, systemVoltage, setSystemVoltage, panelWattage, setPanelWattage,
  coincidenceFactor, setCoincidenceFactor, pvDerate, setPvDerate, batteryAutonomyDays, setBatteryAutonomyDays,
  onProceedToBOQ, databaseAppliances,
}) => {
  const [name, setName] = useState('');
  const [watts, setWatts] = useState<number | ''>('');
  const [qty, setQty] = useState(1);
  const [hoursPerDay, setHoursPerDay] = useState<number | ''>('');
  const [usagePercent, setUsagePercent] = useState(100);
  const [surgeMultiplier, setSurgeMultiplier] = useState(1.2);
  const [nightUsagePercent, setNightUsagePercent] = useState(50);
  const [category, setCategory] = useState<Appliance['category']>('Lighting');
  const [showAssumptions, setShowAssumptions] = useState(false);

  const library = databaseAppliances?.length ? databaseAppliances : COMMON_APPLIANCES_LIBRARY.map((x, i) => ({ ...x, id: `lib-${i}` }));
  const connectedLoad = sizing.connectedLoadWatts ?? sizing.continuousWatts ?? 0;
  const designPeak = sizing.designPeakWatts ?? sizing.peakWatts ?? 0;
  const largestSurge = sizing.largestSurgeWatts ?? sizing.surgeWatts ?? 0;

  const totals = useMemo(() => appliances.reduce((a, item) => {
    const running = Math.max(0, Number(item.watts) || 0) * Math.max(1, Number(item.qty) || 1);
    const util = Math.max(0, Math.min(100, Number(item.usagePercent ?? 100))) / 100;
    const dailyWh = running * Math.max(0, Number(item.hoursPerDay) || 0) * util;
    return { connected: a.connected + running, dailyWh: a.dailyWh + dailyWh };
  }, { connected: 0, dailyWh: 0 }), [appliances]);

  const addAppliance = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim() || Number(watts) <= 0 || Number(hoursPerDay) <= 0) return;
    setAppliances(prev => [...prev, {
      id: `app_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(), category, watts: Number(watts), qty: Math.max(1, qty), hoursPerDay: Number(hoursPerDay),
      usagePercent: Math.max(0, Math.min(100, usagePercent)), surgeMultiplier: Math.max(1, surgeMultiplier),
      nightUsagePercent: Math.max(0, Math.min(100, nightUsagePercent)),
    }]);
    setName(''); setWatts(''); setQty(1); setHoursPerDay(''); setUsagePercent(100); setSurgeMultiplier(1.2); setNightUsagePercent(50);
  };

  const quickAdd = (item: Appliance) => setAppliances(prev => [...prev, { ...item, id: `app_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, usagePercent: item.usagePercent ?? 100 }]);
  const update = (id: string, patch: Partial<Appliance>) => setAppliances(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  const remove = (id: string) => setAppliances(prev => prev.filter(a => a.id !== id));

  return (
    <div className="space-y-5 pb-12">
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700"><Calculator size={20}/></div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">Engineering load audit</p>
              <h1 className="text-xl font-black text-slate-950 mt-0.5">Load Schedule & Solar Sizing</h1>
              <p className="text-xs text-slate-500 mt-1">Every recommendation below is traceable to the entered loads and the assumptions shown in the engineering panel.</p>
            </div>
          </div>
          <button type="button" onClick={() => setShowAssumptions(v => !v)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-emerald-500 hover:text-emerald-700">
            Engineering assumptions {showAssumptions ? <ChevronUp size={15}/> : <ChevronDown size={15}/>} 
          </button>
        </div>
        {showAssumptions && (
          <div className="px-6 py-5 bg-slate-50 border-b border-slate-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label className="text-[11px] font-bold text-slate-600">Peak sun hours/day<select value={sunHours} onChange={e=>setSunHours(Number(e.target.value))} className={`${smallInput} mt-1`}><option value={4}>4.0</option><option value={4.5}>4.5</option><option value={5}>5.0</option><option value={5.5}>5.5</option><option value={6}>6.0</option></select></label>
              <label className="text-[11px] font-bold text-slate-600">Panel wattage<select value={panelWattage} onChange={e=>setPanelWattage(Number(e.target.value))} className={`${smallInput} mt-1`}><option value={415}>415W</option><option value={550}>550W</option><option value={565}>565W</option><option value={580}>580W</option><option value={600}>600W</option></select></label>
              <label className="text-[11px] font-bold text-slate-600">Battery DC bus<select value={systemVoltage} onChange={e=>setSystemVoltage(Number(e.target.value))} className={`${smallInput} mt-1`}><option value={12}>12V</option><option value={24}>24V</option><option value={48}>48V</option></select></label>
              <label className="text-[11px] font-bold text-slate-600">Coincidence factor<select value={coincidenceFactor} onChange={e=>setCoincidenceFactor(Number(e.target.value))} className={`${smallInput} mt-1`}><option value={0.7}>0.70</option><option value={0.8}>0.80</option><option value={0.9}>0.90</option><option value={1}>1.00</option></select></label>
              <label className="text-[11px] font-bold text-slate-600">PV derate<select value={pvDerate} onChange={e=>setPvDerate(Number(e.target.value))} className={`${smallInput} mt-1`}><option value={0.7}>70%</option><option value={0.75}>75%</option><option value={0.8}>80%</option><option value={0.85}>85%</option><option value={0.9}>90%</option></select></label>
              <label className="text-[11px] font-bold text-slate-600">Battery autonomy<select value={batteryAutonomyDays} onChange={e=>setBatteryAutonomyDays(Number(e.target.value))} className={`${smallInput} mt-1`}><option value={0.5}>0.5 day</option><option value={1}>1.0 day</option><option value={1.5}>1.5 days</option><option value={2}>2.0 days</option></select></label>
            </div>
            <div className="mt-4 grid md:grid-cols-3 gap-3 text-[11px] text-slate-600">
              <div className="rounded-lg border border-slate-200 bg-white p-3"><b className="text-slate-900">Energy:</b> W × quantity × hours × utilisation.</div>
              <div className="rounded-lg border border-slate-200 bg-white p-3"><b className="text-slate-900">Inverter:</b> connected load × coincidence, then 25% margin, checked against largest appliance surge.</div>
              <div className="rounded-lg border border-slate-200 bg-white p-3"><b className="text-slate-900">Battery:</b> night energy × autonomy ÷ DoD. PV = daily energy ÷ (sun hours × derate).</div>
            </div>
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[['Daily energy', `${fmt(sizing.totalDailyKwh)} kWh`, `Day ${fmt(sizing.dayKwh)} • Night ${fmt(sizing.nightKwh)}`], ['Connected load', `${fmt(connectedLoad / 1000)} kW`, `${fmt(connectedLoad)} W total connected`], ['Design peak', `${fmt(designPeak / 1000)} kW`, `${Math.round(coincidenceFactor*100)}% coincidence`], ['Inverter', `${fmt(sizing.recommendedInverterKw)} kW`, `Surge check ${fmt(largestSurge / 1000)} kW`], ['PV + battery', `${fmt(sizing.recommendedPvArrayKwp)} kWp`, `${sizing.panelCount} × ${sizing.panelWattage}W • ${fmt(sizing.recommendedBatteryKwh)} kWh`]].map(([label,value,note]) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4"><div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{label}</div><div className="mt-2 text-xl font-black text-slate-950">{value}</div><div className="mt-1 text-[10px] text-slate-500">{note}</div></div>
        ))}
      </section>

      <div className="grid lg:grid-cols-[340px_1fr] gap-5 items-start">
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4"><Plus size={17} className="text-emerald-700"/><h2 className="font-black text-sm text-slate-950">Add load</h2></div>
          <form onSubmit={addAppliance} className="space-y-3">
            <input className={inputClass} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Borehole pump" required />
            <div className="grid grid-cols-2 gap-2"><label className="text-[10px] font-bold text-slate-500">WATTS<input className={`${smallInput} mt-1`} type="number" min="1" value={watts} onChange={e=>setWatts(e.target.value===''?'':Number(e.target.value))} required/></label><label className="text-[10px] font-bold text-slate-500">QTY<input className={`${smallInput} mt-1`} type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value)||1)}/></label></div>
            <div className="grid grid-cols-2 gap-2"><label className="text-[10px] font-bold text-slate-500">HOURS/DAY<input className={`${smallInput} mt-1`} type="number" min="0.1" max="24" step="0.1" value={hoursPerDay} onChange={e=>setHoursPerDay(e.target.value===''?'':Number(e.target.value))} required/></label><label className="text-[10px] font-bold text-slate-500">UTILISATION %<input className={`${smallInput} mt-1`} type="number" min="0" max="100" value={usagePercent} onChange={e=>setUsagePercent(Number(e.target.value))}/></label></div>
            <div className="grid grid-cols-2 gap-2"><label className="text-[10px] font-bold text-slate-500">NIGHT SHARE %<input className={`${smallInput} mt-1`} type="number" min="0" max="100" value={nightUsagePercent} onChange={e=>setNightUsagePercent(Number(e.target.value))}/></label><label className="text-[10px] font-bold text-slate-500">SURGE ×<input className={`${smallInput} mt-1`} type="number" min="1" step="0.1" value={surgeMultiplier} onChange={e=>setSurgeMultiplier(Number(e.target.value))}/></label></div>
            <select className={inputClass} value={category} onChange={e=>setCategory(e.target.value as Appliance['category'])}><option>Lighting</option><option>Refrigeration</option><option>HVAC & Cooling</option><option>Pumping & Water</option><option>Computing & Office</option><option>Electronics</option><option>Kitchen & Cooking</option><option>Heavy Machinery</option><option>Other</option></select>
            <button className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 inline-flex items-center justify-center gap-2"><Plus size={15}/> Add to schedule</button>
          </form>
          <div className="mt-5 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2"><span className="text-[10px] uppercase tracking-wider font-black text-slate-500">Quick add from database</span><span className="text-[10px] text-emerald-700 font-bold">{library.length} items</span></div>
            <div className="max-h-64 overflow-auto space-y-1.5 pr-1">{library.slice(0,80).map(item=><button type="button" key={item.id} onClick={()=>quickAdd(item)} className="w-full text-left border border-slate-200 rounded-lg p-2 hover:border-emerald-400 hover:bg-emerald-50/50"><div className="text-[11px] font-bold text-slate-800 truncate">{item.name}</div><div className="text-[10px] text-slate-500">{item.watts}W • {item.hoursPerDay}h/day</div></button>)}</div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between"><div><h2 className="font-black text-sm text-slate-950">Load schedule</h2><p className="text-[10px] text-slate-500 mt-0.5">Edit values directly; sizing updates immediately.</p></div>{appliances.length>0&&<button type="button" onClick={()=>setAppliances([])} className="text-xs font-bold text-rose-600 hover:text-rose-700">Clear all</button>}</div>
          {appliances.length===0 ? <div className="p-14 text-center"><Zap className="mx-auto text-slate-300" size={30}/><p className="mt-3 text-sm font-bold text-slate-700">No loads entered</p><p className="text-xs text-slate-500 mt-1">Start with the form or quick-add a database appliance.</p></div> : <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-emerald-600 text-white"><tr><th className="px-3 py-2.5 text-left">Load</th><th className="px-2">Qty</th><th className="px-2">W</th><th className="px-2">Hrs</th><th className="px-2">Use %</th><th className="px-3 text-right">Daily Wh</th><th></th></tr></thead><tbody>{appliances.map((item)=>{const running=(item.watts||0)*(item.qty||1);const daily=running*(item.hoursPerDay||0)*((item.usagePercent??100)/100);return <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50"><td className="px-3 py-2.5 min-w-[210px]"><div className="font-bold text-slate-800">{item.name}</div><div className="text-[10px] text-slate-400">{item.category} • surge ×{item.surgeMultiplier}</div></td><td className="px-2"><input className="w-14 text-center border rounded-md px-1 py-1" type="number" min="1" value={item.qty} onChange={e=>update(item.id,{qty:Number(e.target.value)||1})}/></td><td className="px-2"><input className="w-16 text-center border rounded-md px-1 py-1" type="number" min="0" value={item.watts} onChange={e=>update(item.id,{watts:Number(e.target.value)||0})}/></td><td className="px-2"><input className="w-16 text-center border rounded-md px-1 py-1" type="number" min="0" max="24" step="0.1" value={item.hoursPerDay} onChange={e=>update(item.id,{hoursPerDay:Number(e.target.value)||0})}/></td><td className="px-2"><input className="w-16 text-center border rounded-md px-1 py-1" type="number" min="0" max="100" value={item.usagePercent??100} onChange={e=>update(item.id,{usagePercent:Number(e.target.value)})}/></td><td className="px-3 text-right font-mono font-bold text-slate-900">{fmt(daily)}</td><td className="px-2 text-center"><button type="button" onClick={()=>remove(item.id)} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={14}/></button></td></tr>})}</tbody><tfoot className="bg-slate-50 font-bold"><tr><td className="px-3 py-3 text-right" colSpan={2}>TOTAL CONNECTED</td><td className="px-2 font-mono">{fmt(totals.connected)}W</td><td colSpan={2}></td><td className="px-3 text-right font-mono">{fmt(totals.dailyWh)} Wh/day</td><td></td></tr></tfoot></table></div>}
          <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 grid md:grid-cols-4 gap-3 text-[11px]">
            <div><span className="text-slate-500">Night energy</span><b className="block text-slate-950 mt-0.5">{fmt(sizing.nightKwh)} kWh</b></div>
            <div><span className="text-slate-500">Design peak</span><b className="block text-slate-950 mt-0.5">{fmt(designPeak/1000)} kW</b></div>
            <div><span className="text-slate-500">Largest surge</span><b className="block text-slate-950 mt-0.5">{fmt(largestSurge/1000)} kW</b></div>
            <div><span className="text-slate-500">MPPT current guide</span><b className="block text-slate-950 mt-0.5">{fmt(sizing.recommendedChargeControllerA)} A</b></div>
          </div>
        </section>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><div className="flex items-center gap-2 text-sm font-black text-slate-950"><Save size={16} className="text-emerald-700"/>Sizing result ready for BOQ</div><p className="text-[11px] text-slate-500 mt-1">{sizing.recommendedPvArrayKwp} kWp PV • {sizing.recommendedInverterKw} kW inverter • {sizing.recommendedBatteryKwh} kWh battery • {sizing.recommendedBatteryAh} Ah @ {systemVoltage}V</p></div>
        <button onClick={onProceedToBOQ} disabled={!appliances.length} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-5 py-2.5 text-xs font-black">Build BOQ from database <ArrowRight size={16}/></button>
      </section>
      <div className="flex items-center gap-2 text-[10px] text-slate-500"><CircleHelp size={13}/> Final string design, voltage drop, short-circuit protection and equipment compatibility still require site/equipment datasheet verification before installation.</div>
    </div>
  );
};
