-- Fix partner data with proper unique constraint handling
INSERT INTO public.company_partners (name, logo_url, website_url, display_order) 
SELECT name, logo_url, website_url, display_order 
FROM (VALUES
  ('John Deere', '/api/placeholder/120/60', 'https://johndeere.com', 1),
  ('Case IH', '/api/placeholder/120/60', 'https://caseih.com', 2),
  ('New Holland', '/api/placeholder/120/60', 'https://newholland.com', 3),
  ('Kubota', '/api/placeholder/120/60', 'https://kubota.com', 4),
  ('Massey Ferguson', '/api/placeholder/120/60', 'https://masseyferguson.com', 5)
) AS v(name, logo_url, website_url, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_partners cp WHERE cp.name = v.name
);