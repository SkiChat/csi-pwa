-- 8. Articles table
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  external_id TEXT UNIQUE NOT NULL, -- TheNewsAPI UUID or URL
  source TEXT,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  raw_payload JSONB DEFAULT '{}'
);

-- 9. Market Articles junction table
CREATE TABLE IF NOT EXISTS public.market_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  market_id TEXT REFERENCES public.markets(id) ON DELETE CASCADE,
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
  relevance_score FLOAT DEFAULT 0,
  sentiment_score FLOAT, -- Placeholder for AI processing
  impact_score FLOAT,    -- Placeholder for AI processing
  UNIQUE(market_id, article_id)
);

-- Index for searching articles by market
CREATE INDEX IF NOT EXISTS idx_market_articles_market_id ON public.market_articles(market_id);
