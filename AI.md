Okay, let's consolidate all the corrected scripts and provide the final versions for the full Supabase migration.

**Remember:**

*   Apply these changes **sequentially** (SQL -> Secrets -> Functions -> Frontend).
*   **BACK UP YOUR PROJECT FIRST!**
*   **MANUAL DATA MIGRATION** from Appwrite to Supabase is essential and **NOT** covered by these scripts.
*   Replace placeholders like `<YOUR_SUPABASE_URL>`, `<YOUR_SUPABASE_ANON_KEY>`, etc.

---

**Phase 1: Supabase Database Setup (SQL)**

*(Run this in Supabase SQL Editor. This is the same comprehensive script as before, including the product view and user-provided triggers)*

```sql
-- Phase 1: Supabase Database Setup - FULL MIGRATION TO SUPABASE AUTH

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net"; -- For email trigger
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For product search/indexing if not already enabled

-- 2. Create User Profiles Table (Linked to Supabase Auth)
CREATE TABLE public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    mobile TEXT,
    address JSONB DEFAULT '{}'::jsonb, -- Stores {"line1": "...", "line2": "...", "city": "...", "state": "...", "zip": "...", "country": "..."}
    is_admin BOOLEAN DEFAULT false, -- Added example admin flag for RLS
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.user_profiles IS 'Stores user profile information, linked to auth.users.';
COMMENT ON COLUMN public.user_profiles.address IS 'Stores address details as a JSON object.';

-- 3. Create Necessary Reference Tables (IF THEY DON'T EXIST)
CREATE TABLE IF NOT EXISTS public.categories ( category TEXT PRIMARY KEY );
CREATE TABLE IF NOT EXISTS public.computer_subcategories ( subcategory TEXT PRIMARY KEY, category TEXT NOT NULL REFERENCES public.categories(category) ON UPDATE CASCADE ON DELETE CASCADE );
CREATE TABLE IF NOT EXISTS public.console_subcategories ( subcategory TEXT PRIMARY KEY, category TEXT NOT NULL REFERENCES public.categories(category) ON UPDATE CASCADE ON DELETE CASCADE );
CREATE TABLE IF NOT EXISTS public.computer_product_label ( label_value TEXT PRIMARY KEY );
CREATE TABLE IF NOT EXISTS public.console_product_label ( label_value TEXT PRIMARY KEY );
CREATE TABLE IF NOT EXISTS public.product_condition ( condition_value TEXT PRIMARY KEY );
INSERT INTO public.product_condition (condition_value) VALUES ('new'), ('pre-owned'), ('refurbished') ON CONFLICT (condition_value) DO NOTHING;
-- Add categories/subcategories if needed: INSERT INTO public.categories (category) VALUES ('Computers'), ('Consoles'); ... etc.

-- 4. Create Computer Products Table (User Provided Schema - Adjusted PK name)
CREATE TABLE public.computer_products (
  product_id uuid not null default extensions.uuid_generate_v4 (),
  name text not null,
  description text not null,
  price numeric(10, 2) not null,
  discount_price numeric(10, 2) not null,
  primary_image TEXT NULL, -- Added for the view
  stock_units integer not null default 0,
  label text not null,
  is_featured boolean null default false,
  is_bestseller boolean null default false,
  is_active boolean not null default true,
  condition text not null,
  search_vector tsvector null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  average_rating numeric(3, 2) null default 0,
  review_count integer null default 0,
  subcategory text not null,
  category text not null,
  slug text null,
  constraint computer_products_pkey primary key (product_id), -- Changed alias to product_id
  constraint computer_products_slug_key unique (slug),
  constraint computer_products_label_fkey foreign KEY (label) references public.computer_product_label (label_value),
  constraint computer_products_subcategory_fkey foreign KEY (subcategory) references public.computer_subcategories (subcategory) on update CASCADE,
  constraint fk_computer_product_condition foreign KEY (condition) references public.product_condition (condition_value),
  constraint computer_products_category_fkey foreign KEY (category) references public.categories (category) on update CASCADE,
  constraint computer_name_length_check check ((length(name) <= 255)),
  constraint computer_products_condition_check check (condition = ANY (ARRAY['new', 'pre-owned', 'refurbished'])),
  constraint computer_products_discount_less_than_price_check check (discount_price IS NULL OR discount_price < price),
  constraint computer_products_discount_price_check check ((discount_price >= (0)::numeric)),
  constraint computer_products_price_check check ((price >= (0)::numeric)),
  constraint computer_products_stock_units_check check ((stock_units >= 0))
) TABLESPACE pg_default;
COMMENT ON TABLE public.computer_products IS 'Stores computer-specific product inventory.';

-- 5. Create Console Products Table (User Provided Schema - Adjusted PK name)
CREATE TABLE public.console_products (
  product_id uuid not null default extensions.uuid_generate_v4 (),
  name text not null,
  description text not null,
  price numeric(10, 2) not null,
  discount_price numeric(10, 2) not null,
  primary_image TEXT NULL, -- Added for the view
  stock_units integer not null default 0,
  label text null,
  is_featured boolean null default false,
  is_bestseller boolean null default false,
  is_active boolean null default true,
  condition text not null,
  search_vector tsvector null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  average_rating numeric(3, 2) null default 0,
  review_count integer null default 0,
  subcategory text not null,
  category text not null,
  slug text null,
  constraint console_products_pkey primary key (product_id), -- Changed alias to product_id
  constraint console_products_slug_key unique (slug),
  constraint console_products_condition_fkey foreign KEY (condition) references public.product_condition (condition_value) on update CASCADE,
  constraint console_products_subcategory_fkey foreign KEY (subcategory) references public.console_subcategories (subcategory) on update CASCADE,
  constraint fk_console_product_label foreign KEY (label) references public.console_product_label (label_value) on update CASCADE on delete RESTRICT,
  constraint console_products_category_fkey foreign KEY (category) references public.categories (category) on update CASCADE,
  constraint console_name_length_check check ((length(name) <= 255)),
  constraint console_products_condition_check check (condition = ANY (ARRAY['new', 'pre-owned', 'refurbished'])),
  constraint console_products_discount_less_than_price_check check (discount_price IS NULL OR discount_price < price),
  constraint console_products_discount_price_check check ((discount_price >= (0)::numeric)),
  constraint console_products_price_check check ((price >= (0)::numeric)),
  constraint console_products_stock_units_check check ((stock_units >= 0))
) TABLESPACE pg_default;
COMMENT ON TABLE public.console_products IS 'Stores console-specific product inventory.';


-- 6. Create Computer Product Images Table (User Provided Schema)
CREATE TABLE public.computer_product_images (
  image_id integer generated by default as identity not null,
  product_id uuid not null,
  primary_image_url text not null,
  secondary_images jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null default now(),
  constraint computer_product_images_pkey PRIMARY KEY (product_id),
  constraint fk_computer_product_img foreign KEY (product_id) references public.computer_products (product_id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;
COMMENT ON TABLE public.computer_product_images IS 'Stores images specific to computer products.';

-- 7. Create Console Product Images Table (User Provided Schema)
CREATE TABLE public.console_product_images (
  image_id integer generated by default as identity not null,
  product_id uuid not null,
  primary_image_url text not null,
  secondary_images jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null default now(),
  constraint console_product_images_pkey PRIMARY KEY (product_id),
  constraint fk_console_product_img foreign KEY (product_id) references public.console_products (product_id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;
COMMENT ON TABLE public.console_product_images IS 'Stores images specific to console products.';

-- 8. Create Unified Products VIEW
CREATE OR REPLACE VIEW public.products AS
SELECT
    cp.product_id AS uuid, cp.name AS product_name, cp.description AS product_description,
    cp.price, cp.discount_price, COALESCE(cpi.primary_image_url, cp.primary_image, '') AS primary_image,
    cp.stock_units, cp.label, cp.is_featured, cp.is_bestseller, cp.is_active, cp.condition,
    cp.search_vector, cp.created_at, cp.updated_at, cp.average_rating, cp.review_count,
    cp.subcategory, cp.category, cp.slug
FROM public.computer_products cp
LEFT JOIN public.computer_product_images cpi ON cp.product_id = cpi.product_id
UNION ALL
SELECT
    conp.product_id AS uuid, conp.name AS product_name, conp.description AS product_description,
    conp.price, conp.discount_price, COALESCE(cpi_con.primary_image_url, conp.primary_image, '') AS primary_image,
    conp.stock_units, conp.label, conp.is_featured, conp.is_bestseller, conp.is_active, conp.condition,
    conp.search_vector, conp.created_at, conp.updated_at, conp.average_rating, conp.review_count,
    conp.subcategory, conp.category, conp.slug
FROM public.console_products conp
LEFT JOIN public.console_product_images cpi_con ON conp.product_id = cpi_con.product_id;
COMMENT ON VIEW public.products IS 'Unified view of computer and console products with primary images.';


-- 9. Create Carts Table
CREATE TABLE public.carts ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, product_uuid UUID NOT NULL, quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 99), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (user_id, product_uuid) );
COMMENT ON TABLE public.carts IS 'Stores user shopping cart items. product_uuid logically links to products view.';


-- 10. Create Wishlists Table
CREATE TABLE public.wishlists ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, product_uuid UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (user_id, product_uuid) );
COMMENT ON TABLE public.wishlists IS 'Stores user wishlist items. product_uuid logically links to products view.';


-- 11. Create Orders Table
CREATE TABLE public.orders ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, order_details JSONB NOT NULL, order_status TEXT NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'failed')), total_amount NUMERIC(10, 2) NOT NULL, discount_code TEXT NULL, discount_amount NUMERIC(10, 2) NULL DEFAULT 0, remark TEXT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now() );
COMMENT ON TABLE public.orders IS 'Stores customer orders.';

-- 12. Create Repair Requests Table
CREATE TABLE public.repairrequests ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, creation_date TIMESTAMPTZ NOT NULL DEFAULT now(), status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'diagnosing', 'repairing', 'completed', 'cancelled')), product_type TEXT NOT NULL, product_description TEXT NOT NULL, shipping_address JSONB NOT NULL, remark TEXT NULL, technician TEXT NULL, estimated_completion TIMESTAMPTZ NULL, notes TEXT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now() );
COMMENT ON TABLE public.repairrequests IS 'Stores customer repair service requests.';

-- 13. Create Discount Codes Table
CREATE TABLE public.discount_codes ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), discount_code TEXT NOT NULL UNIQUE, description TEXT, type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')), rate NUMERIC(10, 4) NOT NULL, is_active BOOLEAN NOT NULL DEFAULT true, expiry_date TIMESTAMPTZ NULL, min_purchase NUMERIC(10, 2) NULL DEFAULT 0, max_discount_value NUMERIC(10, 2) NULL, user_usage_limit INT NOT NULL DEFAULT 1, total_usage_limit INT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now() );
COMMENT ON TABLE public.discount_codes IS 'Stores available discount codes and their rules.';

-- 14. Create Discount Usage Table
CREATE TABLE public.discount_usage ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE, discount_code_id UUID NOT NULL REFERENCES public.discount_codes(id) ON DELETE RESTRICT, discount_code_used TEXT NOT NULL REFERENCES public.discount_codes(discount_code), usage_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(), discount_applied_amount NUMERIC(10, 2) NOT NULL );
COMMENT ON TABLE public.discount_usage IS 'Tracks the usage of discount codes per user and order.';

-- 15. Create reusable timestamp update function
CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

-- 16. Apply timestamp update triggers
DROP TRIGGER IF EXISTS set_timestamp_user_profiles ON public.user_profiles;
DROP TRIGGER IF EXISTS set_timestamp_computer_products ON public.computer_products;
DROP TRIGGER IF EXISTS set_timestamp_console_products ON public.console_products;
DROP TRIGGER IF EXISTS set_timestamp_computer_images ON public.computer_product_images;
DROP TRIGGER IF EXISTS set_timestamp_console_images ON public.console_product_images;
DROP TRIGGER IF EXISTS set_timestamp_carts ON public.carts;
DROP TRIGGER IF EXISTS set_timestamp_orders ON public.orders;
DROP TRIGGER IF EXISTS set_timestamp_repairrequests ON public.repairrequests;
DROP TRIGGER IF EXISTS set_timestamp_discount_codes ON public.discount_codes;
CREATE TRIGGER set_timestamp_user_profiles BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_timestamp_computer_products BEFORE UPDATE ON public.computer_products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_timestamp_console_products BEFORE UPDATE ON public.console_products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_timestamp_computer_images BEFORE UPDATE ON public.computer_product_images FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_timestamp_console_images BEFORE UPDATE ON public.console_product_images FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_timestamp_carts BEFORE UPDATE ON public.carts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_timestamp_orders BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_timestamp_repairrequests BEFORE UPDATE ON public.repairrequests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_timestamp_discount_codes BEFORE UPDATE ON public.discount_codes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 17. Trigger to auto-create user profile on new Supabase Auth user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN INSERT INTO public.user_profiles (user_id, name, address, created_at, updated_at) VALUES ( NEW.id, NEW.raw_user_meta_data ->> 'name', '{}'::jsonb, now(), now() ) ON CONFLICT (user_id) DO NOTHING; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 18. Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.computer_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.console_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.computer_product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.console_product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repairrequests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_usage ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.products ENABLE ROW LEVEL SECURITY;

-- 19. Define RLS Policies (using auth.uid())
-- User Profiles
DROP POLICY IF EXISTS "Allow users to manage their own profile" ON public.user_profiles;
CREATE POLICY "Allow users to manage their own profile" ON public.user_profiles FOR ALL USING (auth.uid() = user_id);

-- Admin Check Function (Placeholder - Needs implementation based on your setup)
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT EXISTS (SELECT 1 FROM public.user_profiles WHERE user_profiles.user_id = is_admin.user_id AND is_admin = true); $$;

-- Products & Images RLS (Public Read, Admin Write)
DROP POLICY IF EXISTS "Allow public read access to products" ON public.computer_products; CREATE POLICY "Allow public read access to products" ON public.computer_products FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Allow admin write access to products" ON public.computer_products; CREATE POLICY "Allow admin write access to products" ON public.computer_products FOR ALL USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Allow public read access to products" ON public.console_products; CREATE POLICY "Allow public read access to products" ON public.console_products FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Allow admin write access to products" ON public.console_products; CREATE POLICY "Allow admin write access to products" ON public.console_products FOR ALL USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Allow public read access to product images" ON public.computer_product_images; CREATE POLICY "Allow public read access to product images" ON public.computer_product_images FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow admin write access to product images" ON public.computer_product_images; CREATE POLICY "Allow admin write access to product images" ON public.computer_product_images FOR ALL USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Allow public read access to product images" ON public.console_product_images; CREATE POLICY "Allow public read access to product images" ON public.console_product_images FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow admin write access to product images" ON public.console_product_images; CREATE POLICY "Allow admin write access to product images" ON public.console_product_images FOR ALL USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Allow authenticated read access to products view" ON public.products; CREATE POLICY "Allow authenticated read access to products view" ON public.products FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow anon read access to products view" ON public.products; CREATE POLICY "Allow anon read access to products view" ON public.products FOR SELECT TO anon USING (true); -- Allow anon access too

-- Carts, Wishlists, Orders, Repairs, Discounts RLS (User manages own)
DROP POLICY IF EXISTS "Allow users to manage their own cart items" ON public.carts; CREATE POLICY "Allow users to manage their own cart items" ON public.carts FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Allow users to manage their own wishlist items" ON public.wishlists; CREATE POLICY "Allow users to manage their own wishlist items" ON public.wishlists FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Allow users to view their own orders" ON public.orders; CREATE POLICY "Allow users to view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Allow users to create new orders for themselves" ON public.orders; CREATE POLICY "Allow users to create new orders for themselves" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Allow users to manage their own repair requests" ON public.repairrequests; CREATE POLICY "Allow users to manage their own repair requests" ON public.repairrequests FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Allow read access to active discount codes" ON public.discount_codes; CREATE POLICY "Allow read access to active discount codes" ON public.discount_codes FOR SELECT USING (is_active = true AND (expiry_date IS NULL OR expiry_date > now()));
DROP POLICY IF EXISTS "Allow users to see their own discount usage" ON public.discount_usage; CREATE POLICY "Allow users to see their own discount usage" ON public.discount_usage FOR SELECT USING (auth.uid() = user_id);

-- 20. Indexes (Includes user-provided ones)
CREATE INDEX IF NOT EXISTS idx_computer_products_condition_trgm ON public.computer_products using gin (condition gin_trgm_ops); CREATE INDEX IF NOT EXISTS trgm_idx_computer_name ON public.computer_products using gin (name gin_trgm_ops); CREATE INDEX IF NOT EXISTS trgm_idx_computer_description ON public.computer_products using gin (description gin_trgm_ops); CREATE INDEX IF NOT EXISTS trgm_idx_computer_label ON public.computer_products using gin (label gin_trgm_ops); CREATE INDEX IF NOT EXISTS computer_products_price_idx ON public.computer_products using btree (price); CREATE INDEX IF NOT EXISTS computer_products_discount_price_idx ON public.computer_products using btree (discount_price); CREATE INDEX IF NOT EXISTS computer_products_featured_idx ON public.computer_products (is_featured) WHERE (is_featured = true); CREATE INDEX IF NOT EXISTS computer_products_bestseller_idx ON public.computer_products (is_bestseller) WHERE (is_bestseller = true); CREATE INDEX IF NOT EXISTS computer_products_active_idx ON public.computer_products (is_active); CREATE INDEX IF NOT EXISTS computer_products_created_idx ON public.computer_products (created_at desc); CREATE INDEX IF NOT EXISTS computer_products_condition_idx ON public.computer_products (condition); CREATE INDEX IF NOT EXISTS computer_products_category_subcat_idx ON public.computer_products(category, subcategory); CREATE INDEX IF NOT EXISTS computer_products_search_vector_idx ON public.computer_products using gin(search_vector);
CREATE INDEX IF NOT EXISTS console_products_name_trgm_idx ON public.console_products using gin (name gin_trgm_ops); CREATE INDEX IF NOT EXISTS console_products_description_trgm_idx ON public.console_products using gin (description gin_trgm_ops); CREATE INDEX IF NOT EXISTS console_products_price_idx ON public.console_products using btree (price); CREATE INDEX IF NOT EXISTS console_products_discount_price_idx ON public.console_products using btree (discount_price); CREATE INDEX IF NOT EXISTS console_products_featured_idx ON public.console_products (is_featured) WHERE (is_featured = true); CREATE INDEX IF NOT EXISTS console_products_bestseller_idx ON public.console_products (is_bestseller) WHERE (is_bestseller = true); CREATE INDEX IF NOT EXISTS console_products_active_idx ON public.console_products (is_active); CREATE INDEX IF NOT EXISTS console_products_created_idx ON public.console_products (created_at desc); CREATE INDEX IF NOT EXISTS console_products_condition_idx ON public.console_products (condition); CREATE INDEX IF NOT EXISTS console_products_label_idx ON public.console_products using gin (label gin_trgm_ops); CREATE INDEX IF NOT EXISTS console_products_category_subcat_idx ON public.console_products(category, subcategory); CREATE INDEX IF NOT EXISTS console_products_search_vector_idx ON public.console_products using gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_computer_images_product_id ON public.computer_product_images(product_id); CREATE INDEX IF NOT EXISTS idx_console_images_product_id ON public.console_product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_carts_user_prod ON public.carts(user_id, product_uuid); CREATE INDEX IF NOT EXISTS idx_wishlists_user_prod ON public.wishlists(user_id, product_uuid);
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created ON public.orders(user_id, created_at DESC); CREATE INDEX IF NOT EXISTS idx_repairrequests_user_id_created ON public.repairrequests(user_id, creation_date DESC);
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON public.discount_codes(discount_code); CREATE INDEX IF NOT EXISTS idx_discount_usage_user_code ON public.discount_usage(user_id, discount_code_used);

-- 21. Helper function to get product details (using the VIEW)
CREATE OR REPLACE FUNCTION public.get_cart_product_info(product_uuids uuid[]) RETURNS TABLE(cart_product_id uuid, cart_slug text, cart_product_name text, cart_price numeric, cart_discount_price numeric, cart_primary_image text) AS $$ BEGIN RETURN QUERY SELECT p.uuid, p.slug, p.product_name, p.price, p.discount_price, p.primary_image FROM public.products p WHERE p.uuid = ANY(product_uuids); END; $$ LANGUAGE plpgsql STABLE;

-- 22. Database Trigger Function for Emails (Replace Placeholders!)
CREATE OR REPLACE FUNCTION public.handle_transactional_email_trigger() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ DECLARE payload JSONB; type_text TEXT; trigger_op TEXT; base_url TEXT := '<YOUR_SUPABASE_URL>'; anon_key TEXT := '<YOUR_SUPABASE_ANON_KEY>'; edge_function_url TEXT; BEGIN edge_function_url := base_url || '/functions/v1/send-transactional-email'; IF base_url LIKE '<YOUR_SUPABASE_URL>%' OR anon_key LIKE '<YOUR_SUPABASE_ANON_KEY>%' THEN RAISE WARNING '[EMAIL TRIGGER] URL/Key placeholders missing!'; RETURN NEW; END IF; IF TG_TABLE_NAME = 'orders' THEN type_text := 'order'; ELSIF TG_TABLE_NAME = 'repairrequests' THEN type_text := 'repair'; ELSE RETURN NULL; END IF; IF TG_OP = 'INSERT' THEN trigger_op := 'create'; payload := jsonb_build_object('type', type_text, 'trigger', trigger_op, 'data', row_to_json(NEW)::jsonb); ELSIF TG_OP = 'UPDATE' THEN trigger_op := 'update'; IF TG_TABLE_NAME = 'orders' AND NEW.order_status IS DISTINCT FROM OLD.order_status THEN payload := jsonb_build_object('type', type_text, 'trigger', trigger_op, 'data', row_to_json(NEW)::jsonb); ELSIF TG_TABLE_NAME = 'repairrequests' AND NEW.status IS DISTINCT FROM OLD.status THEN payload := jsonb_build_object('type', type_text, 'trigger', trigger_op, 'data', row_to_json(NEW)::jsonb); ELSE RETURN NULL; END IF; ELSE RETURN NULL; END IF; BEGIN PERFORM net.http_post( url := edge_function_url, body := payload, headers := jsonb_build_object( 'Content-Type', 'application/json', 'apikey', anon_key )); EXCEPTION WHEN OTHERS THEN RAISE WARNING '[EMAIL TRIGGER] Failed for % ID %. Error: %', type_text, NEW.id, SQLERRM; END; RETURN NEW; END; $$;

-- 23. Apply Email Triggers
DROP TRIGGER IF EXISTS send_order_email_on_insert ON public.orders; DROP TRIGGER IF EXISTS send_order_email_on_update ON public.orders; DROP TRIGGER IF EXISTS send_repair_email_on_insert ON public.repairrequests; DROP TRIGGER IF EXISTS send_repair_email_on_update ON public.repairrequests;
CREATE TRIGGER send_order_email_on_insert AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_transactional_email_trigger();
CREATE TRIGGER send_order_email_on_update AFTER UPDATE OF order_status ON public.orders FOR EACH ROW WHEN (OLD.order_status IS DISTINCT FROM NEW.order_status) EXECUTE FUNCTION public.handle_transactional_email_trigger();
CREATE TRIGGER send_repair_email_on_insert AFTER INSERT ON public.repairrequests FOR EACH ROW EXECUTE FUNCTION public.handle_transactional_email_trigger();
CREATE TRIGGER send_repair_email_on_update AFTER UPDATE OF status ON public.repairrequests FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION public.handle_transactional_email_trigger();

-- 24. Grant execute permissions on necessary RPC functions
GRANT EXECUTE ON FUNCTION public.get_cart_product_info(uuid[]) TO anon, authenticated;
-- Add grants for other RPCs called from frontend (search, product details etc.)
-- Example: GRANT EXECUTE ON FUNCTION public.get_product_details_with_slug(text) TO anon, authenticated;

-- 25. Define User Provided Functions (Placeholders - Replace with actual definitions)
-- Ensure these functions exist in your schema or remove the triggers calling them
CREATE OR REPLACE FUNCTION public.generate_unique_slug() RETURNS trigger AS $$ BEGIN NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring(extensions.uuid_generate_v4()::text, 1, 6); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION public.generate_unique_slug_console() RETURNS trigger AS $$ BEGIN NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring(extensions.uuid_generate_v4()::text, 1, 6); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION public.update_modified_column() RETURNS trigger AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION public.update_search_vector() RETURNS trigger AS $$ BEGIN NEW.search_vector := to_tsvector('english', coalesce(NEW.name,'') || ' ' || coalesce(NEW.description,'') || ' ' || coalesce(NEW.label,'') || ' ' || coalesce(NEW.category,'') || ' ' || coalesce(NEW.subcategory,'')); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION public.set_computer_category_from_subcategory() RETURNS trigger AS $$ BEGIN SELECT category INTO NEW.category FROM public.computer_subcategories WHERE subcategory = NEW.subcategory LIMIT 1; RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION public.set_console_category_from_subcategory() RETURNS trigger AS $$ BEGIN SELECT category INTO NEW.category FROM public.console_subcategories WHERE subcategory = NEW.subcategory LIMIT 1; RETURN NEW; END; $$ LANGUAGE plpgsql;

-- 26. Apply User Provided Triggers
-- Computer Product Triggers
DROP TRIGGER IF EXISTS set_slug_before_insert ON public.computer_products; CREATE TRIGGER set_slug_before_insert BEFORE INSERT ON public.computer_products FOR EACH ROW EXECUTE FUNCTION public.generate_unique_slug();
DROP TRIGGER IF EXISTS set_slug_before_update ON public.computer_products; CREATE TRIGGER set_slug_before_update BEFORE UPDATE ON public.computer_products FOR EACH ROW WHEN (OLD.name IS DISTINCT FROM NEW.name) EXECUTE FUNCTION public.generate_unique_slug(); -- Only on name change
DROP TRIGGER IF EXISTS computer_search_vector_update ON public.computer_products; CREATE TRIGGER computer_search_vector_update BEFORE INSERT OR UPDATE ON public.computer_products FOR EACH ROW EXECUTE FUNCTION public.update_search_vector();
DROP TRIGGER IF EXISTS set_category_from_subcategory_trigger ON public.computer_products; CREATE TRIGGER set_category_from_subcategory_trigger BEFORE INSERT OR UPDATE OF subcategory ON public.computer_products FOR EACH ROW EXECUTE FUNCTION public.set_computer_category_from_subcategory();

-- Console Product Triggers
DROP TRIGGER IF EXISTS set_slug_console_before_insert ON public.console_products; CREATE TRIGGER set_slug_console_before_insert BEFORE INSERT ON public.console_products FOR EACH ROW EXECUTE FUNCTION public.generate_unique_slug_console();
DROP TRIGGER IF EXISTS set_slug_console_before_update ON public.console_products; CREATE TRIGGER set_slug_console_before_update BEFORE UPDATE ON public.console_products FOR EACH ROW WHEN (OLD.name IS DISTINCT FROM NEW.name) EXECUTE FUNCTION public.generate_unique_slug_console(); -- Only on name change
DROP TRIGGER IF EXISTS console_search_vector_update ON public.console_products; CREATE TRIGGER console_search_vector_update BEFORE INSERT OR UPDATE ON public.console_products FOR EACH ROW EXECUTE FUNCTION public.update_search_vector();
DROP TRIGGER IF EXISTS set_console_category_from_subcategory_trigger ON public.console_products; CREATE TRIGGER set_console_category_from_subcategory_trigger BEFORE INSERT OR UPDATE OF subcategory ON public.console_products FOR EACH ROW EXECUTE FUNCTION public.set_console_category_from_subcategory();

-- Image Table Triggers (Use the generic timestamp function)
DROP TRIGGER IF EXISTS update_computer_product_images_timestamp ON public.computer_product_images; CREATE TRIGGER update_computer_product_images_timestamp BEFORE UPDATE ON public.computer_product_images FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS update_console_product_images_timestamp ON public.console_product_images; CREATE TRIGGER update_console_product_images_timestamp BEFORE UPDATE ON public.console_product_images FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==========================================================================
-- END OF SQL SETUP
-- ==========================================================================
```

---

**Phase 2: Supabase Environment Variables / Secrets**

*(Same as previous consolidated answer - ensure these are set)*

1.  `SUPABASE_URL`
2.  `SUPABASE_ANON_KEY`
3.  `SUPABASE_SERVICE_ROLE_KEY`
4.  `MAILGUN_API_KEY`
5.  `MAILGUN_DOMAIN`
6.  `SENDER_EMAIL`
7.  `SENDER_NAME`
8.  `SUPPORT_WHATSAPP_NUMBER`

---

**Phase 3: Supabase Edge Functions**

*(Place these in `supabase/functions/<function-name>/index.ts` and deploy)*

**1. `supabase/functions/_shared/cors.ts`**
```typescript
// supabase/functions/_shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Replace with frontend URL for production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
}
```

**2. `supabase/functions/cart/index.ts`**
```typescript
// supabase/functions/cart/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient, PostgrestError } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { corsHeaders } from '../_shared/cors.ts';

interface CartItemFromDB { quantity: number; products: { uuid: string; slug: string | null; product_name: string | null; price: number | null; discount_price: number | null; primary_image: string | null; } | null; }
const supabaseUrl = Deno.env.get('SUPABASE_URL'); const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }
    const authHeader = req.headers.get('Authorization'); if (!authHeader || !authHeader.startsWith('Bearer ')) { return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    const supabase: SupabaseClient = createClient( supabaseUrl ?? '', supabaseAnonKey ?? '', { global: { headers: { Authorization: authHeader } }, auth: { autoRefreshToken: false, persistSession: false } } );
    const { data: { user }, error: userError } = await supabase.auth.getUser(); if (userError || !user) { console.error('Cart Auth Error:', userError?.message); return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    const userId = user.id;

    try {
        switch (req.method) {
            case 'GET': {
                const { data, error } = await supabase.from('carts').select<string, CartItemFromDB>(`quantity, products!inner (uuid, slug, product_name, price, discount_price, primary_image)`).eq('user_id', userId).not('products', 'is', null);
                if (error) throw error as PostgrestError;
                const formattedCart = data?.map((item: CartItemFromDB) => { if (!item.products) return null; return { id: item.products.uuid, title: item.products.product_name ?? 'Unknown Product', price: item.products.price ?? 0, discount_price: item.products.discount_price ?? item.products.price ?? 0, quantity: item.quantity, image: item.products.primary_image || '/placeholder.svg', slug: item.products.slug || '' }; }).filter(item => item !== null) ?? [];
                return new Response(JSON.stringify(formattedCart), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
            }
            case 'POST': {
                const { product_uuid, quantity } = await req.json() as { product_uuid: string, quantity: number }; if (!product_uuid || quantity == null || quantity <= 0 || quantity > 99) { return new Response(JSON.stringify({ error: 'Invalid product UUID or quantity (1-99)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
                const { data, error } = await supabase.from('carts').upsert({ user_id: userId, product_uuid: product_uuid, quantity: quantity }, { onConflict: 'user_id, product_uuid' }).select().single();
                if (error) { const pgError = error as PostgrestError; if (pgError.code === '23514') return new Response(JSON.stringify({ error: 'Quantity must be between 1 and 99.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); throw pgError; }
                return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 });
            }
            case 'PATCH': {
                 const { product_uuid, quantity } = await req.json() as { product_uuid: string, quantity: number }; if (!product_uuid || quantity == null || quantity <= 0 || quantity > 99) { return new Response(JSON.stringify({ error: 'Invalid product UUID or quantity (1-99)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
                 const { data, error, count } = await supabase.from('carts').update({ quantity: quantity, updated_at: new Date().toISOString() }).eq('user_id', userId).eq('product_uuid', product_uuid).select().maybeSingle();
                  if (error) { const pgError = error as PostgrestError; if (pgError.code === '23514') return new Response(JSON.stringify({ error: 'Quantity must be between 1 and 99.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); throw pgError; }
                  if (!data && (count === null || count === 0)) { return new Response(JSON.stringify({ error: 'Cart item not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
                 return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
            }
            case 'DELETE': {
                const url = new URL(req.url); const product_uuid = url.searchParams.get('product_uuid'); const clearAll = url.searchParams.get('clear') === 'true';
                let query = supabase.from('carts').delete({ count: 'exact' }).eq('user_id', userId);
                if (clearAll) { /* No filter */ } else if (product_uuid) { query = query.eq('product_uuid', product_uuid); } else { return new Response(JSON.stringify({ error: 'Missing product_uuid or clear=true parameter' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
                const { error, count } = await query;
                if (error) throw error as PostgrestError;
                if (!clearAll && count === 0) { return new Response(JSON.stringify({ error: 'Cart item not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
                return new Response(JSON.stringify({ success: true, removedCount: count ?? 0 }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
            }
            default: return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), { status: 405, headers: { ...corsHeaders, Allow: 'GET, POST, PATCH, DELETE' }});
        }
    } catch (error) { let errorMessage = 'Internal Server Error'; if (error instanceof Error) { errorMessage = error.message; } else if (typeof error === 'string') { errorMessage = error; } console.error(`Cart Function Error (${req.method}):`, error); return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
});
```

**3. `supabase/functions/wishlist/index.ts`**
```typescript
// supabase/functions/wishlist/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient, PostgrestError } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { corsHeaders } from '../_shared/cors.ts';

interface WishlistItemFromDB { id: string; created_at: string; products: { uuid: string; slug: string | null; product_name: string | null; price: number | null; discount_price: number | null; primary_image: string | null; } | null; }
const supabaseUrl = Deno.env.get('SUPABASE_URL'); const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }
    const authHeader = req.headers.get('Authorization'); if (!authHeader || !authHeader.startsWith('Bearer ')) { return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    const supabase: SupabaseClient = createClient( supabaseUrl ?? '', supabaseAnonKey ?? '', { global: { headers: { Authorization: authHeader } }, auth: { autoRefreshToken: false, persistSession: false } } );
    const { data: { user }, error: userError } = await supabase.auth.getUser(); if (userError || !user) { console.error('Wishlist Auth Error:', userError?.message); return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    const userId = user.id;

    try {
        switch (req.method) {
            case 'GET': {
                const { data, error } = await supabase.from('wishlists').select<string, WishlistItemFromDB>(`id, created_at, products!inner ( uuid, slug, product_name, price, discount_price, primary_image )`).eq('user_id', userId).not('products', 'is', null);
                if (error) throw error as PostgrestError;
                const formattedWishlist = data?.map((item: WishlistItemFromDB) => { if (!item.products) return null; return { id: item.products.uuid, title: item.products.product_name ?? 'Unknown Product', price: item.products.price ?? 0, discount_price: item.products.discount_price ?? item.products.price ?? 0, image: item.products.primary_image || '/placeholder.svg', slug: item.products.slug || '', wishlistRecordId: item.id, wishlistCreatedAt: item.created_at, }; }).filter(item => item !== null) ?? [];
                return new Response(JSON.stringify(formattedWishlist), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
            }
            case 'POST': {
                const { product_uuid } = await req.json() as { product_uuid: string }; if (!product_uuid) { return new Response(JSON.stringify({ error: 'Missing product_uuid' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
                const { data, error } = await supabase.from('wishlists').upsert({ user_id: userId, product_uuid: product_uuid }, { onConflict: 'user_id, product_uuid', ignoreDuplicates: true }).select().maybeSingle();
                 if (error) { console.error("Wishlist POST error:", error); throw error as PostgrestError; }
                 const statusCode = data ? 201 : 200; const responseBody = data ?? { message: 'Item already in wishlist' };
                return new Response(JSON.stringify(responseBody), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: statusCode });
            }
            case 'DELETE': {
                const url = new URL(req.url); const product_uuid = url.searchParams.get('product_uuid'); const clearAll = url.searchParams.get('clear') === 'true';
                let query = supabase.from('wishlists').delete({ count: 'exact' }).eq('user_id', userId);
                if (clearAll) { /* Delete all */ } else if (product_uuid) { query = query.eq('product_uuid', product_uuid); } else { return new Response(JSON.stringify({ error: 'Missing product_uuid or clear=true parameter' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
                const { error, count } = await query;
                if (error) throw error as PostgrestError;
                if (!clearAll && count === 0) { return new Response(JSON.stringify({ error: 'Wishlist item not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
                return new Response(JSON.stringify({ success: true, removedCount: count ?? 0 }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
            }
            default: return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), { status: 405, headers: { ...corsHeaders, Allow: 'GET, POST, DELETE' }});
        }
    } catch (error) { let errorMessage = 'Internal Server Error'; if (error instanceof Error) errorMessage = error.message; console.error(`Wishlist Function Error (${req.method}):`, error); return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
});
```

**4. `supabase/functions/validate-discount/index.ts`**
```typescript
// supabase/functions/validate-discount/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { corsHeaders } from '../_shared/cors.ts';

interface DiscountCodeRecord { id: string; discount_code: string; type: 'percentage' | 'fixed'; rate: number; is_active: boolean; expiry_date: string | null; min_purchase: number | null; max_discount_value: number | null; user_usage_limit: number; total_usage_limit: number | null; }
interface ValidationPayload { discountCode: string; cartSubtotal: number; }
function formatCurrency(amount: number): string { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount); }

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }
    const authHeader = req.headers.get('Authorization'); if (!authHeader || !authHeader.startsWith('Bearer ')) { return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    const supabaseUserClient: SupabaseClient = createClient( Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } }, auth: { autoRefreshToken: false, persistSession: false } } );
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser(); if (userError || !user) { return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    const userId = user.id;
    const supabaseAdmin: SupabaseClient = createClient( Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { global: { headers: corsHeaders }, auth: { autoRefreshToken: false, persistSession: false } } );

    let payload: ValidationPayload;
    try { payload = await req.json(); } catch (e) { return new Response(JSON.stringify({ isValid: false, message: 'Invalid request body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
    const { discountCode, cartSubtotal } = payload; if (!discountCode || typeof cartSubtotal !== 'number') { return new Response(JSON.stringify({ isValid: false, message: 'Missing required fields: discountCode (string), cartSubtotal (number)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }

    try {
        const { data: codeData, error: codeError } = await supabaseAdmin.from('discount_codes').select('*').eq('discount_code', discountCode).maybeSingle(); if (codeError) throw codeError; if (!codeData) return new Response(JSON.stringify({ isValid: false, message: 'Discount code not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
        const code = codeData as DiscountCodeRecord; let invalidReason: string | null = null;
        if (!code.is_active) invalidReason = 'This discount code is inactive';
        else if (code.expiry_date && new Date(code.expiry_date) < new Date()) invalidReason = 'This discount code has expired';
        else if (code.min_purchase != null && cartSubtotal < code.min_purchase) invalidReason = `Minimum purchase of ${formatCurrency(code.min_purchase)} required`;
        else { const { count: userUsage, error: usageError } = await supabaseAdmin.from('discount_usage').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('discount_code_used', code.discount_code); if (usageError) throw usageError; if ((userUsage ?? 0) >= code.user_usage_limit) invalidReason = 'You have reached the usage limit for this discount code'; else if (code.total_usage_limit !== null) { const { count: totalUsage, error: totalUsageError } = await supabaseAdmin.from('discount_usage').select('*', { count: 'exact', head: true }).eq('discount_code_used', code.discount_code); if (totalUsageError) throw totalUsageError; if ((totalUsage ?? 0) >= code.total_usage_limit) invalidReason = 'This discount code has reached its total usage limit'; } }
        if (invalidReason) { return new Response(JSON.stringify({ isValid: false, message: invalidReason }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
        let calculatedDiscount = code.type === 'percentage' ? cartSubtotal * code.rate : code.rate;
        const finalDiscountAmount = parseFloat(Math.min(calculatedDiscount, code.max_discount_value ?? Number.MAX_VALUE, cartSubtotal).toFixed(2));
        return new Response(JSON.stringify({ isValid: true, discountCode: code.discount_code, rate: code.rate, type: code.type, calculatedDiscountAmount: finalDiscountAmount, message: 'Discount code is valid!' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    } catch (error) { let msg = 'Internal Server Error'; if (error instanceof Error) msg = error.message; console.error('Error validating discount code:', error); return new Response(JSON.stringify({ isValid: false, message: 'An error occurred during validation', error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
});
```

**5. `supabase/functions/orders/index.ts`**
```typescript
// supabase/functions/orders/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { corsHeaders } from '../_shared/cors.ts';

interface OrderItem { id: string; title: string; price: number; discount_price: number; quantity: number; image?: string; slug?: string; }
interface UserProfileAddress { line1: string; line2?: string; city: string; state: string; zip: string; country: string; }
interface UserProfile { id: string; name: string; email: string; phone: string; address: UserProfileAddress; }
interface OrderPayload { cartItems: OrderItem[]; userProfile: UserProfile; discountCode?: string | null; }
interface OrderDetailsStructure { customer: { name: string; email: string; phone: string; address: string; }; order_date: string; products: Array<{ id: string; name: string; image?: string; slug?: string; price: number; discount_price: number; quantity: number; subtotal: number; }>; order_summary: { items_count: number; subtotal: number; discount_code: string | null; discount_amount: number; total: number; discount_type?: string; discount_rate?: number; }; }
interface DiscountCodeRecord { id: string; discount_code: string; type: 'percentage' | 'fixed'; rate: number; is_active: boolean; expiry_date: string | null; min_purchase: number | null; max_discount_value: number | null; user_usage_limit: number; total_usage_limit: number | null; }
function formatCurrency(amount: number): string { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount); }

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }
    const authHeader = req.headers.get('Authorization'); if (!authHeader || !authHeader.startsWith('Bearer ')) { return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    const supabaseUserClient: SupabaseClient = createClient( Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } }, auth: { autoRefreshToken: false, persistSession: false } } );
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser(); if (userError || !user) { return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    const userId = user.id;
    const supabaseAdmin: SupabaseClient = createClient( Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { global: { headers: corsHeaders }, auth: { autoRefreshToken: false, persistSession: false } } );

    try {
        switch (req.method) {
            case 'GET': {
                const url = new URL(req.url); const page = parseInt(url.searchParams.get('page') || '1', 10); const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10); const offset = (page - 1) * pageSize;
                const { data: orders, error, count } = await supabaseUserClient.from('orders').select('*', { count: 'exact' }).eq('user_id', userId).order('created_at', { ascending: false }).range(offset, offset + pageSize - 1);
                if (error) throw error;
                return new Response(JSON.stringify({ orders: orders ?? [], totalCount: count ?? 0 }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
            }
            case 'POST': {
                const { cartItems, userProfile, discountCode }: OrderPayload = await req.json(); if (!cartItems?.length || !userProfile?.address) { return new Response(JSON.stringify({ error: 'Missing cart items or user profile/address' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
                let subtotal = parseFloat(cartItems.reduce((sum, item) => sum + (item.discount_price * item.quantity), 0).toFixed(2)); let discountAmount = 0; let finalTotal = subtotal; let validatedDiscountCode: DiscountCodeRecord | null = null; let discountApplied = false; let discountType: string | undefined; let discountRate: number | undefined;
                if (discountCode) {
                    const { data: codeData, error: codeError } = await supabaseAdmin.from('discount_codes').select('*').eq('discount_code', discountCode).maybeSingle(); if (codeError) throw codeError;
                    if (codeData) {
                        validatedDiscountCode = codeData as DiscountCodeRecord; let invalidReason: string | null = null;
                        if (!validatedDiscountCode.is_active) invalidReason = 'Code is inactive.';
                        else if (validatedDiscountCode.expiry_date && new Date(validatedDiscountCode.expiry_date) < new Date()) invalidReason = 'Code has expired.';
                        else if (validatedDiscountCode.min_purchase != null && subtotal < validatedDiscountCode.min_purchase) invalidReason = `Minimum purchase not met (${formatCurrency(validatedDiscountCode.min_purchase)}).`;
                        else { const { count: userUsage } = await supabaseAdmin.from('discount_usage').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('discount_code_used', validatedDiscountCode.discount_code); if ((userUsage ?? 0) >= validatedDiscountCode.user_usage_limit) invalidReason = "You have reached the usage limit for this code."; else if (validatedDiscountCode.total_usage_limit !== null) { const { count: totalUsage } = await supabaseAdmin.from('discount_usage').select('*', { count: 'exact', head: true }).eq('discount_code_used', validatedDiscountCode.discount_code); if ((totalUsage ?? 0) >= validatedDiscountCode.total_usage_limit) invalidReason = 'This discount code has reached its total usage limit'; } }
                        if(invalidReason) { return new Response(JSON.stringify({ success: false, message: invalidReason }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
                        let calcDiscount = validatedDiscountCode.type === 'percentage' ? subtotal * validatedDiscountCode.rate : validatedDiscountCode.rate; discountAmount = parseFloat(Math.min(calcDiscount, validatedDiscountCode.max_discount_value ?? Number.MAX_VALUE, subtotal).toFixed(2)); finalTotal = parseFloat(Math.max(0, subtotal - discountAmount).toFixed(2)); discountApplied = true; discountType = validatedDiscountCode.type; discountRate = validatedDiscountCode.rate;
                    } else { return new Response(JSON.stringify({ success: false, message: 'Discount code not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
                }
                 const orderDetails: OrderDetailsStructure = { customer: { name: userProfile.name, email: userProfile.email, phone: userProfile.phone, address: `${userProfile.address.line1}${userProfile.address.line2 ? `, ${userProfile.address.line2}` : ''}, ${userProfile.address.city}, ${userProfile.address.state} ${userProfile.address.zip}, ${userProfile.address.country}` }, order_date: new Date().toISOString(), products: cartItems.map(item => ({ id: item.id, name: item.title, image: item.image, slug: item.slug, price: item.price, discount_price: item.discount_price, quantity: item.quantity, subtotal: parseFloat((item.discount_price * item.quantity).toFixed(2)) })), order_summary: { items_count: cartItems.reduce((sum, item) => sum + item.quantity, 0), subtotal: subtotal, discount_code: discountApplied ? validatedDiscountCode!.discount_code : null, discount_amount: discountAmount, total: finalTotal, discount_type: discountType, discount_rate: discountRate } };
                const { data: newOrder, error: insertError } = await supabaseAdmin.from('orders').insert({ user_id: userId, order_details: orderDetails, order_status: 'pending', total_amount: finalTotal, discount_code: discountApplied ? validatedDiscountCode!.discount_code : null, discount_amount: discountAmount }).select().single(); if (insertError) { console.error("Order Insert Error:", insertError); throw insertError; }
                if (discountApplied && validatedDiscountCode) { const { error: usageInsertError } = await supabaseAdmin.from('discount_usage').insert({ user_id: userId, order_id: newOrder.id, discount_code_id: validatedDiscountCode.id, discount_code_used: validatedDiscountCode.discount_code, discount_applied_amount: discountAmount }); if (usageInsertError) console.error(`Failed to record discount usage for order ${newOrder.id}:`, usageInsertError); }
                const { error: clearCartError } = await supabaseAdmin.from('carts').delete().eq('user_id', userId); if (clearCartError) console.error(`Failed to clear cart for user ${userId} after order ${newOrder.id}:`, clearCartError);
                return new Response(JSON.stringify({ success: true, orderId: newOrder.id, order: newOrder }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
            }
            default: return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), { status: 405, headers: { ...corsHeaders, Allow: 'GET, POST' }});
        }
    } catch (error) { let msg = 'Internal Server Error'; if (error instanceof Error) msg = error.message; console.error('Orders function error:', error); return new Response(JSON.stringify({ success: false, error: msg, message: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
});

```

**6. `supabase/functions/send-transactional-email/index.ts`**
```typescript
// supabase/functions/send-transactional-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { corsHeaders } from '../_shared/cors.ts';

interface AddressData { line1?: string; line2?: string; city?: string; state?: string; zip?: string; country?: string; }
interface CustomerData { name?: string; email?: string; phone?: string; address?: string | AddressData; }
interface ProductData { name?: string; quantity?: number; subtotal?: number; image?: string | string[]; price?: number; discount_price?: number; }
interface OrderSummaryData { subtotal?: number; discount_code?: string; discount_type?: string; discount_rate?: number; discount_amount?: number; total?: number; }
interface OrderDetailsData { customer?: CustomerData; products?: ProductData[]; order_summary?: OrderSummaryData; order_date?: string; }
interface OrderData { id: string; user_id: string; order_details: OrderDetailsData; order_status: string; created_at: string; remark?: string | null; }
interface RepairAddressData { name?: string; email?: string; phone?: string; address?: AddressData; }
interface RepairData { id: string; user_id: string; creation_date: string; status: string; product_type: string; product_description: string; shipping_address: RepairAddressData; remark?: string | null; technician?: string | null; estimated_completion?: string | null; notes?: string | null; }
interface EmailPayload { type: 'order' | 'repair'; trigger: 'create' | 'update'; data: OrderData | RepairData; }

const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY'); const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN'); const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL'); const SENDER_NAME = Deno.env.get('SENDER_NAME'); const MAILGUN_API_URL = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`; const SUPPORT_WHATSAPP_NUMBER = Deno.env.get('SUPPORT_WHATSAPP_NUMBER');

function formatCurrency(amount: number | string | null | undefined): string { const num = Number(amount); return isNaN(num) ? "Rs. 0.00" : "Rs. " + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function getOrderStatusStyle(status: string | null | undefined): string { const s = status?.toLowerCase() ?? 'unknown'; let style = "display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; line-height: 1;"; switch(s){ case "pending": style += "background-color:#FFF7ED; color:#F97316;"; break; case "processing": style += "background-color:#EFF6FF; color:#3B82F6;"; break; case "shipped": style += "background-color:#F5F3FF; color:#8B5CF6;"; break; case "delivered": style += "background-color:#ECFDF5; color:#10B981;"; break; case "cancelled": style += "background-color:#FEF2F2; color:#EF4444;"; break; case "failed": style += "background-color:#FEE2E2; color:#DC2626;"; break; default: style += "background-color:#F3F4F6; color:#6B7280;"; break; } return style; }
function getRepairStatusStyle(status: string | null | undefined): string { const s = status?.toLowerCase() ?? 'unknown'; let style = "font-weight: 500;"; switch(s){ case "pending": style += "color:#F97316;"; break; case "received": style += "color:#3B82F6;"; break; case "diagnosing": style += "color:#6366F1;"; break; case "repairing": style += "color:#8B5CF6;"; break; case "completed": style += "color:#10B981;"; break; case "cancelled": style += "color:#EF4444;"; break; default: style += "color:#6B7280;"; break; } return style; }
function capitalize(str: string | null | undefined): string { if (!str) return ''; return str.charAt(0).toUpperCase() + str.slice(1); }

// --- Template Builders (Implement full HTML structure based on your JS versions) ---
function buildOrderEmail(order: OrderData, trigger: 'create' | 'update'): { subject: string, htmlContent: string, recipientEmail: string, recipientName: string } {
    const details = order.order_details || {}; const customer = details.customer || {}; const recipientEmail = customer.email || ''; const recipientName = customer.name || 'Valued Customer'; const orderId = order.id; const orderStatus = order.order_status || "unknown"; const isCreation = trigger === 'create';
    const subject = isCreation ? `Order Confirmed #${orderId.substring(0,8)}` : `Order Update: ${capitalize(orderStatus)} #${orderId.substring(0,8)}`;
    // *** Placeholder - Replace with full HTML generation ***
    const htmlContent = `<p>Hi ${recipientName},</p><p>Your order #${orderId.substring(0,8)} status is now: <strong>${capitalize(orderStatus)}</strong>.</p><p>Thank you!</p>`;
    if (!recipientEmail) throw new Error(`Missing recipient email for order ${orderId}`);
    return { subject, htmlContent, recipientEmail, recipientName };
}
function buildRepairEmail(repair: RepairData, trigger: 'create' | 'update'): { subject: string, htmlContent: string, recipientEmail: string, recipientName: string } {
    const addressData = repair.shipping_address || {}; const recipientEmail = addressData.email || ''; const recipientName = addressData.name || 'Customer'; const repairId = repair.id; const repairStatus = repair.status || "unknown"; const isCreation = trigger === 'create';
    const subject = isCreation ? `Repair Request Received #${repairId.substring(0,8)}` : `Repair Update: ${capitalize(repairStatus)} #${repairId.substring(0,8)}`;
    // *** Placeholder - Replace with full HTML generation ***
    const htmlContent = `<p>Hi ${recipientName},</p><p>Your repair request #${repairId.substring(0,8)} status is now: <strong>${capitalize(repairStatus)}</strong>.</p><p>Thank you!</p>`;
    if (!recipientEmail) throw new Error(`Missing recipient email for repair ${repairId}`);
    return { subject, htmlContent, recipientEmail, recipientName };
}

async function sendEmailWithMailgun(to: string, subject: string, html: string) {
    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN || !SENDER_EMAIL || !SENDER_NAME) { throw new Error("Mailgun configuration missing."); }
    const formData = new FormData(); formData.append('from', `${SENDER_NAME} <${SENDER_EMAIL}>`); formData.append('to', to); formData.append('subject', subject); formData.append('html', html); formData.append('o:tag', 'gnt-transactional');
    const res = await fetch(MAILGUN_API_URL, { method: 'POST', headers: { 'Authorization': `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}` }, body: formData });
    const txt = await res.text(); if (!res.ok) { console.error(`Mailgun Error (${res.status}):`, txt); throw new Error(`Mailgun failed: ${res.status}`); }
    console.log("Mailgun send successful:", txt);
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }
    let payload: EmailPayload;
    try { payload = await req.json(); if (!payload?.type || !payload?.trigger || !payload?.data?.user_id) throw new Error("Invalid payload structure."); }
    catch (e) { console.error("Invalid request body:", e); return new Response(JSON.stringify({ error: 'Bad Request: Invalid payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

    const supabaseAdmin: SupabaseClient = createClient( Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { autoRefreshToken: false, persistSession: false } } );

    try {
        let emailData; let recipientEmail: string | undefined | null = null; let userId = payload.data.user_id;
        if (payload.type === 'order') { emailData = buildOrderEmail(payload.data as OrderData, payload.trigger); recipientEmail = emailData.recipientEmail; }
        else if (payload.type === 'repair') { emailData = buildRepairEmail(payload.data as RepairData, payload.trigger); recipientEmail = emailData.recipientEmail; }
        else throw new Error(`Unsupported payload type: ${payload.type}`);
        if (!recipientEmail && userId) {
            console.log(`Email missing for ${payload.type} ${payload.data.id}, fetching profile for Supabase user ${userId}`);
            const { data: profile } = await supabaseAdmin.from('user_profiles').select('email, name').eq('user_id', userId).maybeSingle();
            if (profile?.email) { recipientEmail = profile.email; emailData.recipientEmail = profile.email; if (emailData.recipientName === 'Valued Customer' && profile.name) emailData.recipientName = profile.name; console.log(`Found email from profile: ${recipientEmail}`); }
             else { console.warn(`Could not find profile email for user ${userId}`); }
        }
        if (!recipientEmail) { console.error(`Cannot send email: Recipient email missing for ${payload.type} ID ${payload.data.id}.`); return new Response(JSON.stringify({ success: false, message: 'Email send failed: Missing recipient email.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
        await sendEmailWithMailgun(recipientEmail, emailData.subject, emailData.htmlContent);
        console.log(`Transactional email request successful for ${payload.type} ID ${payload.data.id}`);
        return new Response(JSON.stringify({ success: true, message: `Email sent successfully to ${recipientEmail}` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    } catch (error) { let msg = 'Internal Server Error'; if (error instanceof Error) msg = error.message; console.error(`Error processing ${payload?.type ?? 'unknown'} email request:`, error); return new Response(JSON.stringify({ success: false, error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
});
```

---

**Phase 4: Frontend Code Modifications**

*(Replace the full content of these files)*

**1. `src/lib/supabase.ts`**
```typescript
// src/lib/supabase.ts
import { createClient, Session, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase URL or Anon Key is missing from environment variables.");
    throw new Error("Supabase configuration is missing.");
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
export type { Session };
```

**2. `src/context/AuthContext.tsx`**
```typescript
// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, Session } from '@/lib/supabase';
import { User, Provider, ApiError } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLoading } from '@/components/global/Loading/LoadingContext';

interface AuthContextProps {
    isAuthenticated: boolean; user: User | null; session: Session | null; isLoadingAuth: boolean;
    signIn: (email: string, password: string) => Promise<{ error: ApiError | null }>;
    signUp: (name: string, email: string, password: string) => Promise<{ error: ApiError | null }>;
    signOut: () => Promise<{ error: ApiError | null }>;
    sendPasswordReset: (email: string) => Promise<{ error: ApiError | null }>;
    updateUserEmail: (newEmail: string) => Promise<{ error: ApiError | null }>;
    updateUserPassword: (newPassword: string) => Promise<{ error: ApiError | null }>;
    signInWithProvider: (provider: Provider) => Promise<{ error: ApiError | null }>;
    refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const queryClient = useQueryClient();
    const { setIsLoading: setIsLoadingGlobal, setLoadingMessage } = useLoading();

    useEffect(() => {
        let isMounted = true; setIsLoadingAuth(true);
        supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => { if (!isMounted) return; if (error) console.error("Error fetching initial session:", error); setSession(initialSession); setUser(initialSession?.user ?? null); setIsLoadingAuth(false); }).catch(err => { if (!isMounted) return; console.error("Catch block: Error fetching initial session:", err); setIsLoadingAuth(false); });
        const { data: authListener } = supabase.auth.onAuthStateChange( async (_event, newSession) => { if (!isMounted) return; const currentUser = newSession?.user ?? null; const previousUserId = user?.id; setSession(newSession); setUser(currentUser); setIsLoadingAuth(false); if (_event === 'SIGNED_IN' && currentUser) { console.log(`[Auth] SIGNED_IN ${currentUser.id}. Invalidating caches.`); queryClient.invalidateQueries({ queryKey: ['userProfile', currentUser.id] }); queryClient.invalidateQueries({ queryKey: ['cart', currentUser.id] }); queryClient.invalidateQueries({ queryKey: ['wishlist', currentUser.id] }); queryClient.invalidateQueries({ queryKey: ['orders', currentUser.id] }); queryClient.invalidateQueries({ queryKey: ['repairrequests', currentUser.id] }); } else if (_event === 'SIGNED_OUT') { console.log(`[Auth] SIGNED_OUT (was ${previousUserId}). Removing caches.`); if (previousUserId) { queryClient.removeQueries({ queryKey: ['userProfile', previousUserId] }); queryClient.removeQueries({ queryKey: ['cart', previousUserId] }); queryClient.removeQueries({ queryKey: ['wishlist', previousUserId] }); queryClient.removeQueries({ queryKey: ['orders', previousUserId] }); queryClient.removeQueries({ queryKey: ['repairrequests', previousUserId] }); } queryClient.removeQueries({ queryKey: ['userProfile', null] }); queryClient.removeQueries({ queryKey: ['cart', null] }); } else if (_event === 'USER_UPDATED' && currentUser) { console.log(`[Auth] USER_UPDATED ${currentUser.id}. Invalidating profile.`); queryClient.invalidateQueries({ queryKey: ['userProfile', currentUser.id] }); } });
        return () => { isMounted = false; authListener?.subscription.unsubscribe(); };
    }, [queryClient, user?.id]);

    const performAuthAction = useCallback(async <T,>( action: () => Promise<{ data: T | null; error: ApiError | null }>, loadingMsg: string, successMsg: string, errorMsgPrefix: string ): Promise<{ data?: T | null; error: ApiError | null }> => { setIsLoadingGlobal(true); setLoadingMessage(loadingMsg); try { const { data, error } = await action(); if (error) { console.error(`${errorMsgPrefix} Error:`, error); toast.error(error.message || `${errorMsgPrefix} failed.`); return { error }; } if(successMsg) toast.success(successMsg); return { data, error: null }; } catch (error: any) { console.error(`Unexpected ${errorMsgPrefix} Error:`, error); const message = error.message || `An unexpected error occurred.`; toast.error(message); return { error: { name: "UnexpectedError", message } as ApiError }; } finally { setIsLoadingGlobal(false); setLoadingMessage(""); } }, [setIsLoadingGlobal, setLoadingMessage]);
    const signIn = useCallback( (email: string, password: string) => performAuthAction( () => supabase.auth.signInWithPassword({ email, password }), "Logging in...", "Login successful!", "Sign In" ), [performAuthAction] );
    const signUp = useCallback( (name: string, email: string, password: string) => performAuthAction( () => supabase.auth.signUp({ email, password, options: { data: { name: name } } }), "Creating account...", "Registration successful! Check email for verification if enabled.", "Sign Up" ), [performAuthAction] );
    const signOut = useCallback(async () => { setIsLoadingGlobal(true); setLoadingMessage("Logging out..."); const { error } = await supabase.auth.signOut(); setIsLoadingGlobal(false); setLoadingMessage(""); if (error) { console.error("Sign Out Error:", error); toast.error(error.message || "Sign out failed."); } else { toast.success("Successfully logged out."); } return { error }; }, [setIsLoadingGlobal, setLoadingMessage]);
    const sendPasswordReset = useCallback( (email: string) => { const redirectUrl = import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL || `${window.location.origin}/update-password`; return performAuthAction( () => supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl }), "Sending reset link...", "Password reset email sent. Check your inbox.", "Password Reset" ) }, [performAuthAction] );
    const updateUserEmail = useCallback( (newEmail: string) => performAuthAction( () => supabase.auth.updateUser({ email: newEmail }), "Requesting email change...", "Email change request sent. Check both email inboxes.", "Email Update" ), [performAuthAction] );
    const updateUserPassword = useCallback( (newPassword: string) => performAuthAction( () => supabase.auth.updateUser({ password: newPassword }), "Updating password...", "Password updated successfully.", "Password Update" ), [performAuthAction] );
    const signInWithProvider = useCallback( (provider: Provider) => { const redirectUrl = import.meta.env.VITE_OAUTH_REDIRECT_URL || window.location.origin; return performAuthAction( () => supabase.auth.signInWithOAuth({ provider, options: { redirectTo: redirectUrl } }), `Redirecting to ${provider}...`, "", `OAuth Sign In (${provider})` ); }, [performAuthAction] );
    const refreshSession = useCallback(async () => { setIsLoadingAuth(true); try { const { error } = await supabase.auth.refreshSession(); if (error) console.error("Error refreshing session:", error); } catch(err) { console.error("Unexpected error during session refresh:", err); } finally { setIsLoadingAuth(false); } }, []);

    const value = { isAuthenticated: !!user, user, session, isLoadingAuth, signIn, signUp, signOut, sendPasswordReset, updateUserEmail, updateUserPassword, signInWithProvider, refreshSession };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => { const context = useContext(AuthContext); if (context === undefined) throw new Error('useAuth must be used within an AuthProvider'); return context; };
export type { User as SupabaseUser, Provider as SupabaseProvider, ApiError as SupabaseApiError } from '@supabase/supabase-js'; // Export needed types
```

**3. `src/components/global/hooks/useUserProfileData.ts`**
```typescript
// src/components/global/hooks/useUserProfileData.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { FormattedUserProfile, ProfileAddress } from '@/pages/Profile/types';

const USER_PROFILE_QUERY_KEY = 'userProfile';

const fetchUserProfile = async (userId: string | undefined): Promise<FormattedUserProfile | null> => {
    if (!userId) return null;
    try {
        const { data, error } = await supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle();
        if (error) throw error; if (!data) return null;
        const authUser = (await supabase.auth.getUser()).data.user;
        const addressData = (data.address || {}) as ProfileAddress;
        const formattedProfile: FormattedUserProfile = { userId: data.user_id, name: data.name || "", email: authUser?.email || "", phone: data.mobile || "", address: { line1: addressData.line1 || "", line2: addressData.line2 || "", city: addressData.city || "", state: addressData.state || "", zip: addressData.zip || "", country: addressData.country || "" }, profileDocId: data.user_id };
        return formattedProfile;
    } catch (error) { console.error("[useUserProfileData] Error fetching profile:", error); throw error; }
};

export const useUserProfileQuery = () => {
    const { user, isLoadingAuth } = useAuth(); const userId = user?.id;
    return useQuery<FormattedUserProfile | null, Error>({ queryKey: [USER_PROFILE_QUERY_KEY, userId], queryFn: () => fetchUserProfile(userId), enabled: !!userId && !isLoadingAuth, staleTime: 300000, gcTime: 1800000, refetchOnWindowFocus: true });
};

interface UpdateProfilePayload { name?: string; mobile?: string; address?: ProfileAddress; }

export const useUpdateProfileMutation = () => {
    const queryClient = useQueryClient(); const { user } = useAuth(); const userId = user?.id;
    return useMutation<FormattedUserProfile, Error, UpdateProfilePayload>({
        mutationFn: async (profileUpdates) => {
            if (!userId) throw new Error("User not authenticated.");
            const updateData: { [key: string]: any } = {};
            if (profileUpdates.name !== undefined) updateData.name = profileUpdates.name; if (profileUpdates.mobile !== undefined) updateData.mobile = profileUpdates.mobile; if (profileUpdates.address !== undefined) updateData.address = profileUpdates.address; updateData.updated_at = new Date().toISOString();
            const { data: updatedData, error } = await supabase.from('user_profiles').update(updateData).eq('user_id', userId).select().single();
            if (error) throw error; if (!updatedData) throw new Error("Update failed: No data returned.");
            const addressData = (updatedData.address || {}) as ProfileAddress;
            const formattedProfile: FormattedUserProfile = { userId: updatedData.user_id, name: updatedData.name || "", email: user?.email || "", phone: updatedData.mobile || "", address: { line1: addressData.line1 || "", line2: addressData.line2 || "", city: addressData.city || "", state: addressData.state || "", zip: addressData.zip || "", country: addressData.country || "" }, profileDocId: updatedData.user_id };
            return formattedProfile;
        },
        onSuccess: (data) => { queryClient.setQueryData([USER_PROFILE_QUERY_KEY, userId], data); console.log("[useUserProfileData] Profile updated in DB & cache:", data); },
        onError: (error) => { console.error("[useUserProfileData] Mutation error updating profile:", error); },
    });
};
```

**4. `src/pages/Profile/profileService.ts`**
```typescript
// src/pages/Profile/profileService.ts
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useUserProfileQuery, useUpdateProfileMutation } from '@/components/global/hooks/useUserProfileData';
import { UserProfile, PincodeValidationResult, ProfileAddress } from "./types";

export const useProfileService = (
    validatePincode: (pincode: string) => Promise<PincodeValidationResult>,
    setLoadingMessage: (message: string) => void,
    setIsLoadingProfile: (isLoading: boolean) => void
) => {
    const { user } = useAuth();
    const { data: profileDataFromQuery, isLoading: isQueryLoading, isFetching: isQueryFetching, isError, refetch } = useUserProfileQuery();
    const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfileMutation();

    const [localProfile, setLocalProfile] = useState<UserProfile | null>(null);
    const [isPincodeLoading, setIsPincodeLoading] = useState(false);
    const [charCounts, setCharCounts] = useState({ name: 0, line1: 0, line2: 0, city: 0, state: 0, country: 0, phone: 0, zip: 0 });
    const profileExists = !!profileDataFromQuery;

    useEffect(() => {
        if (!user) { setLocalProfile(null); return; }
        if (profileDataFromQuery) {
            const profileWithAuthEmail = { ...profileDataFromQuery, email: user.email || profileDataFromQuery.email || "" };
            setLocalProfile(profileWithAuthEmail);
            setCharCounts({ name: profileWithAuthEmail.name?.length || 0, line1: profileWithAuthEmail.address?.line1?.length || 0, line2: profileWithAuthEmail.address?.line2?.length || 0, city: profileWithAuthEmail.address?.city?.length || 0, state: profileWithAuthEmail.address?.state?.length || 0, zip: profileWithAuthEmail.address?.zip?.length || 0, country: profileWithAuthEmail.address?.country?.length || 0, phone: profileWithAuthEmail.phone?.length || 0 });
        } else if (!isQueryLoading && !isQueryFetching && !isError) {
            const defaultProfile: UserProfile = { userId: user.id, name: user.user_metadata?.name || "", email: user.email || "", phone: "", address: { line1: "", line2: "", city: "", state: "", zip: "", country: "" }, profileDocId: user.id };
            setLocalProfile(defaultProfile);
            setCharCounts({ name: defaultProfile.name.length, line1: 0, line2: 0, city: 0, state: 0, country: 0, phone: 0, zip: 0 });
        }
    }, [profileDataFromQuery, isQueryLoading, isQueryFetching, isError, user]);

    const handlePincodeValidation = useCallback(async (pincode: string) => {
        setIsPincodeLoading(true); try { const result = await validatePincode(pincode); if (result.valid && result.city && result.state) { setLocalProfile(prev => { if (!prev) return null; const currentAddress = prev.address || {}; return { ...prev, address: { ...currentAddress, zip: pincode, city: result.city, state: result.state } as ProfileAddress }; }); setCharCounts(prev => ({ ...prev, city: result.city?.length || 0, state: result.state?.length || 0, zip: pincode.length })); toast.success("Pincode validated"); } else { toast.error(result.message || "Invalid pincode"); } } catch (error) { toast.error("Failed to validate pincode."); } finally { setIsPincodeLoading(false); }
    }, [validatePincode]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target; let processedValue = value; const fieldName = name.includes('.') ? name.split('.')[1] : name; const maxLengths: { [key: string]: number } = { name: 50, phone: 10, zip: 6, line1: 50, line2: 50, city: 50, state: 50, country: 50 };
        if (maxLengths[fieldName] && value.length > maxLengths[fieldName]) { processedValue = value.slice(0, maxLengths[fieldName]); } if ((fieldName === 'phone' || fieldName === 'zip') && !/^\d*$/.test(processedValue)) { return; }
        setCharCounts(prev => ({ ...prev, [fieldName]: processedValue.length })); if (fieldName === 'zip' && processedValue.length === 6) { handlePincodeValidation(processedValue); }
        setLocalProfile(prev => { if (!prev) return null; const newProfile = { ...prev }; if (name.startsWith('address.')) { const addressField = fieldName as keyof ProfileAddress; const currentAddress = newProfile.address || {}; newProfile.address = { ...currentAddress, [addressField]: processedValue }; } else if (name === 'phone') { newProfile.phone = processedValue; } else if (name === 'name') { newProfile.name = processedValue; } return newProfile; });
    }, [handlePincodeValidation]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault(); if (!localProfile || !user || !localProfile.address) { toast.error("Profile data missing."); return; }
        if (localProfile.phone && !/^\d{10}$/.test(localProfile.phone)) { toast.error("Phone must be 10 digits"); return; } if (localProfile.address.zip && !/^\d{6}$/.test(localProfile.address.zip)) { toast.error("Pincode must be 6 digits"); return; } if (!localProfile.name?.trim()) { toast.error("Name required."); return; } if (!localProfile.address.line1?.trim()) { toast.error("Address Line 1 required."); return; } if (!localProfile.address.city?.trim()) { toast.error("City required."); return; } if (!localProfile.address.state?.trim()) { toast.error("State required."); return; } if (!localProfile.address.zip?.trim()) { toast.error("Pincode required."); return; } if (!localProfile.address.country?.trim()) { toast.error("Country required."); return; }
        setIsLoadingProfile(true); setLoadingMessage("Saving profile..."); const payload = { name: localProfile.name, mobile: localProfile.phone, address: localProfile.address };
        await updateProfile(payload, { onSuccess: () => { toast.success("Profile saved!"); }, onError: (err) => { toast.error(`Save failed: ${err.message}`); }, onSettled: () => { setIsLoadingProfile(false); setLoadingMessage(""); } });
    }, [localProfile, user, updateProfile, setIsLoadingProfile, setLoadingMessage]);

    const refreshProfileData = useCallback(() => { console.log("[ProfileService] Triggering Supabase profile refetch."); setLoadingMessage("Refreshing profile data..."); setIsLoadingProfile(true); refetch().finally(() => { setIsLoadingProfile(false); setLoadingMessage(""); }); }, [refetch, setLoadingMessage, setIsLoadingProfile]);

    return { localProfile, isLoading: isQueryLoading || isQueryFetching, isSaving: isUpdating, isPincodeLoading, isError, profileExists, charCounts, handleInputChange, handleSubmit, refreshProfileData };
};
```

**5. `src/context/CartContext.tsx`**
```typescript
// src/context/CartContext.tsx
import React, { createContext, useContext, ReactNode, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";
import { useAuth } from './AuthContext';
import { useDiscount } from './DiscountContext';
import { supabase } from '@/lib/supabase';

export interface CartItem { id: string; title: string; price: number; discount_price: number; quantity: number; image: string; slug: string; }
interface CartContextType { cartItems: CartItem[]; addToCart: (item: Omit<CartItem, 'quantity'>, quantity: number) => Promise<boolean>; updateQuantity: (id: string, quantity: number) => Promise<boolean>; removeItem: (id: string) => Promise<boolean>; clearCart: () => Promise<boolean>; cartTotal: number; cartSubtotal: number; cartDiscountAmount: number; isLoading: boolean; isAuthenticated: boolean; cartCount: number; refetchCart: () => void; }

const CartContext = createContext<CartContextType | undefined>(undefined);
export const useCart = () => { const context = useContext(CartContext); if (context === undefined) throw new Error('useCart must be used within a CartProvider'); return context; };

async function fetchCartData(): Promise<CartItem[]> {
    try { const { data, error } = await supabase.functions.invoke('cart', { method: 'GET' }); if (error) throw error; return (data as CartItem[]) ?? []; }
    catch (error: any) { console.error('Error fetching cart:', error); if (error.message?.includes('Auth') || error.context?.status === 401) return []; throw error; }
}

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, isAuthenticated } = useAuth(); const userId = user?.id; const queryClient = useQueryClient(); const { discountRate } = useDiscount();
    const cartQueryKey = useMemo(() => ['cart', userId], [userId]);
    const { data: cartItems = [], isLoading: isCartLoading, isFetching: isCartFetching, isError: isCartError, error: cartError, refetch: refetchCart, } = useQuery<CartItem[], Error>({ queryKey: cartQueryKey, queryFn: fetchCartData, enabled: !!userId && isAuthenticated, staleTime: 60000, gcTime: 600000, refetchOnWindowFocus: true, placeholderData: [], retry: 1 });

    const useCartMutation = <TVariables, TData = any>(fn: (vars: TVariables) => Promise<{ data: TData, error: any }>, options?: { invalidate?: boolean, successToast?: string, errorToastPrefix?: string }) => { return useMutation<TData, Error, TVariables>({ mutationFn: async (variables) => { const { data, error } = await fn(variables); if (error) throw new Error(error.message || 'API call failed'); return data; }, onSuccess: (_, variables) => { if (options?.invalidate !== false) queryClient.invalidateQueries({ queryKey: cartQueryKey }); if (options?.successToast) toast.success(options.successToast, { id: `cart-${JSON.stringify(variables)}` }); }, onError: (error, variables) => { toast.error(`${options?.errorToastPrefix || 'Error'}: ${error.message}`, { id: `cart-${JSON.stringify(variables)}` }); }, }); };
    const { mutateAsync: upsertItemMutation } = useCartMutation((vars: { p_uuid: string, qty: number }) => supabase.functions.invoke('cart', { method: 'POST', body: { product_uuid: vars.p_uuid, quantity: vars.qty } }), { errorToastPrefix: 'Add/Update Failed' });
    const { mutateAsync: updateQuantityMutation } = useCartMutation((vars: { p_uuid: string, qty: number }) => supabase.functions.invoke('cart', { method: 'PATCH', body: { product_uuid: vars.p_uuid, quantity: vars.qty } }), { successToast: "Quantity updated", errorToastPrefix: 'Update Failed' });
    const { mutateAsync: removeItemMutation } = useCartMutation((vars: { p_uuid: string }) => supabase.functions.invoke(`cart?product_uuid=${vars.p_uuid}`, { method: 'DELETE' }), { successToast: "Item removed", errorToastPrefix: 'Remove Failed' });
    const { mutateAsync: clearCartMutation } = useCartMutation(() => supabase.functions.invoke(`cart?clear=true`, { method: 'DELETE' }), { successToast: "Cart cleared", errorToastPrefix: 'Clear Failed' });

    const removeItem = useCallback(async (id: string): Promise<boolean> => { if (!isAuthenticated) { toast.error("Please log in", { id: "cart-login-toast" }); return false; } try { await removeItemMutation({ product_uuid: id }); return true; } catch (e) { return false; } }, [isAuthenticated, removeItemMutation]);
    const updateQuantity = useCallback(async (id: string, quantity: number): Promise<boolean> => { if (!isAuthenticated) { toast.error("Please log in", { id: "cart-login-toast" }); return false; } if (quantity < 1) return removeItem(id); if (quantity > 99) { toast.error("Max quantity is 99", { id: "cart-max-qty" }); quantity = 99; } try { await updateQuantityMutation({ product_uuid: id, quantity }); return true; } catch (e) { return false; } }, [isAuthenticated, updateQuantityMutation, removeItem]);
    const addToCart = useCallback(async (item: Omit<CartItem, 'quantity'>, quantity: number): Promise<boolean> => { if (!isAuthenticated) { toast.error("Please log in", { id: "cart-login-toast" }); return false; } if (quantity < 1 || quantity > 99) { toast.error("Quantity must be 1-99", { id: "cart-qty-toast" }); return false; } const existingItem = cartItems.find(ci => ci.id === item.id); if (!existingItem && cartItems.length >= 20) { toast.error("Cart full (max 20 unique items)", { id: "cart-full-toast" }); return false; } try { await upsertItemMutation({ p_uuid: item.id, qty: quantity }); toast.success(existingItem ? "Cart updated" : "Item added", { id: "cart-add-ok" }); return true; } catch (e) { return false; } }, [isAuthenticated, cartItems, upsertItemMutation]);
    const clearCart = useCallback(async (): Promise<boolean> => { if (!isAuthenticated) { toast.error("Please log in", { id: "cart-login-toast" }); return false; } if (cartItems.length === 0) { toast.info("Cart already empty", { id: "cart-empty-info" }); return true; } try { await clearCartMutation(); return true; } catch (e) { return false; } }, [isAuthenticated, cartItems.length, clearCartMutation]);

    const cartCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);
    const cartSubtotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.discount_price * item.quantity, 0), [cartItems]);
    const cartDiscountAmount = useMemo(() => cartSubtotal * discountRate, [cartSubtotal, discountRate]);
    const cartTotal = useMemo(() => Math.max(0, cartSubtotal - cartDiscountAmount), [cartSubtotal, cartDiscountAmount]);
    useEffect(() => { if (isCartError && cartError) { toast.error("Error loading cart", { id:"cart-load-fail", description: cartError.message }); } }, [isCartError, cartError]);

    return ( <CartContext.Provider value={{ cartItems, addToCart, updateQuantity, removeItem, clearCart, cartTotal, cartSubtotal, cartDiscountAmount, isLoading: isCartLoading || isCartFetching, isAuthenticated, cartCount, refetchCart }}> {children} </CartContext.Provider> );
};
```

**6. `src/context/WishlistContext.tsx`**
```typescript
// src/context/WishlistContext.tsx
import React, { createContext, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

export interface WishlistItem { id: string; slug: string; title: string; price: number; discount_price: number; image: string; }
interface WishlistContextType { wishlistItems: WishlistItem[]; addToWishlist: (item: Omit<WishlistItem, 'quantity'>) => Promise<boolean>; removeFromWishlist: (id: string) => Promise<boolean>; clearWishlist: () => Promise<boolean>; isInWishlist: (id: string) => boolean; isLoading: boolean; isAuthenticated: boolean; refetchWishlist: () => void; }

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);
export const useWishlist = () => { const context = useContext(WishlistContext); if (context === undefined) throw new Error('useWishlist must be used within a WishlistProvider'); return context; };

async function fetchWishlistData(): Promise<WishlistItem[]> {
    try { const { data, error } = await supabase.functions.invoke('wishlist', { method: 'GET' }); if (error) throw error; return (data as WishlistItem[]) ?? []; }
    catch (error: any) { console.error('Error fetching wishlist:', error); if (error.message?.includes('Auth') || error.context?.status === 401) return []; throw error; }
}

export const WishlistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, isAuthenticated } = useAuth(); const userId = user?.id; const queryClient = useQueryClient();
    const wishlistQueryKey = useMemo(() => ['wishlist', userId], [userId]);
    const { data: wishlistItems = [], isLoading: isWishlistLoading, isFetching: isWishlistFetching, isError: isWishlistError, error: wishlistError, refetch: refetchWishlist, } = useQuery<WishlistItem[], Error>({ queryKey: wishlistQueryKey, queryFn: fetchWishlistData, enabled: !!userId && isAuthenticated, staleTime: 300000, gcTime: 900000, refetchOnWindowFocus: true, placeholderData: [], retry: 1 });
    const isInWishlist = useCallback((id: string): boolean => wishlistItems.some(item => item.id === id), [wishlistItems]);

    const useWishlistMutation = <TVariables, TData = any>(fn: (vars: TVariables) => Promise<{ data: TData, error: any }>, options?: { invalidate?: boolean, successToast?: string, errorToastPrefix?: string, onMutate?: (vars: TVariables) => void, onSuccess?: (data: TData, variables: TVariables) => void }) => { return useMutation<TData, Error, TVariables>({ mutationFn: async (variables) => { options?.onMutate?.(variables); const { data, error } = await fn(variables); if (error) throw new Error(error.message || 'API call failed'); return data; }, onSuccess: (data, variables) => { if (options?.invalidate !== false) queryClient.invalidateQueries({ queryKey: wishlistQueryKey }); if (options?.successToast) toast.success(options.successToast, { id: `wish-${JSON.stringify(variables)}` }); options?.onSuccess?.(data, variables); }, onError: (error, variables) => { toast.error(`${options?.errorToastPrefix || 'Error'}: ${error.message}`, { id: `wish-${JSON.stringify(variables)}` }); }, }); };
    const { mutateAsync: addItemMutation } = useWishlistMutation<{ p_uuid: string }, { alreadyExisted: boolean, item?: any }>((vars) => supabase.functions.invoke('wishlist', { method: 'POST', body: { product_uuid: vars.p_uuid } }), { errorToastPrefix: 'Wishlist Add Failed', onSuccess: (data, vars) => { if (!data.alreadyExisted) { /* Invalidation is default */ } else { toast.info("Item already in wishlist", { id:`wish-${vars.p_uuid}`}); } } });
    const { mutateAsync: removeItemMutation } = useWishlistMutation<{ p_uuid: string }>((vars) => supabase.functions.invoke(`wishlist?product_uuid=${vars.p_uuid}`, { method: 'DELETE' }), { successToast: "Removed from wishlist", errorToastPrefix: 'Wishlist Remove Failed' });
    const { mutateAsync: clearWishlistMutation } = useWishlistMutation<void>(() => supabase.functions.invoke(`wishlist?clear=true`, { method: 'DELETE' }), { successToast: "Wishlist cleared", errorToastPrefix: 'Wishlist Clear Failed', onSuccess: () => queryClient.setQueryData(wishlistQueryKey, []) });

    const addToWishlist = useCallback(async (item: Omit<WishlistItem, 'quantity'>): Promise<boolean> => { if (!isAuthenticated) { toast.error("Please log in", { id: "wish-login-toast" }); return false; } if (isInWishlist(item.id)) { toast.info("Already in wishlist", { id: "wish-exists-info" }); return true; } try { await addItemMutation({ product_uuid: item.id }); return true; } catch (e) { return false; } }, [isAuthenticated, isInWishlist, addItemMutation]);
    const removeFromWishlist = useCallback(async (id: string): Promise<boolean> => { if (!isAuthenticated) return false; try { await removeItemMutation({ product_uuid: id }); return true; } catch (e) { return false; } }, [isAuthenticated, removeItemMutation]);
    const clearWishlist = useCallback(async (): Promise<boolean> => { if (!isAuthenticated) { toast.error("Please log in", { id: "wish-login-toast" }); return false; } if (wishlistItems.length === 0) { toast.info("Wishlist already empty", { id: "wish-empty-info" }); return true; } try { await clearWishlistMutation(); return true; } catch (e) { return false; } }, [isAuthenticated, wishlistItems.length, clearWishlistMutation]);
    useEffect(() => { if (isWishlistError && wishlistError) { toast.error("Error loading wishlist", { id: "wish-load-fail", description: wishlistError.message }); } }, [isWishlistError, wishlistError]);

    return ( <WishlistContext.Provider value={{ wishlistItems, addToWishlist, removeFromWishlist, clearWishlist, isInWishlist, isLoading: isWishlistLoading || isWishlistFetching, isAuthenticated, refetchWishlist }}> {children} </WishlistContext.Provider> );
};
```

**7. `src/context/DiscountContext.tsx`**
```typescript
// src/context/DiscountContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { toast } from "sonner";
import { supabase } from '@/lib/supabase'; // Use Supabase client
import { useAuth } from './AuthContext'; // Use Supabase Auth

interface DiscountResponse { isValid: boolean; discountCode?: string; rate?: number; type?: string; calculatedDiscountAmount?: number; message?: string; }
interface DiscountContextType { discountCode: string; discountRate: number; discountType: string; calculatedDiscountAmount: number; applyDiscount: (code: string, subtotal: number) => Promise<boolean>; removeDiscount: () => void; isValidatingDiscount: boolean; }

const DiscountContext = createContext<DiscountContextType | undefined>(undefined);
export const useDiscount = () => { const context = useContext(DiscountContext); if (context === undefined) throw new Error('useDiscount must be used within a DiscountProvider'); return context; };

interface DiscountProviderProps { children: ReactNode; } // Removed userId prop

export const DiscountProvider: React.FC<DiscountProviderProps> = ({ children }) => {
    const [discountCode, setDiscountCode] = useState<string>('');
    const [discountRate, setDiscountRate] = useState<number>(0);
    const [discountType, setDiscountType] = useState<string>('');
    const [calculatedDiscountAmount, setCalculatedDiscountAmount] = useState<number>(0);
    const [isValidatingDiscount, setIsValidatingDiscount] = useState<boolean>(false);
    const { user } = useAuth(); // Use Supabase Auth state

    // Clear discount on user change (login/logout)
    const removeDiscount = useCallback(() => { setDiscountCode(''); setDiscountRate(0); setDiscountType(''); setCalculatedDiscountAmount(0); }, []);
    useEffect(() => { removeDiscount(); }, [user, removeDiscount]);

    const applyDiscount = useCallback(async (codeToValidate: string, cartSubtotal: number): Promise<boolean> => {
        if (!user) { toast.error("Please log in to apply discounts.", { id: "disc-auth-err" }); return false; }
        if (cartSubtotal <= 0) { toast.error("Add items to cart first.", { id: "disc-empty-err" }); return false; }
        setIsValidatingDiscount(true);
        try {
            const payload = { discountCode: codeToValidate, cartSubtotal: cartSubtotal };
            // Invoke the Supabase function - auth token is automatically handled
            const { data, error } = await supabase.functions.invoke<DiscountResponse>('validate-discount', { method: 'POST', body: payload });

            if (error) { throw new Error(error.message || 'Validation request failed'); }
            if (!data) { throw new Error('No response data received from validation function'); }

            if (data.isValid) {
                setDiscountCode(data.discountCode || ''); setDiscountRate(data.rate || 0); setDiscountType(data.type || ''); setCalculatedDiscountAmount(data.calculatedDiscountAmount || 0);
                toast.success(data.message || "Discount applied!", { id: `disc-ok-${data.discountCode}` });
                return true;
            } else {
                removeDiscount(); toast.error(data.message || "Invalid discount code.", { id: "disc-invalid" }); return false;
            }
        } catch (error: any) { removeDiscount(); console.error("Discount validation error:", error); toast.error("Could not validate code", { id: "disc-fetch-err", description: error.message }); return false; }
        finally { setIsValidatingDiscount(false); }
    }, [user, removeDiscount]); // Depends on user now

    return ( <DiscountContext.Provider value={{ discountCode, discountRate, discountType, calculatedDiscountAmount, applyDiscount, removeDiscount, isValidatingDiscount }}> {children} </DiscountContext.Provider> );
};
```

**8. `src/pages/order/checkout/orderUtils.ts`**
```typescript
// src/pages/order/checkout/orderUtils.ts
import { supabase } from '@/lib/supabase';

export interface OrderItem { id: string; title: string; image?: string; price: number; discount_price: number; quantity: number; slug?: string; }
export interface UserProfileAddress { line1: string; line2?: string; city: string; state: string; zip: string; country: string; }
export interface UserProfile { id: string; name: string; email: string; phone: string; address: UserProfileAddress; } // id is Supabase user_id
interface OrderPayload { cartItems: OrderItem[]; userProfile: UserProfile; discountCode?: string | null; }
interface OrderResponse { success: boolean; orderId?: string; order?: any; error?: string; message?: string; }
export interface OrderDetailsStructure { customer: { name: string; email: string; phone: string; address: string; }; order_date: string; products: Array<{ id: string; name: string; image?: string; slug?: string; price: number; discount_price: number; quantity: number; subtotal: number; }>; order_summary: { items_count: number; subtotal: number; discount_code: string | null; discount_amount: number; total: number; discount_type?: string; discount_rate?: number; }; }
export interface FetchedSupabaseOrder { id: string; user_id: string; order_details: OrderDetailsStructure; order_status: string; total_amount: number; discount_code: string | null; discount_amount: number | null; remark: string | null; created_at: string; updated_at: string; }

export async function createServerOrder( _userId_client: string, cartItems: OrderItem[], userProfile: UserProfile, discountCode: string | null ): Promise<string> {
    console.log("[createServerOrder] Invoking 'orders' function...");
    const payload: OrderPayload = { cartItems, userProfile, discountCode: discountCode || null };
    try {
        const { data, error } = await supabase.functions.invoke<OrderResponse>('orders', { method: 'POST', body: payload });
        if (error) { let message = error.message || 'Failed to create order'; if (error.context && typeof error.context === 'object') { const contextError = (error.context as any).error || (error.context as any).message; if (contextError) message = contextError; } throw new Error(message); }
        if (!data || !data.success || !data.orderId) { throw new Error(data?.message || "Order creation failed: Invalid response."); }
        console.log(`[createServerOrder] Order created: ${data.orderId}`);
        return data.orderId;
    } catch (error) { console.error('Error creating order via Edge function:', error); throw error instanceof Error ? error : new Error('Unknown error during order creation.'); }
}

export function getCustomerInfo(orderDetails: OrderDetailsStructure | undefined) { return orderDetails?.customer; }
export function getOrderProducts(orderDetails: OrderDetailsStructure | undefined) { return orderDetails?.products ?? []; }
export function getOrderSummary(orderDetails: OrderDetailsStructure | undefined) { return orderDetails?.order_summary; }
```

**9. `src/pages/order/orderHistory/orderService.ts`**
```typescript
// src/pages/order/orderHistory/orderService.ts
import { supabase } from '@/lib/supabase';
import type { OrderDetailsStructure, FetchedSupabaseOrder } from '@/pages/order/checkout/orderUtils';
export interface Order extends FetchedSupabaseOrder { $id?: string; } // Add $id for potential backward compatibility need
interface GetOrdersResponse { orders: Order[]; totalCount: number; }

export const getUserOrders = async (): Promise<Order[]> => {
    console.log("[orderService] Fetching orders via Supabase function...");
    try {
        const { data, error } = await supabase.functions.invoke<GetOrdersResponse>('orders', { method: 'GET' });
        if (error) { let message = error.message || 'Failed to fetch orders'; if (error.context && typeof error.context === 'object') { const contextError = (error.context as any).error || (error.context as any).message; if (contextError) message = contextError; } if (message.includes('Unauthorized') || error.context?.status === 401) return []; throw new Error(message); }
        console.log("[orderService] Received orders data:", data);
        const mappedOrders = data?.orders.map(o => ({ ...o, $id: o.id })) ?? []; // Map id to $id
        return mappedOrders;
    } catch (error) { console.error("Error in getUserOrders (fetch):", error); throw error; }
};

export const formatCurrency = (amount: number): string => { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount); };
export const getStatusColor = (status: string | null | undefined): string => { const s = status?.toLowerCase(); switch(s){ case 'processing': return 'bg-blue-500/10 text-blue-400'; case 'shipped': return 'bg-violet-500/10 text-violet-400'; case 'delivered': return 'bg-emerald-500/10 text-emerald-400'; case 'cancelled': return 'bg-red-500/10 text-red-400'; case 'pending': return 'bg-yellow-500/10 text-yellow-400'; case 'failed': return 'bg-red-700/20 text-red-500'; default: return 'bg-gray-500/10 text-gray-400'; } };
export const formatDate = (dateString: string | null | undefined): string => { if (!dateString) return 'N/A'; try { const date = new Date(dateString); return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) { return 'Invalid Date'; } };
export const getStatusIcon = (status: string | null | undefined): string => { const s = status?.toLowerCase(); switch(s){ case 'processing': return '⚙️'; case 'shipped': return '🚚'; case 'delivered': return '✅'; case 'cancelled': return '❌'; case 'pending': return '⏳'; case 'failed': return '⚠️'; default: return '⏳'; } };
```

**10. `src/pages/repairPage/history/repairHistoryService.ts`**
```typescript
// src/pages/repairPage/history/repairHistoryService.ts
import { supabase } from '@/lib/supabase';

export interface RepairRequest { id: string; $id: string; user_id: string; creation_date: string; status: string; product_type: string; product_description: string; shipping_address: any; remark?: string | null; updated_at: string; technician?: string | null; estimated_completion?: string | null; notes?: string | null; }
type RepairRequestInput = Omit<RepairRequest, 'id' | '$id' | 'user_id' | 'creation_date' | 'updated_at'> & { user_id: string };

export async function getUserRepairRequests(userId: string | undefined): Promise<RepairRequest[]> {
    if (!userId) return [];
    try { const { data, error } = await supabase.from('repairrequests').select('*').eq('user_id', userId).order('creation_date', { ascending: false }); if (error) throw error; const mapped = data?.map(req => ({ ...req, $id: req.id })) ?? []; return mapped as RepairRequest[]; }
    catch (error) { console.error("Error fetching repair requests:", error); throw error; }
}
export async function getRepairRequestById(requestId: string): Promise<RepairRequest | null> { if (!requestId) return null; try { const { data, error } = await supabase.from('repairrequests').select('*').eq('id', requestId).maybeSingle(); if (error) throw error; return data ? { ...data, $id: data.id } as RepairRequest : null; } catch (error) { console.error(`Error fetching repair request ${requestId}:`, error); return null; } }
export async function createRepairRequest(data: RepairRequestInput): Promise<RepairRequest> { try { const { data: newRequest, error } = await supabase.from('repairrequests').insert(data).select().single(); if (error) throw error; if (!newRequest) throw new Error("Failed to create repair request."); return { ...newRequest, $id: newRequest.id } as RepairRequest; } catch (error) { console.error("Error creating repair request:", error); throw error; } }
export const getStatusColor = (status: string | null | undefined): string => { const s = status?.toLowerCase(); switch(s){ case "pending": return "bg-orange-500/10 text-orange-500"; case "received": return "bg-blue-500/10 text-blue-500"; case "diagnosing": return "bg-indigo-500/10 text-indigo-500"; case "repairing": return "bg-violet-500/10 text-violet-500"; case "completed": return "bg-emerald-500/10 text-emerald-500"; case "cancelled": return "bg-red-500/10 text-red-500"; default: return "bg-gray-500/10 text-gray-500"; } };
export const formatRepairStatus = (status: string | null | undefined): string => { const s = status || ''; return s.charAt(0).toUpperCase() + s.slice(1); };

```

**11. `src/pages/repairPage/NewRequest.tsx`**
```typescript
// src/pages/repairPage/NewRequest.tsx
"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProfilePreviewButton from "@/pages/Profile/ProfilePreviewButton";
import { useUserProfileQuery } from '@/components/global/hooks/useUserProfileData';
import SuccessConfirmation from "@/pages/repairPage/SuccessConfirmation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface NewRequestProps { onSuccessfulSubmission: (requestId: string) => void; }
interface FormErrors { deviceType: boolean; deviceModel: boolean; issueDescription: boolean; }
interface TouchedFields { deviceType: boolean; deviceModel: boolean; issueDescription: boolean; }

export default function NewRequest({ onSuccessfulSubmission }: NewRequestProps) {
    const [repairForm, setRepairForm] = useState({ deviceType: "", deviceModel: "", issueDescription: "" });
    const [formErrors, setFormErrors] = useState<FormErrors>({ deviceType: false, deviceModel: false, issueDescription: false });
    const [touched, setTouched] = useState<TouchedFields>({ deviceType: false, deviceModel: false, issueDescription: false });
    const deviceModelInputRef = useRef<HTMLInputElement>(null);
    const issueDescriptionRef = useRef<HTMLTextAreaElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [submittedRequestId, setSubmittedRequestId] = useState<string>("");
    const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
    const { data: userProfileData, isLoading: isProfileLoading, isFetching: isProfileFetching } = useUserProfileQuery();
    const { user, isAuthenticated } = useAuth();

    const validateField = useCallback((field: keyof FormErrors): boolean => { let hasError = false; if (field === "deviceModel") hasError = !repairForm.deviceModel.trim(); else if (field === "deviceType") hasError = !repairForm.deviceType.trim(); else if (field === "issueDescription") hasError = !repairForm.issueDescription.trim(); setFormErrors((prev) => ({ ...prev, [field]: hasError })); return !hasError; }, [repairForm]);
    const handleBlur = useCallback((field: keyof TouchedFields) => { setTouched((prev) => ({ ...prev, [field]: true })); validateField(field); }, [validateField]);
    const validateForm = useCallback((): boolean => { const newErrors: FormErrors = { deviceModel: !repairForm.deviceModel.trim(), deviceType: !repairForm.deviceType.trim(), issueDescription: !repairForm.issueDescription.trim() }; setFormErrors(newErrors); setTouched({ deviceModel: true, deviceType: true, issueDescription: true }); if (newErrors.deviceModel || newErrors.deviceType || newErrors.issueDescription) { const firstErrorField = Object.keys(newErrors).find(key => newErrors[key as keyof FormErrors]); const element = document.getElementById(firstErrorField || 'deviceModel'); element?.scrollIntoView({ behavior: "smooth", block: "center" }); (element?.querySelector('input, textarea, button[role="combobox"]') as HTMLElement)?.focus(); return false; } return true; }, [repairForm]);
    const persistFormState = (state: typeof repairForm) => { sessionStorage.setItem("newRepairFormState", JSON.stringify(state)); };
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = e.target; const newState = { ...repairForm, [name]: value }; setRepairForm(newState); persistFormState(newState); if (touched[name as keyof TouchedFields]) { validateField(name as keyof FormErrors); } };
    const handleDeviceTypeChange = (value: string): void => { const newState = { ...repairForm, deviceType: value }; setRepairForm(newState); persistFormState(newState); if (touched.deviceType) { validateField("deviceType"); } };

    useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
    useEffect(() => { const saved = sessionStorage.getItem("newRepairFormState"); if (saved) setRepairForm(JSON.parse(saved)); }, []);

    const submitRepairRequest = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); if (!isAuthenticated || !user) { toast.error("Login required."); return; }
        const isProfileFetchComplete = !isProfileLoading && !isProfileFetching; const isProfileComplete = !!(userProfileData?.name && userProfileData?.email && userProfileData?.phone && userProfileData.address?.line1 && userProfileData.address?.city && userProfileData.address?.state && userProfileData.address?.zip);
        if (!isProfileFetchComplete && !userProfileData) { toast.info("Loading profile..."); return; } if (isProfileFetchComplete && !isProfileComplete) { toast.error("Profile incomplete", { description: "Please complete your profile first." }); profileRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
        if (!validateForm()) { toast.error("Please fill all required fields", { icon: <AlertCircle className="h-5 w-5 text-red-400" /> }); return; }
        setIsSubmitting(true);
        try {
             const shippingAddress = { name: userProfileData?.name || "", email: userProfileData?.email || user.email || "", phone: userProfileData?.phone || "", address: userProfileData?.address || {} };
             const payload = { user_id: user.id, status: "pending", product_type: repairForm.deviceType, product_description: `${repairForm.deviceModel.trim()} - ${repairForm.issueDescription.trim()}`, shipping_address: shippingAddress };
             const { data: newRequest, error } = await supabase.from('repairrequests').insert(payload).select().single();
             if (error) throw error; if (!newRequest) throw new Error("Failed to create request.");
             setSubmittedRequestId(newRequest.id); setShowConfirmation(true); toast.success("Repair request submitted!", { description: `Reference ID: #${newRequest.id.substring(0, 8)}...`, icon: <CheckCircle className="h-5 w-5 text-green-500" /> });
             setRepairForm({ deviceType: "", deviceModel: "", issueDescription: "" }); sessionStorage.removeItem("newRepairFormState");
        } catch (error: any) { console.error("Error submitting repair request:", error); toast.error("Failed to submit request", { description: error.message || "Please try again.", icon: <AlertCircle className="h-5 w-5 text-red-400" /> }); }
        finally { setIsSubmitting(false); }
    };
    const handleConfirmationClose = (): void => { setShowConfirmation(false); if (submittedRequestId) onSuccessfulSubmission(submittedRequestId); };

    return (
        <div>
            <div className="max-w-4xl mx-auto p-4">
                {showConfirmation && ( <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"> <SuccessConfirmation requestId={submittedRequestId} onClose={handleConfirmationClose} /> </div> )}
                <form className="space-y-6 mt-6" onSubmit={submitRepairRequest}>
                    <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-4 sm:p-6">
                        <h2 className="text-lg sm:text-xl font-semibold mb-4 text-white">Device Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-3 space-y-2">
                                <Label htmlFor="deviceModel" className="flex items-center text-gray-300">Model/Specs <span className="text-red-400 ml-1">*</span></Label>
                                <Input id="deviceModel" name="deviceModel" placeholder="e.g., PS5 Digital, Alienware m15 R4" value={repairForm.deviceModel} onChange={handleInputChange} onBlur={() => handleBlur("deviceModel")} ref={deviceModelInputRef} className={`bg-[#2a2d36] w-full border ${formErrors.deviceModel && touched.deviceModel ? "border-red-400 focus:ring-red-400" : "border-[#3f4354]"}`} required />
                                {formErrors.deviceModel && touched.deviceModel && (<p className="text-red-400 text-sm flex items-center mt-1"><AlertCircle className="h-3 w-3 mr-1" /> Model/Specs required</p>)}
                            </div>
                            <div className="md:col-span-1 space-y-2">
                                <Label htmlFor="deviceType" className="flex items-center text-gray-300">Type <span className="text-red-400 ml-1">*</span></Label>
                                <Select value={repairForm.deviceType} onValueChange={handleDeviceTypeChange} >
                                    <SelectTrigger id="deviceType" className={`bg-[#2a2d36] w-full border ${formErrors.deviceType && touched.deviceType ? "border-red-400" : "border-[#3f4354]"}`} onBlur={()=>handleBlur("deviceType")}><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent className="bg-[#2a2d36] border-[#3f4354] text-white">
                                         <SelectItem value="ps5">PS5</SelectItem> <SelectItem value="ps4">PS4</SelectItem> <SelectItem value="ps3">PS3</SelectItem> <SelectItem value="xbox-series-x">Xbox Series X</SelectItem> <SelectItem value="xbox-series-s">Xbox Series S</SelectItem>
                                         <SelectItem value="nintendo-switch">Nintendo Switch</SelectItem> <SelectItem value="gaming-pc">Gaming PC</SelectItem> <SelectItem value="gaming-laptop">Gaming Laptop</SelectItem> <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                {formErrors.deviceType && touched.deviceType && (<p className="text-red-400 text-sm flex items-center mt-1"><AlertCircle className="h-3 w-3 mr-1" /> Type required</p>)}
                            </div>
                        </div>
                    </div>
                    <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-4 sm:p-6">
                        <Label htmlFor="issueDescription" className="flex items-center text-gray-300 text-lg sm:text-xl font-semibold mb-3">Issue Description <span className="text-red-400 ml-1">*</span></Label>
                        <Textarea id="issueDescription" name="issueDescription" placeholder="Details about the problem..." value={repairForm.issueDescription} onChange={handleInputChange} onBlur={() => handleBlur("issueDescription")} ref={issueDescriptionRef} className={`bg-[#2a2d36] min-h-[100px] border ${formErrors.issueDescription && touched.issueDescription ? "border-red-400 focus:ring-red-400" : "border-[#3f4354]"}`} rows={4} required />
                        {formErrors.issueDescription && touched.issueDescription && (<p className="text-red-400 text-sm flex items-center mt-1"><AlertCircle className="h-3 w-3 mr-1" /> Description required</p>)}
                    </div>
                    <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-4 sm:p-6" ref={profileRef}>
                        <h2 className="text-lg sm:text-xl font-semibold mb-4 text-white">Contact Information <span className="text-red-400 ml-1">*</span></h2>
                        <p className="text-sm text-gray-400 mb-4">Ensure your profile is up-to-date.</p>
                        <ProfilePreviewButton />
                    </div>
                    <div className="text-xs text-gray-400"><span className="text-red-400 mr-1">*</span>Required fields</div>
                    <Button type="submit" className="w-full bg-[#5865f2] hover:bg-[#4752c4] py-3 text-base" disabled={isSubmitting || isProfileLoading || isProfileFetching}> {isSubmitting ? (<><Loader2 className="animate-spin h-5 w-5 mr-2" /> Submitting...</>) : ("Submit Repair Request")} </Button>
                </form>
            </div>
        </div>
    );
}
```

**12. `src/pages/repairPage/NewRequestWrapper.tsx`**
```typescript
// src/pages/repairPage/NewRequestWrapper.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import NewRequest from './NewRequest';

const NewRequestWrapper: React.FC = () => {
  const navigate = useNavigate();
  
  const handleSuccessfulSubmission = () => {
    // Navigate to repair history page after successful submission
    navigate("/repair/history");
  };
  
  return <NewRequest onSuccessfulSubmission={handleSuccessfulSubmission} />;
};

export default NewRequestWrapper;
```

**13. `src/pages/repairPage/repairProcessVisual.tsx`**
```typescript
// src/pages/repairPage/repairProcessVisual.tsx
import React from "react";
import { ClipboardList, Search, Truck, Wrench, PackageCheck, ArrowRight } from "lucide-react";

const steps = [
  { icon: ClipboardList, text: "Create Request", description: "Submit your repair details." },
  { icon: Search, text: "Troubleshoot", description: "Our team analyzes the issue." },
  { icon: Truck, text: "Arrange Pickup", description: "(If needed) We collect your item." },
  { icon: Wrench, text: "Repair Item", description: "Expert technicians fix your device." },
  { icon: PackageCheck, text: "Ship Back", description: "Your repaired item is returned." },
];

export default function RepairProcessVisual() {
  return (
    <div className="bg-[#1a1b1e] p-6 rounded-lg mb-8 border border-gray-700 shadow-md">
      <h2 className="text-xl font-semibold mb-6 text-center text-white">Our Repair Process</h2>
      <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-4 overflow-x-auto pb-4">
        {steps.map((step, index) => (
          <React.Fragment key={step.text}>
            <div className="flex flex-col items-center text-center w-32 md:w-auto flex-shrink-0">
              <div className="bg-[#2f3555] p-3 rounded-full mb-2 text-white">
                <step.icon size={24} />
              </div>
              <p className="text-sm font-medium text-gray-200">{step.text}</p>
              <p className="text-xs text-gray-400 mt-1">{step.description}</p>
            </div>
            {index < steps.length - 1 && (
              <div className="hidden md:flex items-center text-gray-500 mx-2 flex-shrink-0">
                 <ArrowRight size={20} />
              </div>
            )}
             {index < steps.length - 1 && ( <div className="md:hidden h-4 border-l border-gray-600 my-1"></div> )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
```

**14. `src/pages/repairPage/SuccessConfirmation.tsx`**
```typescript
//src/pages/repairPage/SuccessConfirmation
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Copy, CheckCheck } from "lucide-react";

interface SuccessConfirmationProps { requestId: string; onClose: () => void; }

const SuccessConfirmation = ({ requestId, onClose }: SuccessConfirmationProps) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(requestId); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <Card className="bg-[#1a1c23] border-[#2a2d36] text-white w-full max-w-md mx-auto">
      <CardHeader className="space-y-1 flex flex-col items-center">
        <div className="bg-green-500/20 p-3 rounded-full"><CheckCircle className="h-10 w-10 text-green-400" /></div>
        <CardTitle className="text-2xl mt-4">Request Submitted!</CardTitle>
        <CardDescription className="text-gray-400">Your repair request has been received.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-[#2a2d36] p-4 rounded-lg border border-[#3f4354]">
          <p className="text-sm text-gray-400 mb-2">Your Request ID:</p>
          <div className="flex items-center justify-between">
            <p className="font-mono text-lg text-white">{requestId}</p>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="text-gray-400 hover:text-white hover:bg-[#3f4354]"> {copied ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />} </Button>
          </div>
        </div>
        <p className="text-sm text-gray-400">Please keep this ID for tracking your repair status.</p>
      </CardContent>
      <CardFooter>
        <Button onClick={onClose} className="w-full bg-[#5865f2] hover:bg-[#4752c4]">Got it!</Button>
      </CardFooter>
    </Card>
  );
};
export default SuccessConfirmation;
```

**15. `/src/App.tsx`** (Make sure `AuthProvider` wraps `AuthenticatedProviders`)
```typescript
// src/App.tsx
import React, { useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from 'sonner';
import { HelmetProvider } from 'react-helmet-async';
import SEO from '@/components/seo/SEO';
import { AuthProvider } from "@/context/AuthContext"; // Use Supabase AuthProvider
import { LoadingProvider } from "@/components/global/Loading/LoadingContext";
import LoadingRouteListener from "@/components/global/Loading/LoadingRouteListener";
import useMiddleClickNavigation from "@/components/global/hooks/useMiddleClickNavigation.ts";
import AuthenticatedProviders from "@/components/providers/AuthenticatedProviders";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 300000, refetchOnWindowFocus: false, retry: 1 } } });
function MiddleClickNavigationProvider({ children }: { children: React.ReactNode }) { useMiddleClickNavigation(); return <>{children}</>; }

const AppContent = () => {
    return (
        <Router>
            <MiddleClickNavigationProvider>
                <LoadingRouteListener />
                <Toaster position="top-center" toastOptions={{ className: "bg-[#5865f2] text-white" }} />
                <AuthProvider> {/* <--- AuthProvider wraps AuthenticatedProviders */}
                    <AuthenticatedProviders />
                </AuthProvider>
            </MiddleClickNavigationProvider>
        </Router>
    );
};

function App() {
    useEffect(() => { const splash = document.getElementById("initial-loading"); if (splash) { splash.style.opacity = "0"; setTimeout(() => splash.remove(), 150); } }, []);
    const siteUrl = window.location.origin;
    return ( <HelmetProvider> <SEO title="GNT – Next-Gen Console & PC Marketplace" description="Your go-to marketplace for consoles, computers, and expert repair services." canonicalUrl={siteUrl} ogData={{ title: "GNT Marketplace", description: "...", type: 'website', image: `${siteUrl}/favicon/og-image.png`, url: siteUrl }} /> <QueryClientProvider client={queryClient}> <LoadingProvider> <AppContent /> </LoadingProvider> </QueryClientProvider> </HelmetProvider> );
}
export default App;
```

**16. `/src/main.tsx`** (No changes needed, but ensure it imports `App` from `./App.tsx`)

```typescript
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx' // Make sure this points to your main App component

// Optional: Disable console logs in production
if (import.meta.env.PROD) { // Use Vite's built-in PROD flag
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

**17. `/src/index.css`** (No changes needed from previous consolidated response)

**18. `/src/App.css`** (No changes needed from previous consolidated response)

**19. `.vscode/settings.json`** (Corrected Deno path setting)
```json
{
  // Keep other workspace settings...

  // Deno Extension Settings
  "deno.enable": false,
  "deno.enablePaths": [
    "supabase/functions" // Correct: Array containing the path string
  ],
  "deno.lint": true,
  "deno.unstable": false,

  // Formatting preferences (Optional)
  "[typescript][typescriptreact]": { // Target both TS and TSX files potentially within Deno path
    "editor.defaultFormatter": "denoland.vscode-deno"
  }

  // Add other settings as needed (ESLint config, etc.)
}
```

---

**Phase 5: Final Steps & Deployment**

1.  **Apply SQL:** Execute the full SQL script (Phase 1) in your Supabase Editor.
2.  **Data Migration:** **Manually migrate** your data from Appwrite to Supabase.
3.  **Set Secrets:** Configure Supabase Function secrets (Phase 2).
4.  **Deploy Functions:** Run `supabase functions deploy --project-ref <your-project-ref>` from your project root.
5.  **Apply Frontend Code:** Replace the contents of all the files listed in Phase 4. Delete `src/lib/appwrite.ts` and `src/lib/authHelpers.ts`.
6.  **Install/Uninstall:** `npm install @supabase/supabase-js` and `npm uninstall appwrite`.
7.  **Run `npm run dev` and TEST EXTENSIVELY!** Verify all authentication flows, profile updates, cart, wishlist, order, repair, and email functionalities. Check browser console and Supabase function logs.

This consolidation covers the major parts of the migration. Remember to adapt any minor helper functions or specific UI logic that might still reference old Appwrite concepts.