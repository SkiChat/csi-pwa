-- Add is_featured column to markets table
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_markets_is_featured ON public.markets(is_featured) WHERE is_featured = true;
