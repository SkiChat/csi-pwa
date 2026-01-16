import { logWorkerRun } from "../../../packages/utils/log-worker";

interface Market {
    id: string;
    title: string;
    metadata: any;
}

/**
 * Utility to enforce rate limits when calling external APIs
 */
async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateDeepAnalysis(supabase: any, env: any) {
    console.log("Commencing Advanced Market Analysis with DeepSeek V3...");

    // 1. Fetch 10 active markets that have article
    const { data: markets, error: marketError } = await supabase
        .from('markets')
        .select(`
      id, 
      title, 
      category, 
      metadata,
      market_articles!inner(market_id)
    `)
        .eq('status', 'active')
        .limit(10);

    if (marketError) throw marketError;
    if (!markets || markets.length === 0) return { message: "No active markets found." };
    console.log(`✓ Found ${markets.length} active markets`);

    let analysesCreated = 0;

    for (const market of markets) {
        console.log(`\n→ Processing market: ${market.title} (${market.id})`);
        // 2. Gather Context: News
        const { data: newsItems, error: newsError } = await supabase
            .from('market_articles')
            .select('articles(title, description, source)')
            .eq('market_id', market.id)
            .limit(3);

        console.log(`  Found ${newsItems?.length || 0} articles for market ${market.id}`);
        if (newsError) {
            console.error(`  Error fetching articles:`, newsError);
        }

        const articles = (newsItems || []).map((ni: any) => ({
            title: ni.articles.title,
            description: ni.articles.description,
            source: ni.articles.source
        }));

        // 3. Construct Prompts
        const systemPrompt = `You are a prediction market analyst. Analyze the provided market context and news to generate a concise intelligence summary.
        
        You MUST return a JSON object with this exact structure:
        {
          "summary": "1-2 paragraph analysis of the market",
          "confidence_score": 0.0 to 1.0 (float reflecting your certainty),
          "sentiment": "bullish" | "bearish" | "neutral"
        }
        
        Keep the summary under 150 words. Focus on the most impactful recent drivers.`;

        const userPrompt = `Market: ${market.title}
Category: ${market.category || "General"}
Recent Articles:
${articles.map((a: any) => `- ${a.title}: ${a.description}`).join('\n')}

Generate Analysis:`;

        console.log(`  Calling OpenRouter API for market ${market.id}...`);
        try {
            await delay(1200); // Respect rate limits

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://csi-pwa.pages.dev",
                    "X-Title": "Polymarket Intelligence Analyst"
                },
                body: JSON.stringify({
                    model: "deepseek/deepseek-v3:free",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    response_format: { type: "json_object" }
                })
            });
            console.log(`  API Response status: ${response.status} ${response.ok ? '✓' : '✗'}`);

            if (!response.ok) {
                console.error(`OpenRouter error for ${market.id}: ${response.statusText}`);
                continue;
            }

            const aiPayload: any = await response.json();
            const aiContent = aiPayload.choices[0].message.content;

            let parsed: any = {};
            try {
                parsed = JSON.parse(aiContent);
            } catch (e) {
                console.warn(`  ✗ Failed to parse JSON content for ${market.id}`);
                continue;
            }

            // 4. Store in ai_summaries
            const { error: insertError } = await supabase
                .from('ai_summaries')
                .upsert({
                    market_id: market.id,
                    summary_date: new Date().toISOString().split('T')[0],
                    summary: parsed.summary,
                    summary_text: parsed.summary, // Keep legacy field for compatibility
                    confidence_score: parsed.confidence_score || 0.5,
                    sentiment: parsed.sentiment || 'neutral',
                    summary_type: 'analysis',
                    sentiment_score: parsed.sentiment === 'bullish' ? 0.8 : (parsed.sentiment === 'bearish' ? -0.8 : 0),
                    metadata: {
                        model: "deepseek/deepseek-v3:free",
                        cost: 0,
                        prompt_tokens: aiPayload.usage?.prompt_tokens,
                        completion_tokens: aiPayload.usage?.completion_tokens,
                        timestamp: new Date().toISOString()
                    }
                }, { onConflict: 'market_id, summary_date' });

            if (insertError) {
                console.error(`  ✗ Failed to insert summary for market ${market.id}:`, insertError);
            } else {
                console.log(`  ✓ Successfully inserted summary for market ${market.id}`);
            }

            if (!insertError) analysesCreated++;

        } catch (err) {
            console.error(`Failed analyst loop for ${market.id}:`, err);
        }
    }

    console.log(`\n✓ Completed processing ${markets.length} markets. Summaries created: ${analysesCreated}`);

    return {
        success: true,
        summaries_created: analysesCreated,
        markets_processed: markets.length
    };
}

export default {
    async fetch(request: Request, env: any, ctx: any) {
        try {
            const result = await logWorkerRun(
                "generate-ai-summaries-analyst-manual",
                (supabase) => generateDeepAnalysis(supabase, env),
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
            "generate-ai-summaries-analyst-cron",
            (supabase) => generateDeepAnalysis(supabase, env),
            env
        );
    }
};
