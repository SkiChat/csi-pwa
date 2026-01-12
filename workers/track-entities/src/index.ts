import { logWorkerRun } from "../../../packages/utils/log-worker";

interface Article {
    id: string;
    title: string;
    description: string;
}

interface Entity {
    name: string;
    type: string;
    confidence: number;
}

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function trackAndEnrichEntities(supabase: any, env: any) {
    console.log("Starting Entity Tracking Lifecycle...");

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 1. Fetch new articles from last 24h
    const { data: articles, error: articleError } = await supabase
        .from('articles')
        .select('id, title, description')
        .gt('created_at', yesterday)
        .limit(10); // Process in manageable batches

    if (articleError) throw articleError;

    let entitiesCreated = 0;
    let linksCreated = 0;

    // 2. Extract and Upsert Entities
    for (const article of articles || []) {
        console.log(`Extracting entities from: ${article.title}`);

        try {
            await delay(1000);
            const prompt = `
                Extract named entities (people, organizations, events) from this text:
                Title: ${article.title}
                Content: ${article.description}

                Return JSON array: [{ "name": "...", "type": "person|organization|event", "confidence": 0.9 }]
            `;

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "openai/gpt-3.5-turbo",
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) continue;

            const aiPayload: any = await response.json();
            const extracted: Entity[] = JSON.parse(aiPayload.choices[0].message.content).entities || [];

            for (const ent of extracted) {
                // a. Upsert Entity
                const { data: entity, error: entError } = await supabase
                    .from('entities')
                    .upsert({
                        name: ent.name,
                        type: ent.type,
                        metadata: { confidence: ent.confidence, source_article: article.id }
                    }, { onConflict: 'name' })
                    .select()
                    .single();

                if (entError) continue;
                entitiesCreated++;

                // b. Link to Markets associated with this article
                const { data: marketLinks } = await supabase
                    .from('market_articles')
                    .select('market_id, relevance_score')
                    .eq('article_id', article.id);

                for (const link of marketLinks || []) {
                    const { error: mEntError } = await supabase
                        .from('market_entities')
                        .upsert({
                            market_id: link.market_id,
                            entity_id: entity.id,
                            relevance_score: link.relevance_score
                        }, { onConflict: 'market_id, entity_id' });

                    if (!mEntError) linksCreated++;
                }
            }
        } catch (err) {
            console.error(`Failed to process article ${article.id}:`, err);
        }
    }

    // 3. Enrich Priority Entities (Entities needing context)
    console.log("Checking for entities needing context enrichment...");
    const { data: priorityEntities } = await supabase
        .from('entities_needing_csi_update')
        .select('*')
        .limit(3);

    let enrichmentsMade = 0;

    for (const target of priorityEntities || []) {
        try {
            console.log(`Enriching entity: ${target.name}`);
            await delay(2000);

            // Fetch recent news for this specific entity
            const newsApiUrl = `https://api.thenewsapi.com/v1/news/all?api_token=${env.THENEWSAPI_KEY}&search=${encodeURIComponent(target.name)}&limit=3`;
            const newsRes = await fetch(newsApiUrl);

            if (!newsRes.ok) continue;

            const newsData: any = await newsRes.json();
            const newsContext = newsData.data?.map((d: any) => `${d.title}: ${d.description}`).join('\n') || "No data.";

            // Use AI to generate a contextual briefing
            const briefingPrompt = `Provide a professional 2-sentence background briefing for: ${target.name}. Based on these recent news: ${newsContext}`;
            const briefingRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "openai/gpt-3.5-turbo",
                    messages: [{ role: "user", content: briefingPrompt }]
                })
            });

            if (!briefingRes.ok) continue;

            const aiBriefing: any = await briefingRes.json();
            const summary = aiBriefing.choices[0].message.content;

            // Store enrichment data
            await supabase.from('entity_data').insert({
                entity_id: target.id,
                source: 'intelligence-enrichment',
                data: {
                    summary,
                    last_news_check: new Date().toISOString(),
                    sources_analyzed: newsData.data?.length || 0
                }
            });
            enrichmentsMade++;

        } catch (err) {
            console.error(`Failed enrichment for ${target.name}:`, err);
        }
    }

    return {
        success: true,
        lifecycle_stats: {
            articles_indexed: articles?.length || 0,
            entities_mapped: entitiesCreated,
            market_links: linksCreated,
            enrichments: enrichmentsMade
        }
    };
}

export default {
    async fetch(request: Request, env: any, ctx: any) {
        try {
            const result = await logWorkerRun(
                "track-entities-manual",
                (supabase) => trackAndEnrichEntities(supabase, env),
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
            "track-entities-cron",
            (supabase) => trackAndEnrichEntities(supabase, env),
            env
        );
    }
};
