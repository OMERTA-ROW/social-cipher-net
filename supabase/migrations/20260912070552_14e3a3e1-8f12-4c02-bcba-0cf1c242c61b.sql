CREATE OR REPLACE FUNCTION public.protect_product_moderation_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.is_blocked := OLD.is_blocked;
    NEW.blocked_reason := OLD.blocked_reason;
    NEW.moderation_score := OLD.moderation_score;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_product_moderation_fields ON public.products;
CREATE TRIGGER protect_product_moderation_fields
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.protect_product_moderation_fields();

CREATE OR REPLACE FUNCTION public.protect_profile_verification_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.is_verified := OLD.is_verified;
    NEW.verified_at := OLD.verified_at;
    NEW.verification_method := OLD.verification_method;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_verification_fields ON public.profiles;
CREATE TRIGGER protect_profile_verification_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_verification_fields();

REVOKE EXECUTE ON FUNCTION public.protect_product_moderation_fields() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_verification_fields() FROM anon, authenticated;