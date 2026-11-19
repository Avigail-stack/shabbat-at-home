CREATE TABLE public.registration_phone_proofs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token_hash text NOT NULL UNIQUE, phone text NOT NULL, expires_at timestamptz NOT NULL DEFAULT now()+interval '1 hour', consumed_by uuid REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.registration_phone_proofs TO service_role;
ALTER TABLE public.registration_phone_proofs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER registration_phone_proofs_updated BEFORE UPDATE ON public.registration_phone_proofs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE public.identity_checks (person_id uuid PRIMARY KEY REFERENCES public.persons(id) ON DELETE CASCADE, attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','passed','manual_review')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.identity_checks TO authenticated;
GRANT ALL ON public.identity_checks TO service_role;
ALTER TABLE public.identity_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner or staff identity read" ON public.identity_checks FOR SELECT TO authenticated USING(person_id=auth.uid() OR public.is_staff(auth.uid()));
CREATE TRIGGER identity_checks_updated BEFORE UPDATE ON public.identity_checks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.identity_checks(person_id,status) SELECT id,'passed' FROM public.persons WHERE id IN ('809f85d8-4640-4860-badc-45cba7b5fb4a','ed5895e3-934e-4220-91a1-f70cc937103c') ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION public.claim_registration_phone(_token_hash text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.registration_phone_proofs; current_phone text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
 SELECT phone INTO current_phone FROM public.persons WHERE id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RETURN; END IF;
 IF current_phone IS NOT NULL THEN RETURN; END IF;
 SELECT * INTO p FROM public.registration_phone_proofs WHERE token_hash=_token_hash AND expires_at>now() AND consumed_by IS NULL FOR UPDATE;
 IF p.id IS NULL THEN RAISE EXCEPTION 'phone_proof_expired'; END IF;
 IF EXISTS(SELECT 1 FROM public.persons WHERE phone=p.phone AND id<>auth.uid()) THEN RAISE EXCEPTION 'phone_taken'; END IF;
 PERFORM set_config('app.phone_verify','on',true);
 UPDATE public.persons SET phone=p.phone,phone_verified_at=now(),onboarding_step='identity' WHERE id=auth.uid();
 UPDATE public.registration_phone_proofs SET consumed_by=auth.uid() WHERE id=p.id;
 PERFORM set_config('app.phone_verify','off',true);
END $$;
REVOKE ALL ON FUNCTION public.claim_registration_phone(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_registration_phone(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.submit_mock_identity(_fail boolean, _has_id_photo boolean, _has_selfie boolean) RETURNS public.identity_checks LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.identity_checks;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
 PERFORM 1 FROM public.persons WHERE id=auth.uid() AND phone_verified_at IS NOT NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'phone_required'; END IF;
 INSERT INTO public.identity_checks(person_id) VALUES(auth.uid()) ON CONFLICT DO NOTHING;
 SELECT * INTO c FROM public.identity_checks WHERE person_id=auth.uid() FOR UPDATE;
 IF c.status='passed' OR c.attempts>=3 THEN RETURN c; END IF;
 IF NOT _has_id_photo OR NOT _has_selfie THEN RAISE EXCEPTION 'identity_photos_required'; END IF;
 UPDATE public.identity_checks SET attempts=attempts+1,status=CASE WHEN NOT _fail THEN 'passed' WHEN attempts+1>=3 THEN 'manual_review' ELSE 'pending' END WHERE person_id=auth.uid() RETURNING * INTO c;
 IF c.status='passed' THEN
 INSERT INTO public.verifications(person_id,profile_role,kind,status,method,attempts,performed_at) VALUES(auth.uid(),'guest','id','passed','mock_registration',c.attempts,now()),(auth.uid(),'host','id','passed','mock_registration',c.attempts,now());
 UPDATE public.persons SET onboarding_step='details' WHERE id=auth.uid();
 END IF;
 RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.submit_mock_identity(boolean,boolean,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_mock_identity(boolean,boolean,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.guard_registration_order() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.onboarding_step IN ('details','role','guest','host','done') AND (TG_OP='INSERT' OR NEW.onboarding_step IS DISTINCT FROM OLD.onboarding_step) THEN
 IF NEW.phone_verified_at IS NULL THEN RAISE EXCEPTION 'phone_required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.identity_checks WHERE person_id=NEW.id AND status='passed') THEN RAISE EXCEPTION 'identity_required'; END IF;
 IF NEW.onboarding_step='done' AND NOT (EXISTS(SELECT 1 FROM public.guest_profiles WHERE person_id=NEW.id AND charter_accepted_at IS NOT NULL) OR EXISTS(SELECT 1 FROM public.host_profiles WHERE person_id=NEW.id AND charter_accepted_at IS NOT NULL AND behavior_rules_accepted_at IS NOT NULL)) THEN RAISE EXCEPTION 'charter_required'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER persons_registration_order BEFORE INSERT OR UPDATE ON public.persons FOR EACH ROW EXECUTE FUNCTION public.guard_registration_order();
UPDATE public.persons SET onboarding_step='identity' WHERE onboarding_step IN ('details','role','guest','host') AND phone_verified_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.identity_checks WHERE person_id=persons.id AND status='passed');
CREATE OR REPLACE FUNCTION public.verify_phone_code(_phone text,_code text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
 IF _phone !~ '^05\d{8}$' THEN RAISE EXCEPTION 'invalid_phone'; END IF;
 IF _code !~ '^\d{6}$' THEN RAISE EXCEPTION 'invalid_code'; END IF;
 IF EXISTS(SELECT 1 FROM public.persons WHERE phone=_phone AND id<>auth.uid()) THEN RAISE EXCEPTION 'phone_taken'; END IF;
 PERFORM set_config('app.phone_verify','on',true);
 UPDATE public.persons SET phone=_phone,phone_verified_at=now(),onboarding_step=CASE WHEN onboarding_step='phone' THEN 'identity' ELSE onboarding_step END WHERE id=auth.uid();
 PERFORM set_config('app.phone_verify','off',true);
 RETURN 'ok'; END $$;