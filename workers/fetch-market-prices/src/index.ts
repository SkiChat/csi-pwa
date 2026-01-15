import { logWorkerRun } from "../../../packages/utils/log-worker";

/**
 * Fetch and store the latest prices for all active markets.
 * Uses the Polymarket Gamma API for efficient bulk data retrieval.
 */
async function fetchAndStorePrices(supabase: any, env: any) {
    console.log("[INFO] Starting price update cycle...");

    // 1. Fetch active markets from database
    const { data: markets, error: marketError } = await supabase
        .from('markets')
        .select('id')
        .eq('status', 'active');

    if (marketError) {
        console.error("[ERROR] Failed to fetch active markets:", marketError);
        throw marketError;
    }

    if (!markets || markets.length === 0) {
        console.log("[INFO] No active markets found for price update.");
        return { message: "No active markets found." };
    }

    const marketIds: string[] = markets.map((m: any) => m.id);
    console.log(`[INFO] Updating prices for ${marketIds.length} markets.`);

    // 2. Process in batches of 50 (Polymarket Gamma API limit/safety)
    const batchSize = 50;
    let totalUpdated = 0;

    for (let i = 0; i < marketIds.length; i += batchSize) {
        const batch = marketIds.slice(i, i + batchSize);
        const queryParams = batch.map((id: string) => `id=${id}`).join('&');

        try {
            const response = await fetch(`https://gamma-api.polymarket.com/markets?${queryParams}`);
            if (!response.ok) {
                console.error(`[ERROR] Gamma API failed for batch starting at index ${i}: ${response.statusText}`);
                continue;
            }

            const gammaMarkets: any[] = await response.json();

            const priceInserts = gammaMarkets.map(m => {
                // outcomePrices is consistently ["YES_PRICE", "NO_PRICE"]
                let yesPrice = 0;
                let noPrice = 0;

                try {
                    const prices = typeof m.outcomePrices === 'string'
                        ? JSON.parse(m.outcomePrices)
                        : m.outcomePrices;

                    if (Array.isArray(prices)) {
                        yesPrice = parseFloat(prices[0] || "0");
                        noPrice = parseFloat(prices[1] || "0");
                    }
                } catch (e) {
                    console.warn(`[WARN] Failed to parse prices for market ${m.id}`);
                }

                return {
                    market_id: m.id,
                    yes_price: yesPrice,
                    no_price: noPrice,
                    liquidity: parseFloat(m.liquidity || "0"),
                    volume_24h: parseFloat(m.volume24hr || "0"),
                    timestamp: new Date().toISOString()
                };
            });

            // 3. Batch insert into market_prices
            const { error: insertError } = await supabase
                .from('market_prices')
                .insert(priceInserts);

            if (insertError) {
                console.error(`[ERROR] Supabase insert failed: ${insertError.message}`);
            } else {
                totalUpdated += priceInserts.length;
            }
        } catch (err) {
            console.error(`[ERROR] Batch processing error:`, err);
        }
    }

    console.log(`[INFO] Completed price update. Total records stored: ${totalUpdated}`);
    return {
        success: true,
        updated_count: totalUpdated
    };
}

export default {
    /**
     * Handle manual triggers via HTTP
     */
    async fetch(request: Request, env: any, ctx: any) {
        try {
            const result = await logWorkerRun(
                "fetch-market-prices-manual",
                (supabase) => fetchAndStorePrices(supabase, env),
                env
            );
            return new Response(JSON.stringify(result), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        } catch (error: any) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    },

    /**
     * Handle CRON triggers (every 30 mins per wrangler.toml)
     */
    async scheduled(event: any, env: any, ctx: any) {
        await logWorkerRun(
            "fetch-market-prices-cron",
            (supabase) => fetchAndStorePrices(supabase, env),
            env
        );
    }
};
