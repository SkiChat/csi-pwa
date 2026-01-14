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
  console.log("[INFO] Starting fetch-news-articles worker...");

  // 1. Fetch active markets
  const { data: markets, error: marketError } = await supabase
    .from('markets')
    .select('id, title')
    .eq('status', 'active')
    .limit(10); // Process in small batches for stability

  if (marketError) {
    console.error("[ERROR] Failed to fetch markets:", marketError);
    throw marketError;
  }

  if (!markets || markets.length === 0) {
    console.log("[INFO] No active markets found.");
    return { message: "No active markets found." };
  }

  console.log(`[INFO] Found ${markets.length} active markets to process.`);

  let totalArticlesSaved = 0;

  for (const market of markets) {
    try {
      const keywords = extractKeywords(market.title);
      console.log(`[INFO] Market ${market.id} (${market.title}): Extracted keywords: "${keywords}"`);

      const apiUrl = `https://api.thenewsapi.com/v1/news/all?api_token=${env.THENEWSAPI_KEY}&search=${encodeURIComponent(keywords)}` +
        `&language=en&limit=5`;
      
      console.log(`[INFO] Market ${market.id}: Calling TheNewsAPI with keywords: "${keywords}"`);

      const response = await fetch(apiUrl);

      if (!response.ok) {
        console.error(`[ERROR] Market ${market.id}: API returned status ${response.status}: ${response.statusText}`);
        continue;
      }

      const payload: any = await response.json();
      console.log(`[INFO] Market ${market.id}: TheNewsAPI Response:`, JSON.stringify(payload).substring(0, 200));

      const newsItems: NewsArticle[] = payload.data || [];
      console.log(`[INFO] Market ${market.id}: Received ${newsItems.length} articles from TheNewsAPI.`);

      if (newsItems.length === 0) {
        console.log(`[WARN] Market ${market.id}: No articles returned for keywords "${keywords}"`);
        continue;
      }

      for (const item of newsItems) {
        console.log(`[DEBUG] Market ${market.id}: Processing article: "${item.title}"`);

        // a. Save to articles table (upsert by external_id)
        const articleData = {
          external_id: item.uuid || item.url,
          title: item.title,
          url: item.url,
          source: item.source || "News API",
          published_at: item.published_at,
          description: item.description,
          metadata: { snippet: item.snippet }
        };

        console.log(`[DEBUG] Market ${market.id}: Upserting article with external_id: ${articleData.external_id}`);

        const { data: article, error: articleError } = await supabase
          .from('articles')
          .upsert(articleData, { onConflict: 'external_id' })
          .select()
          .single();

        if (articleError) {
          console.error(`[ERROR] Market ${market.id}: Article upsert failed for "${item.title}":`, articleError);
          continue;
        }

        console.log(`[SUCCESS] Market ${market.id}: Article saved with ID: ${article.id}`);

        // b. Link to market in junction table
        const relevance = calculateRelevance(item.title, item.description, keywords);
        console.log(`[DEBUG] Market ${market.id}: Calculated relevance score: ${relevance}`);

        const { error: junctionError } = await supabase
          .from('market_articles')
          .upsert({
            market_id: market.id,
            article_id: article.id,
            relevance_score: relevance,
            sentiment_score: 0, // Placeholder for future LLM processing
            impact_score: relevance * 10 // Basic impact estimate
          }, { onConflict: 'market_id, article_id' });

        if (junctionError) {
          console.error(`[ERROR] Market ${market.id}: Junction table insert failed:`, junctionError);
        } else {
          console.log(`[SUCCESS] Market ${market.id}: Article linked to market.`);
          totalArticlesSaved++;
        }
      }
    } catch (err) {
      console.error(`[FATAL] Market ${market.id}: Unexpected error:`, err);
    }
  }

  console.log(`[INFO] ===== WORKER COMPLETED ===== Total articles saved: ${totalArticlesSaved}`);

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
