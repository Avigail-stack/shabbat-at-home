UPDATE public.persons SET onboarding_step='identity' WHERE onboarding_step='done' AND phone_verified_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.identity_checks WHERE person_id=persons.id AND status='passed');
CREATE OR REPLACE FUNCTION public.guard_registration_role() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.role IN ('guest','host') AND auth.uid() IS NOT NULL AND NOT public.is_staff(auth.uid()) AND NOT EXISTS(SELECT 1 FROM public.persons p JOIN public.identity_checks c ON c.person_id=p.id WHERE p.id=auth.uid() AND p.phone_verified_at IS NOT NULL AND c.status='passed' AND p.onboarding_step IN ('role','guest','host','done')) THEN RAISE EXCEPTION 'identity_required'; END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.guard_registration_role() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER user_roles_registration_order BEFORE INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.guard_registration_role();
CREATE OR REPLACE FUNCTION public.guard_registration_details() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.onboarding_step IN ('role','guest','host','done') AND NEW.onboarding_step IS DISTINCT FROM OLD.onboarding_step AND (NULLIF(trim(NEW.first_name),'') IS NULL OR NULLIF(trim(NEW.last_name),'') IS NULL OR NEW.email IS NULL OR NEW.id_number IS NULL OR NEW.notification_channel IS NULL) THEN RAISE EXCEPTION 'details_required'; END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.guard_registration_details() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER persons_registration_details BEFORE UPDATE ON public.persons FOR EACH ROW EXECUTE FUNCTION public.guard_registration_details();