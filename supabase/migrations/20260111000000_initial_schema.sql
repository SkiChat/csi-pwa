-- Initial schema for Polymarket Intelligence

-- 1. Entities table (Companies, People, etc.)
CREATE TABLE IF NOT EXISTS public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL UNIQUE,
  type TEXT, -- 'company', 'person', 'product'
  metadata JSONB DEFAULT '{}'
);

-- 2. Entity Data table (CSI/Business information)
CREATE TABLE IF NOT EXISTS public.entity_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data JSONB NOT NULL,
  source TEXT NOT NULL -- 'csi', 'biz-search'
);

-- 3. Market Entities junction table
CREATE TABLE IF NOT EXISTS public.market_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id TEXT NOT NULL, -- Polymarket ID
  entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE,
  relevance_score FLOAT,
  UNIQUE(market_id, entity_id)
);

-- 4. Worker Logs table
CREATE TABLE IF NOT EXISTS public.worker_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  worker_name TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success' or 'failure'
  duration_ms BIGINT,
  error_message TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_worker_logs_name_time ON public.worker_logs(worker_name, created_at DESC);

-- 5. View for stale entities
CREATE OR REPLACE VIEW public.entities_needing_csi_update AS
SELECT e.id, e.name
FROM public.entities e
LEFT JOIN public.entity_data ed ON e.id = ed.entity_id
WHERE
  -- Case 1: The entity has no corresponding data in entity_data
  ed.id IS NULL
  OR
  -- Case 2: The data is older than 7 days
  ed.fetched_at < (NOW() - INTERVAL '7 days');
