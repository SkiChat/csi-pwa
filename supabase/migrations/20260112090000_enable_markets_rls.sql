-- Enable Row Level Security on public.markets table
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;

-- 1. Enable read access for all users (anonymous and authenticated)
CREATE POLICY "Enable read access for all users" ON public.markets
FOR SELECT USING (auth.role() = 'anon' OR auth.role() = 'authenticated');

-- 2. Enable insert for service role only
CREATE POLICY "Enable insert for service role" ON public.markets
FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- 3. Enable update for service role only
CREATE POLICY "Enable update for service role" ON public.markets
FOR UPDATE USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
