import * as React from 'react';
import { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, Calendar, MessageSquare, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NewsPanelProps {
    marketId: string;
}

export const NewsPanel: React.FC<NewsPanelProps> = ({ marketId }) => {
    const [articles, setArticles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                setLoading(true);
                // Fetch articles through the junction table association
                const { data, error } = await supabase
                    .from('market_articles')
                    .select(`
                        article_id,
                        articles (
                            id,
                            title,
                            source,
                            external_id,
                            created_at
                        )
                    `)
                    .eq('market_id', marketId)
                    .limit(5);

                if (error) throw error;

                // Extract articles from the nested join result
                const formattedArticles = data?.map(item => item.articles).filter(Boolean) || [];
                setArticles(formattedArticles);
            } catch (err) {
                console.error('Error fetching news:', err);
            } finally {
                setLoading(false);
            }
        };

        if (marketId) {
            fetchNews();
        }
    }, [marketId]);

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm min-h-[500px] flex flex-col">
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

            <div className="space-y-4 flex-1">
                {loading ? (
                    <div className="flex-1 flex flex-col gap-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="animate-pulse flex flex-col gap-2 p-4 bg-slate-50 rounded-2xl">
                                <div className="h-3 w-3/4 bg-slate-200 rounded"></div>
                                <div className="h-2 w-1/2 bg-slate-100 rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : articles.length > 0 ? (
                    articles.map((article, idx) => (
                        <div key={idx} className="group p-4 bg-slate-50/50 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 rounded-2xl transition-all duration-300">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                    <Calendar size={10} />
                                    {article.created_at
                                        ? new Date(article.created_at).toLocaleDateString()
                                        : 'Unknown Date'}
                                </span>
                                <span className="ml-auto px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-black uppercase tracking-widest">
                                    {article.source || 'Intel'}
                                </span>
                            </div>

                            <a
                                href={article.external_id?.startsWith('http') ? article.external_id : '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                            >
                                <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
                                    {article.title}
                                </h4>
                            </a>

                            <div className="flex items-center justify-between mt-auto">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Source: {article.source || 'Independent'}
                                </span>

                                <a
                                    href={article.external_id?.startsWith('http') ? article.external_id : '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 bg-white shadow-sm border border-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all font-bold text-[10px] flex items-center gap-1.5"
                                >
                                    READ <ExternalLink size={10} />
                                </a>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400">
                        <AlertTriangle className="mb-2 opacity-20" size={32} />
                        <p className="text-xs font-black uppercase tracking-widest opacity-40">No articles available</p>
                    </div>
                )}
            </div>

            <button className="w-full mt-6 py-3 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all">
                Access Global Matrix
            </button>
        </div>
    );
};
