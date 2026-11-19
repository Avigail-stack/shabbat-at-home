ALTER TABLE public.requests DROP CONSTRAINT requests_guest_id_shabbat_date_key;
CREATE OR REPLACE FUNCTION public.respond_to_invitation(_availability uuid,_message text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE a public.availability; g public.guest_profiles; r uuid; result uuid; BEGIN
PERFORM 1 FROM public.persons WHERE id=auth.uid() FOR UPDATE;
PERFORM public.expire_my_responses();
SELECT * INTO a FROM public.availability WHERE id=_availability FOR UPDATE;
IF NOT public.invitation_eligible(auth.uid(),_availability) THEN RAISE EXCEPTION 'invitation_unavailable'; END IF;
IF length(_message)>1000 OR public.contains_contact_info(_message) THEN RAISE EXCEPTION 'contact_info_not_allowed'; END IF;
IF (SELECT count(*) FROM public.responses WHERE guest_id=auth.uid() AND status='pending')>=3 THEN RAISE EXCEPTION 'response_limit'; END IF;
IF EXISTS(SELECT 1 FROM public.responses WHERE guest_id=auth.uid() AND availability_id=_availability AND status='pending') OR EXISTS(SELECT 1 FROM public.hostings WHERE guest_id=auth.uid() AND availability_id=_availability AND status IN ('confirmed','under_review')) THEN RAISE EXCEPTION 'already_responded'; END IF;
SELECT * INTO g FROM public.guest_profiles WHERE person_id=auth.uid();
INSERT INTO public.requests(guest_id,shabbat_date,party_type,adults,children_ages,unit,with_lodging) VALUES(auth.uid(),a.shabbat_date,g.party_type,g.party_adults,array_fill(0,ARRAY[g.minor_children_count]),a.unit,a.with_lodging) RETURNING id INTO r;
INSERT INTO public.responses(request_id,availability_id,guest_id,host_id,message,expires_at) VALUES(r,a.id,auth.uid(),a.host_id,trim(_message),now()+interval '24 hours') RETURNING id INTO result;
RETURN result; END $$;