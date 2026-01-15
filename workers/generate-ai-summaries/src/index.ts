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

    // 1. Fetch 10 active markets
    const { data: markets, error: marketError } = await supabase
        .from('markets')
        .select('id, title, category, metadata')
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
        const systemPrompt = "You are a prediction market analyst. Analyze markets concisely. Format: 1) Sentiment (bullish/bearish/neutral), 2) Key factors (2-3 bullet points), 3) Risk level (low/medium/high). Keep under 150 words.";

        const userPrompt = `Market: ${market.title}
Category: ${market.category || "General"}
Recent Articles:
${articles.map(a => `- ${a.title}`).join('\n')}

Provide analysis:`;

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
                    // We expect a structured response, though free models may vary, 
                    // we'll try to extract the components or use the whole text.
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

            let finalMarkdown = "";
            let sentimentScore = 0;
            let impactScore = 0.5;

            try {
                // Attempt to parse as JSON if the model followed instructions
                const parsed = JSON.parse(aiContent);
                finalMarkdown = parsed.analysis_markdown || aiContent;
                sentimentScore = parsed.sentiment_score || 0;
                impactScore = parsed.impact_score || 0.5;
            } catch (e) {
                // Fallback: if not JSON, use the raw text as the summary
                finalMarkdown = aiContent;
                // Simple heuristic for sentiment if fallback
                if (aiContent.toLowerCase().includes('bullish')) sentimentScore = 0.8;
                if (aiContent.toLowerCase().includes('bearish')) sentimentScore = -0.8;
            }

            // 4. Store in ai_summaries
            const { error: insertError } = await supabase
                .from('ai_summaries')
                .upsert({
                    market_id: market.id,
                    summary_date: new Date().toISOString().split('T')[0],
                    summary_text: finalMarkdown,
                    summary_type: 'analysis',
                    sentiment_score: sentimentScore,
                    impact_score: impactScore,
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
