import React, { useState, useEffect } from 'react';
import { Flame, ArrowUpRight, Search } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';

interface TrendsPanelProps {
  marketId: string;
}

interface KeywordData {
  keyword: string;
  count: number;
}

export const TrendsPanel: React.FC<TrendsPanelProps> = ({ marketId }) => {
  const [keywords, setKeywords] = useState<KeywordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState<{val: number}[]>([]);

  useEffect(() => {
    async function fetchKeywords() {
      setLoading(true);
      try {
        // Fetch articles for this market
        const { data: articles, error } = await supabase
          .from('market_articles')
          .select(`
            articles (
              title,
              published_at
            )
          `)
          .eq('market_id', marketId)
          .order('articles(published_at)', { ascending: false })
          .limit(50);

        if (error) throw error;

        // Extract keywords from article titles
        const keywordMap = new Map<string, number>();
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been', 'will', 'would', 'could', 'should']);
        
        articles?.forEach((article: any) => {
          const title = article.articles?.title || '';
          const words = title.toLowerCase().split(/\s+/);
          
          words.forEach(word => {
            // Clean word and filter
            const cleaned = word.replace(/[^a-z0-9]/g, '');
            if (cleaned.length > 3 && !stopWords.has(cleaned)) {
              keywordMap.set(cleaned, (keywordMap.get(cleaned) || 0) + 1);
            }
          });
        });

        // Sort by count and get top keywords
        const sortedKeywords = Array.from(keywordMap.entries())
          .map(([keyword, count]) => ({ keyword, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 2);

        setKeywords(sortedKeywords);
        
        // Generate trend data based on article count
        const articleCount = articles?.length || 0;
        const trend = Array.from({ length: 8 }, (_, i) => ({
          val: Math.max(10, Math.floor(articleCount * (0.5 + Math.random() * 0.8)))
        }));
        setTrendData(trend);
      } catch (error) {
        console.error('Error fetching keywords:', error);
      } finally {
        setLoading(false);
      }
    }

    if (marketId) {
      fetchKeywords();
    }
  }, [marketId]);

  const totalVolume = keywords.reduce((sum, k) => sum + k.count, 0);
  const percentChange = totalVolume > 0 ? Math.floor((totalVolume / 10) * 100) : 0;

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

      {loading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : keywords.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">No trending keywords</div>
      ) : (
        <>
          <div className="flex items-end gap-4 mb-4">
            <div>
              <h4 className="text-3xl font-black text-slate-900 tracking-tight">+{percentChange}%</h4>
              <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest flex items-center gap-0.5">
                <ArrowUpRight size={12} />
                Trending {totalVolume > 15 ? 'High' : 'Moderate'}
              </p>
            </div>
            <div className="h-12 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
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
            {keywords.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors cursor-default">
                <span className="text-xs font-bold text-slate-600 capitalize">{item.keyword}</span>
                <span className="text-xs font-black text-slate-900">{item.count}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
