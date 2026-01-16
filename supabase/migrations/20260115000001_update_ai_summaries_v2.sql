-- Add new columns to ai_summaries for better analysis data
ALTER TABLE public.ai_summaries 
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS confidence_score FLOAT,
ADD COLUMN IF NOT EXISTS sentiment TEXT;

-- Migration to sync summary_text with summary if needed
UPDATE public.ai_summaries SET summary = summary_text WHERE summary IS NULL;
