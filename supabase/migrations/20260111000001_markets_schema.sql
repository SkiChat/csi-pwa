-- 6. Markets table
CREATE TABLE IF NOT EXISTS public.markets (
  id TEXT PRIMARY KEY, -- maps to polymarket_id
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT NOT NULL,
  category TEXT,
  resolution_time TIMESTAMP WITH TIME ZONE,
  status TEXT, -- 'active', 'closed'
  tags TEXT[],
  slug TEXT,
  metadata JSONB DEFAULT '{}'
);

-- 7. Market Prices table (time-series)
CREATE TABLE IF NOT EXISTS public.market_prices (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  market_id TEXT REFERENCES public.markets(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  yes_price FLOAT,
  no_price FLOAT,
  liquidity FLOAT,
  volume_24h FLOAT,
  metadata JSONB DEFAULT '{}'
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_market_prices_market_id_timestamp ON public.market_prices(market_id, timestamp DESC);
