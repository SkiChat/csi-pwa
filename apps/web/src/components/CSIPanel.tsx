import * as React from 'react';
import { useState, useEffect } from 'react';
import { Shield, Activity, Zap, Cpu, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CSIPanelProps {
    marketId: string;
}

interface AISummary {
    id: string;
    summary_text: string;
    sentiment_score: number;
    impact_score: number;
    created_at: string;
}

export const CSIPanel: React.FC<CSIPanelProps> = ({ marketId }) => {
    const [insights, setInsights] = useState<AISummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchAIInsights() {
            setLoading(true);
            setError(null);
            try {
                const { data, error: fetchError } = await supabase
                    .from('ai_summaries')
                    .select('*')
                    .eq('market_id', marketId)
                    .order('created_at', { ascending: false })
                    .limit(3);

                if (fetchError) throw fetchError;
                setInsights(data || []);
            } catch (err: any) {
                console.error('Error fetching AI insights:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        if (marketId) {
            fetchAIInsights();
        }
    }, [marketId]);

    const icons = [Activity, Zap, Cpu];

    if (loading) return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm h-[400px] flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
                <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Aggregating Signals...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm h-[400px] flex items-center justify-center text-center">
            <div>
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Intelligence Link Failed</p>
            </div>
        </div>
    );

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                    <Shield size={18} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Signal Intelligence</h3>
            </div>

            <div className="space-y-4">
                {insights.length > 0 ? (
                    insights.map((item, index) => {
                        const Icon = icons[index % icons.length];
                        const sentimentLabel = (item.sentiment_score || 0) > 0 ? 'Positive' : (item.sentiment_score || 0) < 0 ? 'Negative' : 'Neutral';
                        const scoreColor = (item.sentiment_score || 0) > 0 ? 'text-emerald-500' : (item.sentiment_score || 0) < 0 ? 'text-rose-500' : 'text-amber-500';
                        const bgColor = (item.sentiment_score || 0) > 0 ? 'bg-emerald-100/50 text-emerald-700' : (item.sentiment_score || 0) < 0 ? 'bg-rose-100/50 text-rose-700' : 'bg-amber-100/50 text-amber-700';

                        return (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50 hover:border-indigo-200 transition-colors">
                                <div className="flex items-center gap-3">
                                    <Icon className={scoreColor} size={16} />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-600 line-clamp-1">{item.summary_text}</span>
                                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-tight ${bgColor}`}>
                                    {sentimentLabel} ({Math.round((item.impact_score || 0) * 10)}%)
                                </span>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <Cpu className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest px-4">No insights available</p>
                    </div>
                )}
            </div>

            <div className="mt-6 p-4 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">CSI Protocol Status</p>
                <p className="text-xs font-bold">
                    {insights.length > 0
                        ? `Successfully cross-referenced ${insights.length} AI vectors with real-time sentiment shifts.`
                        : 'Scanning interconnected nodes for real-time risk adjustment...'}
                </p>
            </div>
        </div>
    );
};
