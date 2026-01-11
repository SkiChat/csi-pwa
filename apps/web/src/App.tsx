import React from 'react'
import { MarketDetail } from './pages/MarketDetail'

function App() {
    // Extract marketId from URL or use default
    const params = new URLSearchParams(window.location.search);
    const marketId = params.get('marketId') || '0xeb27289b5c338f4d4a8e26bc';

    return (
        <div className="App">
            <MarketDetail marketId={marketId} />
        </div>
    )
}

export default App
