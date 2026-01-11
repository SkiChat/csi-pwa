import React from 'react';
import { Shield, Activity, Zap, Cpu } from 'lucide-react';

interface CSIPanelProps {
    marketId: string;
}

export const CSIPanel: React.FC<CSIPanelProps> = ({ marketId }) => {
    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                    <Shield size={18} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Signal Intelligence</h3>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                    <div className="flex items-center gap-3">
                        <Activity className="text-emerald-500" size={16} />
                        <span className="text-xs font-bold text-slate-600">Network Stability</span>
                    </div>
                    <span className="text-xs font-black text-slate-900 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-lg">99.8%</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                    <div className="flex items-center gap-3">
                        <Zap className="text-amber-500" size={16} />
                        <span className="text-xs font-bold text-slate-600">Market Volatility</span>
                    </div>
                    <span className="text-xs font-black text-slate-900 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-lg">MEDIUM</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                    <div className="flex items-center gap-3">
                        <Cpu className="text-indigo-500" size={16} />
                        <span className="text-xs font-bold text-slate-600">Entity Consensus</span>
                    </div>
                    <span className="text-xs font-black text-slate-900 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-lg">HIGH</span>
                </div>
            </div>

            <div className="mt-6 p-4 bg-indigo-600 rounded-2xl text-white">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">CSI Protocol Status</p>
                <p className="text-xs font-bold">Scanning 1,204 interconnected nodes for real-time risk adjustment...</p>
            </div>
        </div>
    );
};
