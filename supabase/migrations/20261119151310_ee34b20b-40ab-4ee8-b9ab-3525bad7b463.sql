CREATE OR REPLACE FUNCTION public.host_response_summaries() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.host_profiles WHERE person_id=auth.uid()) THEN RAISE EXCEPTION 'host_required'; END IF;
 RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',r.id,'first_name',p.first_name,'message',r.message,'status',r.status,'date',a.shabbat_date,'party_size',q.adults+cardinality(q.children_ages))) FROM public.responses r JOIN public.persons p ON p.id=r.guest_id JOIN public.requests q ON q.id=r.request_id JOIN public.availability a ON a.id=r.availability_id WHERE r.host_id=auth.uid() AND r.status<>'withdrawn'), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.host_response_summaries() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.host_response_summaries() TO authenticated;
COMMENT ON FUNCTION public.host_response_summaries() IS 'Intentionally authenticated: safe first-name/message/party summaries scoped to auth.uid() host only, never identity/contact columns.';
CREATE OR REPLACE FUNCTION public.validate_availability() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF public.contains_contact_info(NEW.note) OR public.contains_contact_info(NEW.restriction) THEN RAISE EXCEPTION 'contact_info_not_allowed'; END IF;
 IF NEW.seats<0 OR NEW.seats_left<0 OR NEW.seats_left>NEW.seats OR NEW.beds<0 OR (NEW.unit='full_shabbat' AND NOT NEW.with_lodging) OR (NEW.with_lodging AND NEW.beds<1) THEN RAISE EXCEPTION 'invalid_capacity'; END IF;
 IF TG_OP='UPDATE' AND OLD.status='cancelled' AND NEW.status<>'cancelled' AND NEW.shabbat_date<(now() AT TIME ZONE 'Asia/Jerusalem')::date THEN RAISE EXCEPTION 'invalid_shabbat'; END IF;
 IF NEW.status<>'cancelled' THEN NEW.status:=CASE WHEN NEW.seats_left=0 THEN 'full'::public.availability_status ELSE 'open'::public.availability_status END; END IF;
 RETURN NEW; END $$;
UPDATE public.guest_profiles SET default_unit='full_shabbat',default_with_lodging=true WHERE person_id='809f85d8-4640-4860-badc-45cba7b5fb4a';