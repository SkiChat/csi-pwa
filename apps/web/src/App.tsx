import * as React from 'react'
import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom'
import { MarketDetail } from './pages/MarketDetail'
import { supabase } from './lib/supabase'
import MarketList from './components/MarketList'

function App() {
    const [markets, setMarkets] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        async function fetchMarkets() {
            const { data, error } = await supabase
                .from('markets')
                .select('*')
                .limit(20);

            if (!error && data) {
                setMarkets(data);
            }
            setLoading(false);
        }

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

                        <MarketList
                            markets={markets}
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
