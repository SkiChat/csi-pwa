import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PriceChartPanel } from '../components/PriceChartPanel';
import { NewsPanel } from '../components/NewsPanel';
import { CSIPanel } from '../components/CSIPanel';
import { TrendsPanel } from '../components/TrendsPanel';
import { ChevronLeft, Share2, Bookmark, BarChart3, Clock } from 'lucide-react';

interface Market {
    id: string;
    title: string;
    category: string;
    resolution_time: string;
    status: string;
}

interface MarketDetailProps {
    marketId: string;
}

export const MarketDetail: React.FC<MarketDetailProps> = ({ marketId }) => {
    const [market, setMarket] = useState<Market | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchMarket() {
            const { data, error } = await supabase
                .from('markets')
                .select('*')
                .eq('id', marketId)
                .single();

            if (!error && data) {
                setMarket(data);
            }
            setLoading(false);
        }
        fetchMarket();
    }, [marketId]);

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500 font-medium tracking-wide">Assembling Intelligence...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8F9FC] text-slate-900 font-sans">
            {/* Navigation Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ChevronLeft size={20} className="text-slate-600" />
                    </button>

                    <div className="flex items-center gap-3">
                        <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <Share2 size={18} className="text-slate-600" />
                        </button>
                        <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <Bookmark size={18} className="text-slate-600" />
                        </button>
                        <div className="h-8 w-8 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center">
                            <BarChart3 size={16} className="text-white" />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Market Title Section */}
                <section className="mb-10">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-widest">
                            {market?.category || 'General'}
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                            <Clock size={12} />
                            Resolves {market?.resolution_time ? new Date(market.resolution_time).toLocaleDateString() : 'TBD'}
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-[1.1] max-w-4xl">
                        {market?.title || 'Unknown Market'}
                    </h1>
                </section>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Main Intelligence (Price & Sentiment) */}
                    <div className="lg:col-span-8 space-y-8">
                        <PriceChartPanel marketId={marketId} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* We could add more specific panels here or leave as placeholder for now */}
                            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-3xl text-white shadow-xl shadow-indigo-200 overflow-hidden relative group">
                                <div className="relative z-10">
                                    <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mb-2">Alpha Signal</p>
                                    <h4 className="text-2xl font-bold mb-4">Sentiment Shift Detected</h4>
                                    <p className="text-sm text-indigo-50 leading-relaxed mb-6 opacity-90">
                                        Our LLM analysis of latest news suggests a 15% increase in positive sentiment over the last 6 hours.
                                    </p>
                                    <button className="px-6 py-2.5 bg-white text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-colors shadow-sm">
                                        View Deep Analysis
                                    </button>
                                </div>
                                {/* Decorative element */}
                                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                            </div>

                            <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-center">
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Volume Statistics</p>
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <p className="text-2xl font-black text-slate-900">$1.2M</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">24h Volume</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black text-slate-900">$450K</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Liquidity</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Intelligence (Feed & CSI) */}
                    <div className="lg:col-span-4 space-y-8">
                        <TrendsPanel marketId={marketId} />
                        <CSIPanel marketId={marketId} />
                        <NewsPanel marketId={marketId} />
                    </div>
                </div>
            </main>

            {/* Footer Branding */}
            <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-200 mt-20">
                <div className="flex items-center gap-2 opacity-40 grayscale hover:grayscale-0 transition-all cursor-default">
                    <div className="h-6 w-6 bg-slate-900 rounded-lg flex items-center justify-center">
                        <BarChart3 size={12} className="text-white" />
                    </div>
                    <span className="text-sm font-black tracking-tighter uppercase">Polymarket Intelligence v2</span>
                </div>
            </footer>
        </div>
    );
};
