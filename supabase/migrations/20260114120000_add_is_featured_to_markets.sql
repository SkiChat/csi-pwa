-- Add is_featured column to markets table
ALTER TABLE markets ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- Add comment to explain the column
COMMENT ON COLUMN markets.is_featured IS 'Indicates whether this market should be highlighted/featured in the UI';

-- Create index for better query performance when filtering featured markets
CREATE INDEX IF NOT EXISTS idx_markets_is_featured ON markets(is_featured) WHERE is_featured = TRUE;
