import React, { useEffect, useState } from 'react'
import { MarketDetail } from './pages/MarketDetail'
import { supabase } from './lib/supabase'

function App() {
    const [markets, setMarkets] = useState<any[]>([])
    const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchInitialMarket() {
            // Check URL for marketId first (to preserve deep links)
            const params = new URLSearchParams(window.location.search);
            const urlMarketId = params.get('marketId');

            if (urlMarketId) {
                setSelectedMarketId(urlMarketId);
                setLoading(false);
                return;
            }

            // Otherwise fetch the most active markets from Supabase
            const { data, error } = await supabase
                .from('markets')
                .select('*')
                .limit(10);

            if (!error && data && data.length > 0) {
                setMarkets(data);
                setSelectedMarketId(data[0].id.toString());
            }
            setLoading(false);
        }

        fetchInitialMarket();
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

    if (!selectedMarketId) {
        return (
            <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center font-sans p-6 text-center">
                <div className="max-w-md">
                    <h2 className="text-2xl font-black text-slate-900 mb-2">No Markets Available</h2>
                    <p className="text-slate-500 mb-6">We couldn't find any active markets in the database. Please check the ingestion worker status.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="App">
            <MarketDetail marketId={selectedMarketId} />
        </div>
    )
}

export default App
