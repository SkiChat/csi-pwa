-- 11. Trend Data table (Google Trends indicators)
CREATE TABLE IF NOT EXISTS public.trend_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  market_id TEXT REFERENCES public.markets(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  interest_score INTEGER NOT NULL, -- 0-100 scale from Google Trends
  metadata JSONB DEFAULT '{}'
);

-- Index for querying trends by market and recent history
CREATE INDEX IF NOT EXISTS idx_trend_data_market_time ON public.trend_data(market_id, timestamp DESC);
-- Unique constraint to prevent duplicate data points for same keyword/timestamp
CREATE UNIQUE INDEX IF NOT EXISTS idx_trend_data_unique ON public.trend_data(market_id, keyword, timestamp);
