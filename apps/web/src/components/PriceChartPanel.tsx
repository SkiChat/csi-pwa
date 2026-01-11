import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface PricePoint {
    timestamp: string;
    yes_price: number;
}

export const PriceChartPanel: React.FC<{ marketId: string }> = ({ marketId }) => {
    const [data, setData] = useState<PricePoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchPriceHistory() {
            setLoading(true);
            setError(null);
            try {
                const { data: prices, error: fetchError } = await supabase
                    .from('market_prices')
                    .select('timestamp, yes_price')
                    .eq('market_id', marketId)
                    .order('timestamp', { ascending: true })
                    .limit(100);

                if (fetchError) throw fetchError;

                const formattedData = (prices || []).map(p => ({
                    timestamp: new Date(p.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
                    yes_price: p.yes_price
                }));

                setData(formattedData);
            } catch (err: any) {
                console.error('Error fetching price history:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchPriceHistory();
    }, [marketId]);

    if (loading) return (
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-xl animate-pulse">
            <p className="text-gray-400">Loading price history...</p>
        </div>
    );

    if (error) return (
        <div className="h-64 flex flex-col items-center justify-center bg-red-50 text-red-500 rounded-xl p-4">
            <AlertCircle className="mb-2" />
            <p className="text-sm text-center font-medium">Failed to load chart data</p>
        </div>
    );

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp size={20} className="text-indigo-600" />
                        Price History
                    </h3>
                    <p className="text-sm text-gray-500">Historical performance of "Yes" outcome</p>
                </div>
            </div>

            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis
                            dataKey="timestamp"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                        />
                        <YAxis
                            domain={[0, 1]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            tickFormatter={(val) => `$${val.toFixed(2)}`}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                        />
                        <Line
                            type="monotone"
                            dataKey="yes_price"
                            stroke="#4f46e5"
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
