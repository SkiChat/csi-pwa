import React from 'react';
import { Flame, ArrowUpRight, Search } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface TrendsPanelProps {
    marketId: string;
}

const mockTrendData = [
    { val: 10 }, { val: 25 }, { val: 15 }, { val: 45 }, { val: 35 }, { val: 65 }, { val: 55 }, { val: 90 }
];

export const TrendsPanel: React.FC<TrendsPanelProps> = ({ marketId }) => {
    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-orange-50 rounded-xl text-orange-500">
                        <Flame size={18} />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Social Velocity</h3>
                </div>
                <Search size={16} className="text-slate-300" />
            </div>

            <div className="flex items-end gap-4 mb-4">
                <div>
                    <h4 className="text-3xl font-black text-slate-900 tracking-tight">+142%</h4>
                    <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest flex items-center gap-0.5">
                        <ArrowUpRight size={12} />
                        Trending High
                    </p>
                </div>
                <div className="h-12 flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={mockTrendData}>
                            <Area
                                type="monotone"
                                dataKey="val"
                                stroke="#f97316"
                                fill="#ffedd5"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <span>Keywords</span>
                    <span>Volume</span>
                </div>
                <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors cursor-default">
                    <span className="text-xs font-bold text-slate-600">ETF Approval</span>
                    <span className="text-xs font-black text-slate-900">84.2K</span>
                </div>
                <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors cursor-default">
                    <span className="text-xs font-bold text-slate-600">SEC Decision</span>
                    <span className="text-xs font-black text-slate-900">32.1K</span>
                </div>
            </div>
        </div>
    );
};
