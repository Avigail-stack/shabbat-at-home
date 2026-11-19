UPDATE public.app_settings SET value = 'true'::jsonb WHERE key = 'meals_enabled';
ALTER TABLE public.guest_profiles ADD COLUMN default_unit public.hosting_unit NOT NULL DEFAULT 'full_shabbat', ADD COLUMN default_with_lodging boolean NOT NULL DEFAULT true;
ALTER TABLE public.host_profiles ADD COLUMN default_unit public.hosting_unit NOT NULL DEFAULT 'full_shabbat', ADD COLUMN default_with_lodging boolean NOT NULL DEFAULT true;
CREATE OR REPLACE FUNCTION public.validate_hosting_defaults() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.default_unit = 'full_shabbat' AND NOT NEW.default_with_lodging THEN RAISE EXCEPTION 'full_shabbat_requires_lodging'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.validate_hosting_defaults() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guest_hosting_defaults BEFORE INSERT OR UPDATE ON public.guest_profiles FOR EACH ROW EXECUTE FUNCTION public.validate_hosting_defaults();
CREATE TRIGGER host_hosting_defaults BEFORE INSERT OR UPDATE ON public.host_profiles FOR EACH ROW EXECUTE FUNCTION public.validate_hosting_defaults();
CREATE OR REPLACE FUNCTION public.validate_host_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE staff boolean := public.is_staff(auth.uid()) OR auth.uid() IS NULL;
BEGIN
 IF public.contains_contact_info(NEW.about) OR public.contains_contact_info(NEW.house_character) OR public.contains_contact_info(NEW.food_offer) OR public.contains_contact_info(NEW.cannot_provide) OR public.contains_contact_info(NEW.family_composition) THEN RAISE EXCEPTION 'contact_info_not_allowed'; END IF;
 IF NEW.spouse_id_number IS NOT NULL AND NOT public.is_valid_il_id(NEW.spouse_id_number) THEN RAISE EXCEPTION 'invalid_spouse_id'; END IF;
 IF NOT staff AND TG_OP = 'UPDATE' THEN
  IF NEW.approval IS DISTINCT FROM OLD.approval OR NEW.approval_by IS DISTINCT FROM OLD.approval_by OR NEW.approval_at IS DISTINCT FROM OLD.approval_at OR NEW.approval_note IS DISTINCT FROM OLD.approval_note THEN RAISE EXCEPTION 'staff_only_field'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (OLD.status = 'partial' AND NEW.status = 'pending') THEN RAISE EXCEPTION 'staff_only_status'; END IF;
 END IF;
 IF NEW.status <> 'partial' THEN
  IF NEW.default_with_lodging AND NOT (NEW.rule_separate_room AND NEW.rule_lockable_door) THEN RAISE EXCEPTION 'lodging_rules_required'; END IF;
  IF TG_OP = 'INSERT' OR OLD.status = 'partial' THEN
   IF NEW.charter_accepted_at IS NULL OR NEW.behavior_rules_accepted_at IS NULL THEN RAISE EXCEPTION 'charter_required'; END IF;
   IF NEW.spouse_first_name IS NULL OR NEW.spouse_id_number IS NULL THEN RAISE EXCEPTION 'spouse_required'; END IF;
   IF NEW.street_address IS NULL OR NEW.city IS NULL THEN RAISE EXCEPTION 'address_required'; END IF;
  END IF;
 END IF;
 NEW.lodging_description := NULL;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.validate_host_profile() FROM PUBLIC, anon, authenticated;
ALTER POLICY "party writes own feedback" ON public.feedback WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.hostings h WHERE h.id = feedback.hosting_id AND (h.guest_id = auth.uid() OR h.host_id = auth.uid())));
CREATE OR REPLACE FUNCTION public.disable_feedback_followup() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.followup_consent := false; RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION public.disable_feedback_followup() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER feedback_no_followup BEFORE INSERT OR UPDATE ON public.feedback FOR EACH ROW EXECUTE FUNCTION public.disable_feedback_followup();
UPDATE public.feedback SET followup_consent = false WHERE followup_consent = true;