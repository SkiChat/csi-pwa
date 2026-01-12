import { createClient } from '@supabase/supabase-js';
import { logWorkerRun } from "../../../packages/utils/log-worker";

interface Market {
    id: string;
    title: string;
}

interface NewsArticle {
    uuid: string;
    title: string;
    description: string;
    url: string;
    source: string;
    published_at: string;
    snippet: string;
}

/**
 * Basic keyword extraction from market titles
 * Removes common filler words and extracts nouns/entities
 */
function extractKeywords(title: string): string {
    const stopWords = new Set(['will', 'the', 'and', 'for', 'with', 'from', 'this', 'that', 'than', 'into']);
    return title
        .toLowerCase()
        .replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .split(' ')
        .filter(word => word.length > 3 && !stopWords.has(word))
        .slice(0, 3)
        .join(' ');
}

/**
 * Calculate simple relevance score based on keyword frequency in article
 */
function calculateRelevance(title: string, content: string, keywords: string): number {
    const kArray = keywords.toLowerCase().split(' ');
    let matches = 0;
    const searchArea = (title + ' ' + content).toLowerCase();

    kArray.forEach(k => {
        if (searchArea.includes(k)) matches++;
    });

    return matches / kArray.length;
}

async function fetchAndStoreNews(supabase: any, env: any) {
    console.log("Starting news aggregation flow...");

    // 1. Fetch active markets
    const { data: markets, error: marketError } = await supabase
        .from('markets')
        .select('id, title')
        .eq('status', 'active')
        .limit(10); // Process in small batches for stability

    if (marketError) throw marketError;
    if (!markets || markets.length === 0) return { message: "No active markets found." };

    let totalArticlesSaved = 0;

    for (const market of markets) {
        const keywords = extractKeywords(market.title);
        console.log(`Processing market: ${market.title} | Keywords: ${keywords}`);

        const apiUrl = `https://api.thenewsapi.com/v1/news/all?api_token=${env.THENEWSAPI_KEY}&search=${encodeURIComponent(keywords)}` +
            `&language=en&limit=5`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                console.error(`API Error for keywords "${keywords}": ${response.statusText}`);
                continue;
            }

            const payload: any = await response.json();
            const newsItems: NewsArticle[] = payload.data || [];

            for (const item of newsItems) {
                // a. Save to articles table (upsert by external_id)
                const { data: article, error: articleError } = await supabase
                    .from('articles')
                    .upsert({
                        external_id: item.uuid || item.url,
                        title: item.title,
                        url: item.url,
                        source: item.source || "News API",
                        published_at: item.published_at,
                        description: item.description,
                        metadata: { snippet: item.snippet }
                    }, { onConflict: 'external_id' })
                    .select()
                    .single();

                if (articleError) {
                    console.error(`Article upsert failed: ${articleError.message}`);
                    continue;
                }

                // b. Link to market in junction table
                const relevance = calculateRelevance(item.title, item.description, keywords);

                const { error: junctionError } = await supabase
                    .from('market_articles')
                    .upsert({
                        market_id: market.id,
                        article_id: article.id,
                        relevance_score: relevance,
                        sentiment_score: 0, // Placeholder for future LLM processing
                        impact_score: relevance * 10 // Basic impact estimate
                    }, { onConflict: 'market_id, article_id' });

                if (!junctionError) totalArticlesSaved++;
            }
        } catch (err) {
            console.error(`Failed to process news for market ${market.id}:`, err);
        }
    }

    return {
        success: true,
        articles_processed: totalArticlesSaved,
        markets_scanned: markets.length
    };
}

export default {
    async fetch(request: Request, env: any, ctx: any) {
        try {
            const result = await logWorkerRun(
                "fetch-news-articles-manual",
                (supabase) => fetchAndStoreNews(supabase, env),
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

    async scheduled(event: any, env: any, ctx: any) {
        await logWorkerRun(
            "fetch-news-articles-cron",
            (supabase) => fetchAndStoreNews(supabase, env),
            env
        );
    }
};
