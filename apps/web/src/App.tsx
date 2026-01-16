import * as React from 'react'
import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom'
import { MarketDetail } from './pages/MarketDetail'
import { supabase } from './lib/supabase'
import MarketList from './components/MarketList'

function App() {
    const [markets, setMarkets] = useState<any[]>([])
    const [featuredMarkets, setFeaturedMarkets] = useState<any[]>([])
    const [liveMarkets, setLiveMarkets] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        async function fetchLiveStatus(marketIds: string[]) {
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data } = await supabase
                .from('market_prices')
                .select('market_id')
                .in('market_id', marketIds)
                .gte('timestamp', oneDayAgo);

            if (data) {
                const liveSet = new Set(data.map(d => d.market_id));
                setLiveMarkets(prev => new Set([...prev, ...liveSet]));
            }
        }

        async function fetchFeatured() {
            const { data, error } = await supabase
                .from('markets')
                .select('*')
                .eq('status', 'active')
                .eq('is_featured', true)
                .limit(3);

            if (!error && data) {
                setFeaturedMarkets(data);
                fetchLiveStatus(data.map(m => m.id));
            }
        }

        async function fetchMarkets() {
            const { data, error } = await supabase
                .from('markets')
                .select('*')
                .eq('status', 'active')
                .or('is_featured.is.null,is_featured.eq.false')
                .limit(20);

            if (!error && data) {
                setMarkets(data);
                fetchLiveStatus(data.map(m => m.id));
            }
            setLoading(false);
        }

        fetchFeatured();
        fetchMarkets();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center font-sans">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500 font-medium tracking-wide">Syncing with Intelligence Hub...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="App min-h-screen bg-[#F8F9FC]">
            <Routes>
                <Route path="/" element={
                    <div className="container mx-auto px-4 py-12">
                        <div className="flex items-center gap-3 mb-10">
                            <div className="h-12 w-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                <span className="text-white font-black text-xl">PI</span>
                            </div>
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 leading-none">Polymarket Intelligence</h1>
                                <p className="text-slate-500 font-medium mt-1">Deep Signal Analysis for Prediction Markets</p>
                            </div>
                        </div>

                        {featuredMarkets.length > 0 && (
                            <section className="mb-16">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="h-1 w-8 bg-indigo-600 rounded-full"></div>
                                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Featured Signals</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {featuredMarkets.map((m) => (
                                        <div
                                            key={m.id}
                                            onClick={() => navigate(`/market/${m.id}`)}
                                            className="group cursor-pointer bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200 transition-all duration-500 relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 p-4 flex flex-col items-end gap-2">
                                                <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-[9px] font-black text-white rounded-full tracking-widest uppercase shadow-lg shadow-indigo-200">
                                                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                                    Featured
                                                </span>
                                                {liveMarkets.has(m.id) && (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-[8px] font-bold text-emerald-600 rounded-lg border border-emerald-200/50 uppercase tracking-tighter shadow-sm animate-pulse">
                                                        🟢 Live Prices
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-4">{m.category}</p>
                                            <h3 className="text-xl font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors mb-4 line-clamp-2">
                                                {m.title}
                                            </h3>
                                            <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-100">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Analysis Available</p>
                                                <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <div className="flex items-center gap-2 mb-8 mt-12">
                            <div className="h-1 w-8 bg-slate-200 rounded-full"></div>
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Active Markets</h2>
                        </div>

                        <MarketList
                            markets={markets}
                            liveMarketIds={liveMarkets}
                            selectedId={null}
                            onSelectMarket={(id: string | number) => navigate(`/market/${id}`)}
                        />

                        {markets.length === 0 && (
                            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                                <h2 className="text-xl font-bold text-slate-400">No Markets Available</h2>
                                <p className="text-slate-400 text-sm">Waiting for ingestion workers...</p>
                            </div>
                        )}
                    </div>
                } />
                <Route path="/market/:marketId" element={<MarketDetailWrapper />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    )
}

/**
 * Small wrapper to handle extraction of marketId from URL params
 * while preserving the MarketDetail component's prop structure
 */
function MarketDetailWrapper() {
    const { marketId } = useParams<{ marketId: string }>();
    const navigate = useNavigate();

    if (!marketId) return <Navigate to="/" replace />;

    return (
        <div>
            <div className="bg-white border-b border-slate-200/60 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Signals
                    </button>
                    <div className="ml-auto flex items-center gap-2">
                        <div className="h-6 w-6 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                            <span className="text-white font-black text-[10px]">PI</span>
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Intelligence Portal</span>
                    </div>
                </div>
            </div>
            <MarketDetail marketId={marketId} />
        </div>
    );
}

export default App
