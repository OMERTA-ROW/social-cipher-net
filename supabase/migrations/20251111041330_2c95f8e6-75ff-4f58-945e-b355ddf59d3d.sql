-- Create external affiliate links table for CyberPro users
CREATE TABLE public.external_affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  link_name TEXT NOT NULL,
  affiliate_url TEXT NOT NULL,
  merchant_name TEXT NOT NULL, -- Amazon, Walmart, Gucci, etc.
  link_type TEXT NOT NULL DEFAULT 'affiliate', -- affiliate, branded_deal, conversion_tracking
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table to track external affiliate link clicks
CREATE TABLE public.external_affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.external_affiliate_links(id) ON DELETE CASCADE,
  clicker_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for external_affiliate_links
CREATE POLICY "Users can view active external links"
ON public.external_affiliate_links
FOR SELECT
USING (is_active = true);

CREATE POLICY "CyberPro users can create external links"
ON public.external_affiliate_links
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own external links"
ON public.external_affiliate_links
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own external links"
ON public.external_affiliate_links
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for external_affiliate_clicks
CREATE POLICY "Anyone can view click stats"
ON public.external_affiliate_clicks
FOR SELECT
USING (true);

CREATE POLICY "Service can insert clicks"
ON public.external_affiliate_clicks
FOR INSERT
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_external_affiliate_links_updated_at
BEFORE UPDATE ON public.external_affiliate_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();