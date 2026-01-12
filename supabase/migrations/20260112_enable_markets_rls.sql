-- Enable RLS on the markets table
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow anyone to read markets (for frontend)
CREATE POLICY "Enable read access for all users" 
ON public.markets
FOR SELECT 
USING (true);

-- Policy 2: Allow service role to insert new markets (for Cloudflare Worker)
CREATE POLICY "Enable insert for service role" 
ON public.markets
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- Policy 3: Allow service role to update existing markets (for Cloudflare Worker)
CREATE POLICY "Enable update for service role" 
ON public.markets
FOR UPDATE 
USING (auth.role() = 'service_role');
