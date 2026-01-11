/**
 * Ingest News Worker
 * 
 * Assumptions:
 * 1. Uses TheNewsAPI (thenewsapi.com) for global news.
 * 2. Fetches news related to active Polymarket questions.
 * 3. Simple keyword-based relevance scoring: matches between query terms and article title.
 * 4. Limits processing to active markets to conserve API credits.
 */

import { supabase } from '../../packages/utils/supabase';
import { logWorkerRun } from '../../packages/utils/log-worker';

// --- Types ---

interface TheNewsAPIArticle {
    uuid: string;
    title: string;
    description: string;
    url: string;
    source: string;
    published_at: string;
    language: string;
    categories: string[];
}

interface TheNewsAPIResponse {
    meta: {
        found: number;
        returned: number;
        limit: number;
        page: number;
    };
    data: TheNewsAPIArticle[];
}

interface ArticleUpsert {
    external_id: string;
    source: string;
    title: string;
    url: string;
    description: string;
    published_at: string;
    raw_payload: any;
}

interface MarketArticleLink {
    market_id: string;
    article_id: string; // Will be set after article upsert
    relevance_score: number;
}

// --- Constants ---

const THENEWSAPI_KEY = process.env.THENEWSAPI_KEY;
const THENEWSAPI_BASE_URL = process.env.THENEWSAPI_BASE_URL || 'https://api.thenewsapi.com/v1/news';
const MARKETS_TO_PROCESS = 10; // Process top 10 active markets per run for POC

// --- Helpers ---

/**
 * Very basic keyword extraction and relevance scoring
 */
function extractKeywords(title: string): string[] {
    return title
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .split(' ')
        .filter(word => word.length > 3) // Filter out small words
        .slice(0, 5); // Take top 5
}

function calculateRelevance(articleTitle: string, keywords: string[]): number {
    const titleLower = articleTitle.toLowerCase();
    const matches = keywords.filter(kw => titleLower.includes(kw));
    return matches.length / keywords.length;
}

// --- Logic ---

async function doIngestNews() {
    if (!THENEWSAPI_KEY) {
        throw new Error('THENEWSAPI_KEY is not defined in environment variables.');
    }

    console.log('Fetching active markets from Supabase...');
    const { data: markets, error: marketError } = await supabase
        .from('markets')
        .select('id, title, tags')
        .eq('status', 'active')
        .limit(MARKETS_TO_PROCESS);

    if (marketError) throw marketError;
    if (!markets || markets.length === 0) {
        console.log('No active markets found to process.');
        return { success: true, message: 'No active markets' };
    }

    let totalArticlesAdded = 0;
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    for (const market of markets) {
        const keywords = extractKeywords(market.title);
        const searchQuery = keywords.join(' ');

        console.log(`Searching news for market: "${market.title}" (Query: ${searchQuery})`);

        const url = new URL(`${THENEWSAPI_BASE_URL}/all`);
        url.searchParams.append('api_token', THENEWSAPI_KEY);
        url.searchParams.append('search', searchQuery);
        url.searchParams.append('language', 'en');
        url.searchParams.append('published_after', twoHoursAgo);
        url.searchParams.append('limit', '3'); // Get top 3 articles per market

        try {
            const response = await fetch(url.toString());
            if (!response.ok) {
                console.error(`API Error for market ${market.id}: ${response.statusText}`);
                continue;
            }

            const newsData: TheNewsAPIResponse = await response.json();

            if (!newsData.data || newsData.data.length === 0) continue;

            for (const apiArt of newsData.data) {
                // 1. Upsert the article itself
                const articleToUpsert: ArticleUpsert = {
                    external_id: apiArt.uuid,
                    source: apiArt.source,
                    title: apiArt.title,
                    url: apiArt.url,
                    description: apiArt.description,
                    published_at: apiArt.published_at,
                    raw_payload: apiArt
                };

                const { data: savedArt, error: artError } = await supabase
                    .from('articles')
                    .upsert(articleToUpsert, { onConflict: 'external_id' })
                    .select('id')
                    .single();

                if (artError) {
                    console.error(`Error saving article ${apiArt.uuid}:`, artError.message);
                    continue;
                }

                // 2. Link article to market
                const relevance = calculateRelevance(apiArt.title, keywords);
                const { error: linkError } = await supabase
                    .from('market_articles')
                    .upsert({
                        market_id: market.id,
                        article_id: savedArt.id,
                        relevance_score: relevance
                    }, { onConflict: 'market_id, article_id' });

                if (linkError) {
                    console.error(`Error linking article to market ${market.id}:`, linkError.message);
                } else {
                    totalArticlesAdded++;
                }
            }
        } catch (err) {
            console.error(`Fetch failed for market ${market.id}:`, err);
        }
    }

    return {
        success: true,
        marketsProcessed: markets.length,
        articlesLinked: totalArticlesAdded
    };
}

// --- Handler ---

export async function handler(event: unknown, context: unknown) {
    try {
        const result = await logWorkerRun('ingest-news', doIngestNews, supabase);
        return {
            statusCode: 200,
            body: JSON.stringify(result)
        };
    } catch (error: any) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: message })
        };
    }
}
