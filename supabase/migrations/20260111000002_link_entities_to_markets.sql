-- Add foreign key from market_entities to markets
-- First, ensure all existing market_ids in market_entities exist in markets (not strictly necessary for a POC but good practice)
-- For now, just add the constraint.

ALTER TABLE public.market_entities
ADD CONSTRAINT fk_market_entities_market
FOREIGN KEY (market_id) REFERENCES public.markets(id) ON DELETE CASCADE;
