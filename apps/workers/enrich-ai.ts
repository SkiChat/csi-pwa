/**
 * Enrich AI Worker
 * 
 * Objectives:
 * 1. Process recent market_articles that lack sentiment/impact scores.
 * 2. Use LLM to classify sentiment and intensity (score).
 * 3. Calculate impact_score = (relevance * sentiment_intensity) / (time_decay).
 * 4. Generate/Update daily AI summaries for active markets.
 * 
 * Assumptions:
 * - Uses the rate-limited LLM client for sentiment analysis.
 * - Processes articles from the last 24 hours.
 */

import { supabase } from '../../packages/utils/supabase';
import { logWorkerRun } from '../../packages/utils/log-worker';
import { classifySentiment, generateSummary } from '../../packages/llm/client';

// --- Types ---

interface ArticleToEnrich {
    id: string; // market_articles.id
    article_id: string;
    market_id: string;
    title: string;
    description: string;
    relevance_score: number;
    published_at: string;
}

// --- Constants ---

const ENRICH_BATCH_SIZE = 50;
const SUMMARY_BATCH_SIZE = 5;

// --- Logic ---

async function doEnrichAI() {
    console.log('Starting AI enrichment process...');

    // 1. Fetch articles needing sentiment analysis
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Joint query: market_articles -> articles
    const { data: items, error: fetchError } = await supabase
        .from('market_articles')
        .select(`
            id,
            relevance_score,
            market_id,
            article_id,
            articles (
                title,
                description,
                published_at
            )
        `)
        .is('sentiment_score', null)
        .gt('articles.published_at', yesterday)
        .limit(ENRICH_BATCH_SIZE);

    if (fetchError) throw fetchError;

    const typedItems = (items || []) as unknown as any[];
    console.log(`Found ${typedItems.length} articles to enrich.`);

    for (const item of typedItems) {
        const article = item.articles;
        if (!article) continue;

        const textToAnalyze = `${article.title}. ${article.description || ''}`;

        try {
            // 2. Classify sentiment
            const { sentiment, score: intensity } = await classifySentiment(textToAnalyze);

            // 3. Calculate impact score
            // Heuristic: relevance * intensity (normalized) 
            // We can also add time decay here if wanted
            const sentimentScore = sentiment === 'negative' ? -intensity : (sentiment === 'positive' ? intensity : 0);
            const impactScore = Math.abs(item.relevance_score * sentimentScore);

            // 4. Update market_articles
            await supabase
                .from('market_articles')
                .update({
                    sentiment_score: sentimentScore,
                    impact_score: impactScore,
                    metadata: {
                        llm_label: sentiment,
                        analyzed_at: new Date().toISOString()
                    }
                })
                .eq('id', item.id);

        } catch (err) {
            console.error(`Failed to analyze sentiment for item ${item.id}:`, err);
        }
    }

    // 5. Bonus: Generate market summaries for the day
    await generateDailySummaries();

    return {
        success: true,
        articlesEnriched: typedItems.length
    };
}

async function generateDailySummaries() {
    console.log('Generating daily summaries...');

    // Get top markets with most recent articles
    const { data: markets, error } = await supabase
        .from('markets')
        .select('id, title')
        .eq('status', 'active')
        .limit(SUMMARY_BATCH_SIZE);

    if (error || !markets) return;

    for (const market of markets) {
        // Fetch top 5 articles for this market today
        const { data: articles, error: artError } = await supabase
            .from('market_articles')
            .select('articles(title, description)')
            .eq('market_id', market.id)
            .order('relevance_score', { ascending: false })
            .limit(5);

        if (artError || !articles || articles.length === 0) continue;

        const combinedText = articles
            .map((a: any) => `- ${a.articles.title}: ${a.articles.description || ''}`)
            .join('\n');

        const summaryPrompt = `Based on these news headlines for the market "${market.title}", summarize the current market sentiment and key drivers:\n\n${combinedText}`;

        try {
            const summary = await generateSummary(summaryPrompt);
            const today = new Date().toISOString().split('T')[0];

            await supabase
                .from('ai_summaries')
                .upsert({
                    market_id: market.id,
                    summary_date: today,
                    summary_text: summary,
                    metadata: { source: 'enrich-ai-worker' }
                }, { onConflict: 'market_id, summary_date' });
        } catch (err) {
            console.error(`Failed to generate summary for market ${market.id}:`, err);
        }
    }
}

// --- Handler ---

export async function handler(event: unknown, context: unknown) {
    try {
        const result = await logWorkerRun('enrich-ai', doEnrichAI, supabase);
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
