/**
 * Ingest Polymarket Worker
 * 
 * Assumptions:
 * 1. Uses Polymarket Gamma API: https://gamma-api.polymarket.com/markets
 * 2. Fetches active markets (active=true, closed=false).
 * 3. outcomePrices[0] is assumed to be 'Yes' and outcomePrices[1] is 'No' for binary markets.
 * 4. API returns an array of market objects with fields: id, question, category, end_date_iso, active, outcomePrices, liquidity, volume, slug.
 */

import { supabase } from '../../packages/utils/supabase';
import { logWorkerRun } from '../../packages/utils/log-worker';

// --- Types ---

interface PolymarketMarket {
    id: string;
    question: string;
    category: string;
    end_date_iso: string;
    active: boolean;
    closed: boolean;
    outcomePrices: string[]; // JSON string array e.g. ["0.5", "0.5"]
    liquidity: string;
    volume: string;
    slug: string;
    groupTags?: string[];
}

interface MarketUpsert {
    id: string;
    title: string;
    category: string;
    resolution_time: string | null;
    status: string;
    tags: string[];
    slug: string;
    metadata: Record<string, unknown>;
}

interface PriceInsert {
    market_id: string;
    yes_price: number | null;
    no_price: number | null;
    liquidity: number;
    volume_24h: number;
}

// --- Constants ---

const POLYMARKET_API_BASE = process.env.POLYMARKET_API_BASE || 'https://gamma-api.polymarket.com';
const FETCH_LIMIT = 100;

// --- Logic ---

async function doIngestPolymarket() {
    console.log('Starting Polymarket ingestion...');

    // 1. Fetch active markets from Polymarket
    const url = `${POLYMARKET_API_BASE}/markets?active=true&closed=false&limit=${FETCH_LIMIT}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch from Polymarket: ${response.statusText}`);
    }

    const rawMarkets: PolymarketMarket[] = await response.json();
    console.log(`Fetched ${rawMarkets.length} markets from Polymarket.`);

    if (rawMarkets.length === 0) {
        return { success: true, count: 0 };
    }

    // 2. Prepare data for Supabase
    const marketsToUpsert: MarketUpsert[] = rawMarkets.map(m => ({
        id: m.id,
        title: m.question,
        category: m.category,
        resolution_time: m.end_date_iso || null,
        status: m.active ? 'active' : 'inactive',
        tags: m.groupTags || [],
        slug: m.slug,
        metadata: {
            original_id: m.id
        }
    }));

    const pricesToInsert: PriceInsert[] = rawMarkets.map(m => {
        // Safely parse prices
        const prices = typeof m.outcomePrices === 'string'
            ? JSON.parse(m.outcomePrices)
            : m.outcomePrices;

        return {
            market_id: m.id,
            yes_price: prices && prices[0] ? parseFloat(prices[0]) : null,
            no_price: prices && prices[1] ? parseFloat(prices[1]) : null,
            liquidity: parseFloat(m.liquidity || '0'),
            volume_24h: parseFloat(m.volume || '0')
        };
    });

    // 3. Perform Supabase operations

    // Upsert Markets
    const { error: marketError } = await supabase
        .from('markets')
        .upsert(marketsToUpsert, { onConflict: 'id' });

    if (marketError) {
        throw new Error(`Error upserting markets: ${marketError.message}`);
    }

    // Insert Prices (historical record)
    const { error: priceError } = await supabase
        .from('market_prices')
        .insert(pricesToInsert);

    if (priceError) {
        throw new Error(`Error inserting market prices: ${priceError.message}`);
    }

    console.log(`Successfully ingested ${marketsToUpsert.length} markets and prices.`);

    return {
        success: true,
        marketsIngested: marketsToUpsert.length,
        pricesRecorded: pricesToInsert.length
    };
}

// --- Handler ---

export async function handler(event: unknown, context: unknown) {
    try {
        const result = await logWorkerRun('ingest-polymarket', doIngestPolymarket, supabase);
        return {
            statusCode: 200,
            body: JSON.stringify(result)
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Worker failed:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: message })
        };
    }
}
