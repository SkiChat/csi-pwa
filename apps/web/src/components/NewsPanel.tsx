import React, { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, Calendar, MessageSquare, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NewsPanelProps {
    marketId: string;
}

export const NewsPanel: React.FC<NewsPanelProps> = ({ marketId }) => {
    const [news, setNews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('market_articles')
                    .select(`
            *,
            articles (*)
          `)
                    .eq('market_id', marketId)
                    .order('impact_score', { ascending: false })
                    .limit(10);

                if (error) throw error;
                setNews(data || []);
            } catch (err) {
                console.error('Error fetching news:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, [marketId]);

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                        <Newspaper size={18} />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Intelligence Feed</h3>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-violet-100 text-violet-700 rounded-lg text-[10px] font-bold">
                    <MessageSquare size={10} />
                    <span>AI AGGREGATED</span>
                </div>
            </div>

            <div className="space-y-4">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse flex flex-col gap-2 p-4 bg-slate-50 rounded-2xl">
                            <div className="h-3 w-3/4 bg-slate-200 rounded"></div>
                            <div className="h-2 w-1/2 bg-slate-100 rounded"></div>
                        </div>
                    ))
                ) : news.length > 0 ? (
                    news.map((item, idx) => (
                        <div key={idx} className="group p-4 bg-slate-50/50 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 rounded-2xl transition-all duration-300">
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${(item.sentiment_score || 0) > 0 ? 'bg-green-100 text-green-700' :
                                        (item.sentiment_score || 0) < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                                    }`}>
                                    {(item.sentiment_score || 0) > 0 ? 'Bullish' : (item.sentiment_score || 0) < 0 ? 'Bearish' : 'Neutral'}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 ml-auto">
                                    <Calendar size={10} />
                                    {new Date(item.articles?.published_at).toLocaleDateString()}
                                </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-3">
                                {item.articles?.title}
                            </h4>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-400"></div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Impact: {item.impact_score?.toFixed(1) || '0.0'}</span>
                                </div>
                                <a
                                    href={item.articles?.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 bg-white shadow-sm border border-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all"
                                >
                                    <ExternalLink size={12} />
                                </a>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                        <AlertTriangle className="mb-2" size={24} />
                        <p className="text-xs font-bold uppercase tracking-widest">No intelligence gathered</p>
                    </div>
                )}
            </div>

            <button className="w-full mt-6 py-3 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all">
                View Full Intelligence Portal
            </button>
        </div>
    );
};
