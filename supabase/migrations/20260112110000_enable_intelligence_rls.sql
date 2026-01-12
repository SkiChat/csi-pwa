-- Enable RLS and define policies for intelligence tables

-- 1. market_prices
ALTER TABLE public.market_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for market_prices" ON public.market_prices FOR SELECT USING (true);
CREATE POLICY "Service role write access for market_prices" ON public.market_prices FOR ALL USING (auth.role() = 'service_role');

-- 2. articles
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for articles" ON public.articles FOR SELECT USING (true);
CREATE POLICY "Service role write access for articles" ON public.articles FOR ALL USING (auth.role() = 'service_role');

-- 3. market_articles
ALTER TABLE public.market_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for market_articles" ON public.market_articles FOR SELECT USING (true);
CREATE POLICY "Service role write access for market_articles" ON public.market_articles FOR ALL USING (auth.role() = 'service_role');

-- 4. ai_summaries
ALTER TABLE public.ai_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for ai_summaries" ON public.ai_summaries FOR SELECT USING (true);
CREATE POLICY "Service role write access for ai_summaries" ON public.ai_summaries FOR ALL USING (auth.role() = 'service_role');

-- 5. entities
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for entities" ON public.entities FOR SELECT USING (true);
CREATE POLICY "Service role write access for entities" ON public.entities FOR ALL USING (auth.role() = 'service_role');

-- 6. market_entities
ALTER TABLE public.market_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for market_entities" ON public.market_entities FOR SELECT USING (true);
CREATE POLICY "Service role write access for market_entities" ON public.market_entities FOR ALL USING (auth.role() = 'service_role');
