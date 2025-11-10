-- Create storage bucket for ID documents (private and secure)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'identity-documents',
  'identity-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
);

-- Create identity verification table
CREATE TABLE public.identity_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  document_type TEXT NOT NULL CHECK (document_type IN ('passport', 'drivers_license', 'national_id', 'other')),
  document_url TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.identity_verification ENABLE ROW LEVEL SECURITY;

-- Users can view their own verification status
CREATE POLICY "Users can view own verification"
ON public.identity_verification
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own verification
CREATE POLICY "Users can submit verification"
ON public.identity_verification
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all verifications
CREATE POLICY "Admins can view all verifications"
ON public.identity_verification
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update verifications
CREATE POLICY "Admins can update verifications"
ON public.identity_verification
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage policies for identity documents
CREATE POLICY "Users can upload own identity documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'identity-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own identity documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'identity-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all identity documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'identity-documents' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add trigger for updated_at
CREATE TRIGGER update_identity_verification_updated_at
BEFORE UPDATE ON public.identity_verification
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();