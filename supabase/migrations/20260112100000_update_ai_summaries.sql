-- Migration to align ai_summaries with analyst worker and frontend expectations
ALTER TABLE public.ai_summaries 
ADD COLUMN IF NOT EXISTS summary_type TEXT DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS sentiment_score FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS impact_score FLOAT DEFAULT 0;

-- Rename summary_text to content conceptually, but keep the name for compatibility if needed.
-- Or better, keep summary_text as the primary field for the analysis content.

-- Update unique constraint to include summary_type if we want multiple types per day
-- But the user didn't specify that. They just said "summary_type ('analysis')".
