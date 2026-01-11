import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Newspaper, ExternalLink, MessageCircle, AlertCircle } from 'lucide-react';

interface Article {
    id: string;
    title: string;
    url: string;
    published_at: string;
    relevance_score: number;
    sentiment_score: number | null;
    impact_score: number | null;
}

export const NewsPanel: React.FC<{ marketId: string }> = ({ marketId }) => {
    const [news, setNews] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchNews() {
            setLoading(true);
            setError(null);
            try {
                const { data, error: fetchError } = await supabase
                    .from('market_articles')
                    .select(`
                relevance_score,
                sentiment_score,
                impact_score,
                articles (
                    id,
                    title,
                    url,
                    published_at
                )
            `)
                    .eq('market_id', marketId)
                    .order('impact_score', { ascending: false })
                    .limit(10);

                if (fetchError) throw fetchError;

                const formattedNews = (data || []).map((item: any) => ({
                    ...item.articles,
                    relevance_score: item.relevance_score,
                    sentiment_score: item.sentiment_score,
                    impact_score: item.impact_score
                }));

                setNews(formattedNews);
            } catch (err: any) {
                console.error('Error fetching news:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchNews();
    }, [marketId]);

    if (loading) return (
        <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-50 rounded-xl" />
            ))}
        </div>
    );

    if (error) return (
        <div className="p-4 bg-red-50 text-red-500 rounded-xl text-center text-sm">
            <AlertCircle className="mx-auto mb-2" size={20} />
            Failed to load news feed
        </div>
    );

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
                <Newspaper size={20} className="text-indigo-600" />
                Intelligence Feed
            </h3>

            <div className="space-y-4">
                {news.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-8">No intelligence gathered for this market yet.</p>
                ) : (
                    news.map((item) => (
                        <div key={item.id} className="group p-4 rounded-xl border border-gray-50 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all">
                            <div className="flex justify-between items-start gap-3 mb-2">
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2"
                                >
                                    {item.title}
                                </a>
                                <ExternalLink size={14} className="text-gray-300 group-hover:text-indigo-400 flex-shrink-0" />
                            </div>

                            <div className="flex items-center gap-3 mt-3">
                                <span className={`w-2 h-2 rounded-full ${item.sentiment_score === null ? 'bg-gray-300' :
                                        item.sentiment_score > 0 ? 'bg-green-500' :
                                            item.sentiment_score < 0 ? 'bg-red-500' : 'bg-yellow-500'
                                    }`} />

                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                    Impact: {item.impact_score?.toFixed(1) || 'N/A'}
                                </span>

                                <span className="text-[10px] text-gray-400 ml-auto">
                                    {new Date(item.published_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
