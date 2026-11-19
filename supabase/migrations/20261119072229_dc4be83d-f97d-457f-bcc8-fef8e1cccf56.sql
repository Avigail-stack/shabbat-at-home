ALTER TABLE public.host_profiles ADD COLUMN street text, ADD COLUMN house_number text, ADD COLUMN building_number text, ADD COLUMN recommender2_name text, ADD COLUMN recommender2_phone text, ADD COLUMN recommendation_mode text NOT NULL DEFAULT 'recommenders', ADD COLUMN staff_call_method text;
UPDATE public.host_profiles SET street=street_address WHERE street_address IS NOT NULL;
CREATE OR REPLACE FUNCTION public.validate_host_details() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.recommendation_mode NOT IN ('recommenders','staff_call') THEN RAISE EXCEPTION 'invalid_recommendation_mode'; END IF;
 IF NEW.staff_call_method IS NOT NULL AND NEW.staff_call_method NOT IN ('video','phone') THEN RAISE EXCEPTION 'invalid_staff_call_method'; END IF;
 IF NEW.onboarding_step>=3 AND (TG_OP='INSERT' OR NEW.street IS DISTINCT FROM OLD.street OR NEW.house_number IS DISTINCT FROM OLD.house_number OR NEW.building_number IS DISTINCT FROM OLD.building_number OR NEW.city IS DISTINCT FROM OLD.city OR NEW.neighborhood IS DISTINCT FROM OLD.neighborhood OR NEW.onboarding_step IS DISTINCT FROM OLD.onboarding_step) THEN
  IF nullif(trim(NEW.street),'') IS NULL OR nullif(trim(NEW.house_number),'') IS NULL OR nullif(trim(NEW.neighborhood),'') IS NULL OR nullif(trim(NEW.city),'') IS NULL THEN RAISE EXCEPTION 'address_required'; END IF;
 END IF;
 IF NEW.onboarding_step>=8 AND (TG_OP='INSERT' OR NEW.recommender_name IS DISTINCT FROM OLD.recommender_name OR NEW.recommender_phone IS DISTINCT FROM OLD.recommender_phone OR NEW.recommender2_name IS DISTINCT FROM OLD.recommender2_name OR NEW.recommender2_phone IS DISTINCT FROM OLD.recommender2_phone OR NEW.recommendation_mode IS DISTINCT FROM OLD.recommendation_mode OR NEW.staff_call_method IS DISTINCT FROM OLD.staff_call_method OR NEW.onboarding_step IS DISTINCT FROM OLD.onboarding_step) THEN
  IF NEW.recommendation_mode='staff_call' THEN
   IF NEW.staff_call_method IS NULL THEN RAISE EXCEPTION 'staff_call_required'; END IF;
  ELSE
   IF nullif(trim(NEW.recommender_name),'') IS NULL OR nullif(trim(NEW.recommender2_name),'') IS NULL OR coalesce(NEW.recommender_phone,'') !~ '^05[0-9]{8}$' OR coalesce(NEW.recommender2_phone,'') !~ '^05[0-9]{8}$' THEN RAISE EXCEPTION 'two_recommenders_required'; END IF;
  END IF;
 END IF;
 NEW.street_address:=concat_ws(' ',nullif(trim(NEW.street),''),nullif(trim(NEW.house_number),''),nullif(trim(NEW.building_number),''));
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.validate_host_details() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER host_details BEFORE INSERT OR UPDATE ON public.host_profiles FOR EACH ROW EXECUTE FUNCTION public.validate_host_details();