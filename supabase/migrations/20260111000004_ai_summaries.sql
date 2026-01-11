-- 10. AI Summaries table
CREATE TABLE IF NOT EXISTS public.ai_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  market_id TEXT REFERENCES public.markets(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL DEFAULT CURRENT_DATE,
  summary_text TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  UNIQUE(market_id, summary_date)
);

-- Index for searching summaries by market and date
CREATE INDEX IF NOT EXISTS idx_ai_summaries_market_date ON public.ai_summaries(market_id, summary_date DESC);
