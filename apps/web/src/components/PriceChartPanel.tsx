import * as React from 'react';
import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PriceChartPanelProps {
    marketId: string;
}

export const PriceChartPanel: React.FC<PriceChartPanelProps> = ({ marketId }) => {
    const [priceData, setPriceData] = useState<any[]>([]);
    const [stats, setStats] = useState({ current: 0, delta: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPrices = async () => {
            try {
                setLoading(true);
                setError(null);

                const { data: prices, error: fetchError } = await supabase
                    .from('market_prices')
                    .select('timestamp, yes_price')
                    .eq('market_id', marketId)
                    .order('timestamp', { ascending: true });

                if (fetchError) throw fetchError;

                if (prices && prices.length > 0) {
                    // Transform data for chart as requested: x = timestamp, y = price
                    const formatted = prices.map(p => ({
                        x: new Date(p.timestamp).getTime(),
                        displayTime: new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        y: p.yes_price
                    }));

                    setPriceData(formatted);

                    // Calculate simple stats
                    const current = prices[prices.length - 1].yes_price;
                    const initial = prices[0].yes_price;
                    const delta = initial !== 0 ? ((current - initial) / initial) * 100 : 0;

                    setStats({ current, delta });
                } else {
                    setPriceData([]);
                    setStats({ current: 0, delta: 0 });
                }
            } catch (err: any) {
                console.error('Error fetching price data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (marketId) {
            fetchPrices();
        }
    }, [marketId]);

    if (loading) return (
        <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm h-80 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Streaming Market Data...</p>
        </div>
    );

    if (error) return (
        <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm h-80 flex flex-col items-center justify-center text-slate-500">
            <AlertCircle size={32} className="mb-2 text-red-500" />
            <p className="text-sm font-bold">Data Stream Interrupted</p>
            <p className="text-[10px] mt-1 opacity-60 uppercase">{error}</p>
        </div>
    );

    return (
        <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                        <TrendingUp size={20} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">Price Performance</h3>
                </div>
                {priceData.length > 0 && (
                    <div className="text-right">
                        <p className="text-2xl font-black text-indigo-600">${stats.current.toFixed(2)}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${stats.delta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {stats.delta >= 0 ? '+' : ''}{stats.delta.toFixed(1)}% (period)
                        </p>
                    </div>
                )}
            </div>

            <div className="h-48 w-full">
                {priceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={priceData}>
                            <defs>
                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="x" hide />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '16px',
                                    border: 'none',
                                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                    padding: '12px'
                                }}
                                itemStyle={{ fontWeight: 'black', color: '#4f46e5' }}
                                labelStyle={{ display: 'none' }}
                                formatter={(value: number, name: any, props: any) => {
                                    return [`$${value.toFixed(2)}`, 'Market Price'];
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="y"
                                stroke="#4f46e5"
                                strokeWidth={4}
                                fillOpacity={1}
                                fill="url(#colorPrice)"
                                animationDuration={1500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No price data available</p>
                    </div>
                )}
            </div>
        </div>
    );
};
