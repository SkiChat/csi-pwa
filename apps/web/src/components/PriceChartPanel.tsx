import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PriceChartPanelProps {
    marketId: string;
}

export const PriceChartPanel: React.FC<PriceChartPanelProps> = ({ marketId }) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPrices = async () => {
            try {
                setLoading(true);
                const { data: prices, error: fetchError } = await supabase
                    .from('market_prices')
                    .select('*')
                    .eq('market_id', marketId)
                    .order('timestamp', { ascending: true });

                if (fetchError) throw fetchError;

                if (prices && prices.length > 0) {
                    setData(prices.map(p => ({
                        time: new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        price: p.yes_price
                    })));
                } else {
                    // Placeholder data if no real data exists yet
                    setData([
                        { time: '09:00', price: 0.45 },
                        { time: '10:00', price: 0.48 },
                        { time: '11:00', price: 0.42 },
                        { time: '12:00', price: 0.55 },
                        { time: '13:00', price: 0.58 },
                    ]);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPrices();
    }, [marketId]);

    if (loading) return (
        <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm h-80 flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
    );

    if (error) return (
        <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm h-80 flex flex-col items-center justify-center text-slate-500">
            <AlertCircle size={32} className="mb-2 text-red-500" />
            <p>Error loading price data</p>
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
                <div className="text-right">
                    <p className="text-2xl font-black text-indigo-600">$0.58</p>
                    <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">+12.4% (24h)</p>
                </div>
            </div>

            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="time" hide />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="price"
                            stroke="#4f46e5"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorPrice)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
