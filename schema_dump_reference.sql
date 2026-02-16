-- Schema dump provided by user
CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
-- ... (rest of the dump)
CREATE TABLE public.spare_parts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vendor_id uuid,
  category_id uuid,
  name text NOT NULL,
  description text,
  part_number text NOT NULL,
  oem_part_number text,
  aftermarket_part_number text,
  brand text,
  price numeric NOT NULL CHECK (price >= 0::numeric),
  condition text DEFAULT 'new'::text CHECK (condition = ANY (ARRAY['new'::text, 'used'::text, 'refurbished'::text, 'oem'::text, 'aftermarket'::text])),
  availability_status text DEFAULT 'in_stock'::text CHECK (availability_status = ANY (ARRAY['in_stock'::text, 'out_of_stock'::text, 'on_order'::text, 'discontinued'::text])),
  stock_quantity integer DEFAULT 0 CHECK (stock_quantity >= 0),
  min_stock_level integer DEFAULT 5 CHECK (min_stock_level >= 0),
  images ARRAY DEFAULT '{}'::text[],
  technical_specs jsonb DEFAULT '{}'::jsonb,
  compatibility ARRAY DEFAULT '{}'::text[],
  warranty text DEFAULT '12 months'::text,
  weight numeric,
  dimensions text,
  featured boolean DEFAULT false,
  tags ARRAY DEFAULT '{}'::text[],
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT spare_parts_pkey PRIMARY KEY (id),
  CONSTRAINT spare_parts_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.user_profiles(id),
  CONSTRAINT spare_parts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
-- ...
