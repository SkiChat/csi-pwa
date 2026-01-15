import { logWorkerRun } from "../../../packages/utils/log-worker";

interface GammaMarket {
    id: string;
    question: string;
    category?: string;
    description?: string;
    active?: boolean;
    closed?: boolean;
    archived?: boolean;
    slug?: string;
    icon?: string;
    image?: string;
    groupItemTitle?: string;
    volume?: string | number;
    liquidity?: string | number;
    volume24hr?: string | number;
}

async function fetchPolymarketData(supabase: any) 

  // Featured market IDs to highlight
  const FEATURED_MARKET_IDS = [
          '0x7695a430e8c142b2209c5b63b9c8dca6ded6fb69',
          '0xdd22472d908412f1d94c01730a3231bf43fd2b40',
          '0x0180b84c95d234a2b4c0b49fafc5a2005f27b0a6',
          '0xa88e0d50983ba60b8f59919ce61f6c6bd23e1f8d',
          '0xb663f5e790064fea31ca5259b2c45ffd8bb6e18d'
        ];{
    console.log("Fetching markets from Polymarket Gamma API...");

    const response = await fetch("https://gamma-api.polymarket.com/markets?closed=false&active=true&order=-volume24hr&limit=100", {
        headers: {
            "Accept": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch Gamma markets: ${response.statusText}`);
    }

    const markets: GammaMarket[] = await response.json();
    console.log(`Received ${markets.length} markets.`);

    // Map Gamma fields to our schema
    const upsertData = markets.map(market => ({
        id: market.id,
        title: market.question,
        category: market.category || "General",
        status: market.closed ? "closed" : (market.active ? "active" : "inactive"),
        slug: market.slug || market.id,
            is_featured: FEATURED_MARKET_IDS.includes(market.id),
        metadata: {
            description: market.description,
            icon: market.icon,
            image: market.image,
            groupItemTitle: market.groupItemTitle,
            volume: market.volume,
            liquidity: market.liquidity,
            volumeChange24hr: market.volume24hr // Using volume24hr as requested volumeChange24hr
        }
    }));

    // Process in batches to avoid payload limits if necessary, though 100-200 is fine
    const { error } = await supabase
        .from("markets")
        .upsert(upsertData, {
            onConflict: "id",
        });

    if (error) {
        throw new Error(`Supabase upsert failed: ${error.message}`);
    }

    return {
        success: true,
        count: markets.length,
        timestamp: new Date().toISOString()
    };
}

export default {
    async fetch(request: Request, env: any, ctx: any) {
        try {
            const result = await logWorkerRun(
                "fetch-polymarket-markets",
                (supabase) => fetchPolymarketData(supabase),
                env
            );

            return new Response(JSON.stringify(result), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        } catch (error: any) {
            return new Response(JSON.stringify({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    },

    async scheduled(event: any, env: any, ctx: any) {
        // Scheduled triggers also use the logger
        await logWorkerRun(
            "fetch-polymarket-markets-cron",
            (supabase) => fetchPolymarketData(supabase),
            env
        );
    }
};
