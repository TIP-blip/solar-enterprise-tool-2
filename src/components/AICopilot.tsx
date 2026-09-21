import React, { useState } from 'react';
import { 
  Cpu, 
  Sparkles, 
  ShieldCheck, 
  RefreshCw, 
} from 'lucide-react';
import { Client, Appliance, SizingResult, BOQItem } from '../types';
import { requestAiEngineeringReview } from '../services/api';

interface AICopilotProps {
  client: Client;
  appliances: Appliance[];
  sizing: SizingResult;
  boq: BOQItem[];
}

export const AICopilot: React.FC<AICopilotProps> = ({
  client,
  appliances,
  sizing,
  boq,
}) => {
  const [review, setReview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [source, setSource] = useState<string>('');

  const handleRunAudit = async () => {
    setIsLoading(true);
    try {
      const res = await requestAiEngineeringReview({
        client,
        appliances,
        sizing,
        boq,
      });
      setReview(res.review);
      setSource(res.source);
    } catch (err) {
      console.error('Audit failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#19b95d]/10 text-[#19b95d] flex items-center justify-center shrink-0">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-sans">
              AI Solar Engineering Auditor
            </h1>
            <p className="text-xs text-slate-500">
              Evaluates inverter headroom, DC/AC sizing ratio, battery autonomy days, balance-of-system safety, and national electrical codes.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunAudit}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 font-black bg-[#19b95d] hover:bg-[#148a46] rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing System Architecture...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>Run Engineering Audit</span>
            </>
          )}
        </button>
      </div>

      {/* System Profile Summary */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <span className="text-slate-500 block">Target Client:</span>
          <span className="font-bold text-slate-900 truncate block">{client.name || 'Not specified'}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Inverter Headroom:</span>
          <span className="font-bold text-slate-900">{sizing.recommendedInverterKw} kW Rated</span>
        </div>
        <div>
          <span className="text-slate-500 block">Solar Generation:</span>
          <span className="font-bold text-[#19b95d]">{sizing.recommendedPvArrayKwp} kWp PV</span>
        </div>
        <div>
          <span className="text-slate-500 block">Storage:</span>
          <span className="font-bold text-slate-900">{sizing.recommendedBatteryKwh} kWh LiFePO4</span>
        </div>
      </div>

      {/* Audit Output Box */}
      {review ? (
        <div className="bg-white rounded-2xl border border-[#19b95d]/30 shadow-xs p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-900 font-sans font-bold text-base">
              <ShieldCheck className="w-5 h-5 text-[#19b95d]" />
              <span>Certified Engineering Review</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Engine: {source === 'gemini' ? 'Gemini 2.5 Flash' : 'PV Technical Heuristics'}
            </span>
          </div>

          <div className="prose prose-sm max-w-none text-slate-700 text-xs sm:text-sm whitespace-pre-line leading-relaxed">
            {review}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#19b95d]/10 text-[#19b95d] mx-auto flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Ready for Engineering Audit</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click &quot;Run Engineering Audit&quot; to review the current active client specifications and load sizing for safety, code compliance, and performance guarantees.
          </p>
        </div>
      )}
    </div>
  );
};
