import React from 'react';
import { supabase } from '../lib/supabase';
import { AreaChart, Area, ResponsiveContainer, BarChart3, Flame } from 'recharts';

export const TrendsPanel: React.FC<{ marketId: string }> = ({ marketId }) => {
    const [data, setData] = React.useState<{ val: number; date: string }[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<boolean>(false);

    React.useEffect(() => {
        async function fetchTrendData() {
            setLoading(true);
            setError(false);
            try {
                const { data: trends, error: fetchError } = await supabase
                    .from('trend_data')
                    .select('timestamp, interest_score')
                    .eq('market_id', marketId)
                    .order('timestamp', { ascending: true })
                    .limit(50);

                if (fetchError) throw fetchError;

                if (!trends || trends.length === 0) {
                    setData([]);
                } else {
                    setData(trends.map(t => ({
                        val: t.interest_score,
                        date: new Date(t.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })
                    })));
                }
            } catch (err) {
                console.error('Error fetching trends:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        }

        fetchTrendData();
    }, [marketId]);

    if (loading) return (
        <div className="h-48 bg-gray-50 rounded-2xl animate-pulse flex items-center justify-center">
            <p className="text-gray-400 text-xs font-medium">Quantifying interest...</p>
        </div>
    );

    if (error || data.length === 0) return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center">
            <BarChart3 className="text-gray-200 mb-2" size={32} />
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest">Trends Data Unavailable</p>
            <p className="text-[10px] text-gray-300 mt-1">Insufficient search volume for this market</p>
        </div>
    );

    const lastValue = data[data.length - 1]?.val || 0;
    const firstValue = data[0]?.val || 0;
    const growth = firstValue === 0 ? 0 : Math.round(((lastValue - firstValue) / firstValue) * 100);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Flame size={20} className="text-orange-500" />
                Search Momentum
            </h3>

            <div className="flex items-end gap-4">
                <div className="flex-1">
                    <p className="text-3xl font-black text-gray-900">{growth > 0 ? '+' : ''}{growth}%</p>
                    <p className={`text-[10px] font-bold uppercase tracking-tighter ${growth >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                        {growth >= 0 ? 'Rising Interest' : 'Declining Interest'}
                    </p>
                </div>

                <div className="h-16 w-32">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <Area
                                type="monotone"
                                dataKey="val"
                                stroke="#f97316"
                                fill="#ffedd5"
                                strokeWidth={2}
                                dot={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-50">
                <p className="text-[10px] text-gray-400 font-medium italic">
                    Google Trends normalized search volume over the last 7 days.
                </p>
            </div>
        </div>
    );
};
