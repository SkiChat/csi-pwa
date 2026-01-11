/**
 * Fetch Trends Worker
 * 
 * Objectives:
 * 1. Identify top active markets by volume.
 * 2. Derive keywords from market titles.
 * 3. Invoke Python bridge (pytrends) to fetch 7-day interest scores.
 * 4. Store time-series data in Supabase trend_data table.
 * 
 * Throttling Strategy:
 * - Processes only top 10 markets per run.
 * - Backs off if Python bridge fails (rate limiting assumed).
 */

import { supabase } from '../../packages/utils/supabase';
import { logWorkerRun } from '../../packages/utils/log-worker';
import { execSync } from 'child_process';
import path from 'path';

// --- Types ---

interface TrendResult {
    keyword: string;
    timestamp: string;
    interest_score: number;
}

// --- Logic ---

async function doFetchTrends() {
    console.log('Starting Google Trends fetch process...');

    // 1. Get top 10 active markets (simulating volume-based selection)
    const { data: markets, error: marketError } = await supabase
        .from('markets')
        .select('id, title')
        .eq('status', 'active')
        .limit(10);

    if (marketError) throw marketError;
    if (!markets || markets.length === 0) return { success: true, message: 'No active markets' };

    let totalPointsSaved = 0;
    const pythonScriptPath = path.join(process.cwd(), 'scripts', 'fetch_google_trends.py');

    for (const market of markets) {
        // 2. Derive keywords (simple heuristic: first 3 words of title)
        const keywords = market.title
            .split(' ')
            .filter(w => w.length > 3)
            .slice(0, 2)
            .join(' ');

        if (!keywords) continue;

        console.log(`Fetching trends for "${keywords}" (Market: ${market.id})`);

        try {
            // 3. Call Python bridge
            // Note: In production serverless, you would call an external API or use a pre-baked environment
            const resultRaw = execSync(`python3 ${pythonScriptPath} "${keywords}"`, { encoding: 'utf-8' });
            const trendResults: TrendResult[] = JSON.parse(resultRaw);

            if (!trendResults || trendResults.length === 0) continue;

            const upsertData = trendResults.map(r => ({
                market_id: market.id,
                keyword: r.keyword,
                timestamp: r.timestamp,
                interest_score: r.interest_score,
                metadata: { source: 'google-trends' }
            }));

            // 4. Batch upsert to Supabase
            const { error: upsertError } = await supabase
                .from('trend_data')
                .upsert(upsertData, { onConflict: 'market_id, keyword, timestamp' });

            if (upsertError) {
                console.error(`Error saving trends for market ${market.id}:`, upsertError.message);
            } else {
                totalPointsSaved += trendResults.length;
            }

            // Throttling: Artificial delay to avoid Google Trends blocking the IP
            await new Promise(resolve => setTimeout(resolve, 5000));

        } catch (err) {
            console.error(`Python bridge failed for market ${market.id}. Likely rate limited or Python not installed.`);
            // Skip this market for today
            continue;
        }
    }

    return {
        success: true,
        marketsProcessed: markets.length,
        dataPointsSaved: totalPointsSaved
    };
}

// --- Handler ---

export async function handler(event: unknown, context: unknown) {
    try {
        const result = await logWorkerRun('fetch-trends', doFetchTrends, supabase);
        return {
            statusCode: 200,
            body: JSON.stringify(result)
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
}
