ALTER TABLE public.guest_profiles ADD COLUMN minor_children_count integer NOT NULL DEFAULT 0;
UPDATE public.guest_profiles SET minor_children_count=cardinality(party_children_ages) WHERE cardinality(party_children_ages)>0;
CREATE TABLE public.companions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 guest_id uuid NOT NULL REFERENCES public.guest_profiles(person_id) ON DELETE CASCADE,
 id_number text NOT NULL,
 relation text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(guest_id,id_number)
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.companions TO authenticated;
GRANT ALL ON public.companions TO service_role;
ALTER TABLE public.companions ENABLE ROW LEVEL SECURITY;
CREATE POLICY companions_owner_staff ON public.companions FOR ALL TO authenticated USING (guest_id=auth.uid() OR public.is_staff(auth.uid())) WITH CHECK (guest_id=auth.uid() OR public.is_staff(auth.uid()));
CREATE INDEX companions_guest_idx ON public.companions(guest_id);
CREATE TRIGGER companions_updated BEFORE UPDATE ON public.companions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.validate_companion() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.relation NOT IN ('spouse','child') THEN RAISE EXCEPTION 'invalid_companion_relation'; END IF;
 IF NOT public.is_valid_il_id(NEW.id_number) THEN RAISE EXCEPTION 'invalid_companion_id'; END IF;
 NEW.id_number:=lpad(NEW.id_number,9,'0');
 IF TG_OP='UPDATE' AND NEW.guest_id IS DISTINCT FROM OLD.guest_id THEN RAISE EXCEPTION 'companion_owner_immutable'; END IF;
 PERFORM 1 FROM public.guest_profiles WHERE person_id=NEW.guest_id FOR UPDATE;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.validate_companion() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER companions_validate BEFORE INSERT OR UPDATE ON public.companions FOR EACH ROW EXECUTE FUNCTION public.validate_companion();
CREATE OR REPLACE FUNCTION public.validate_guest_composition() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE adults integer; spouse boolean;
BEGIN
 IF NEW.minor_children_count<0 THEN RAISE EXCEPTION 'invalid_minor_count'; END IF;
 IF NEW.party_type<>'group' THEN
  SELECT count(*)+1,coalesce(bool_or(relation='spouse'),false) INTO adults,spouse FROM public.companions WHERE guest_id=NEW.person_id;
  NEW.party_adults:=adults;
  NEW.party_type:=CASE WHEN NEW.minor_children_count>0 OR adults>2 OR (adults=2 AND NOT spouse) THEN 'family'::public.party_type WHEN adults=2 THEN 'couple'::public.party_type ELSE 'alone'::public.party_type END;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.validate_guest_composition() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guest_composition BEFORE INSERT OR UPDATE ON public.guest_profiles FOR EACH ROW EXECUTE FUNCTION public.validate_guest_composition();
CREATE OR REPLACE FUNCTION public.sync_companion_totals() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 UPDATE public.guest_profiles SET party_adults=party_adults WHERE person_id=CASE WHEN TG_OP='DELETE' THEN OLD.guest_id ELSE NEW.guest_id END;
 RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.sync_companion_totals() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER companions_sync AFTER INSERT OR UPDATE OR DELETE ON public.companions FOR EACH ROW EXECUTE FUNCTION public.sync_companion_totals();
CREATE OR REPLACE FUNCTION public.save_guest_companions(_guest uuid,_companions jsonb,_minors integer) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE item jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT (_guest=auth.uid() OR public.is_staff(auth.uid())) THEN RAISE EXCEPTION 'not_authorized'; END IF;
 IF _minors IS NULL OR _minors<0 OR jsonb_typeof(_companions) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'invalid_composition'; END IF;
 PERFORM 1 FROM public.guest_profiles WHERE person_id=_guest FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'guest_not_found'; END IF;
 DELETE FROM public.companions WHERE guest_id=_guest;
 FOR item IN SELECT value FROM jsonb_array_elements(_companions) LOOP
  INSERT INTO public.companions(guest_id,id_number,relation) VALUES(_guest,item->>'id_number',item->>'relation');
 END LOOP;
 UPDATE public.guest_profiles SET minor_children_count=_minors,party_type='alone',party_children_ages='{}',escort_name=NULL,escort_phone=NULL WHERE person_id=_guest;
END; $$;
REVOKE ALL ON FUNCTION public.save_guest_companions(uuid,jsonb,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_guest_companions(uuid,jsonb,integer) TO authenticated;
