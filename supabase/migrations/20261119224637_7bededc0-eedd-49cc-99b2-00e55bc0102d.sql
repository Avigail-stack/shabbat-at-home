ALTER TABLE public.hostings ADD COLUMN IF NOT EXISTS candle_lighting_at timestamptz, ADD COLUMN IF NOT EXISTS late_cancellation boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS exceptional_cancellation boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS cancelled_on_friday boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX hostings_one_guest_per_shabbat ON public.hostings(guest_id,shabbat_date) WHERE status IN ('confirmed','under_review');
INSERT INTO public.app_settings(key,value) VALUES ('exceptional_cancellation_hours','24'),('late_cancellation_hours','72') ON CONFLICT(key) DO NOTHING;
REVOKE SELECT ON public.responses FROM authenticated;
GRANT SELECT(id,request_id,availability_id,guest_id,host_id,message,status,expires_at,via_invite_link,answered_at,created_at,updated_at) ON public.responses TO authenticated;
REVOKE SELECT ON public.hostings FROM authenticated;
GRANT SELECT(id,response_id,availability_id,guest_id,host_id,shabbat_date,party_size,status,contact_method,cancelled_by,cancelled_at,created_at,updated_at) ON public.hostings TO authenticated;
CREATE OR REPLACE FUNCTION public.confirm_host_response(_response uuid,_contact public.contact_method,_save_default boolean) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.responses; a public.availability; q public.requests; result uuid; BEGIN
SELECT * INTO r FROM public.responses WHERE id=_response AND host_id=auth.uid();
IF r.id IS NULL THEN RAISE EXCEPTION 'response_unavailable'; END IF;
-- Serialize every action for this guest before locking any seats or responses.
PERFORM 1 FROM public.persons WHERE id=r.guest_id FOR UPDATE;
SELECT * INTO a FROM public.availability WHERE id=r.availability_id FOR UPDATE;
SELECT * INTO r FROM public.responses WHERE id=_response FOR UPDATE;
SELECT * INTO q FROM public.requests WHERE id=r.request_id FOR UPDATE;
IF r.status<>'pending' OR r.expires_at<=now() OR q.status<>'active' OR a.status='cancelled' OR a.shabbat_date<=(now() AT TIME ZONE 'Asia/Jerusalem')::date OR _contact IS NULL THEN RAISE EXCEPTION 'response_unavailable'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.host_profiles h JOIN public.persons p ON p.id=h.person_id WHERE h.person_id=auth.uid() AND h.approval='approved' AND h.status='active' AND p.restriction_status='none') OR NOT public.guest_ready(r.guest_id) THEN RAISE EXCEPTION 'response_unavailable'; END IF;
IF EXISTS(SELECT 1 FROM public.hostings WHERE guest_id=r.guest_id AND shabbat_date=a.shabbat_date AND status IN ('confirmed','under_review')) THEN RAISE EXCEPTION 'double_booking'; END IF;
IF a.seats_left<q.adults+cardinality(q.children_ages) OR (a.with_lodging AND a.beds-COALESCE((SELECT sum(party_size) FROM public.hostings WHERE availability_id=a.id AND status IN ('confirmed','under_review')),0)<q.adults+cardinality(q.children_ages)) THEN RAISE EXCEPTION 'not_enough_seats'; END IF;
INSERT INTO public.hostings(response_id,availability_id,guest_id,host_id,shabbat_date,party_size,contact_method) VALUES(r.id,a.id,r.guest_id,r.host_id,a.shabbat_date,q.adults+cardinality(q.children_ages),_contact) RETURNING id INTO result;
UPDATE public.availability SET seats_left=seats_left-q.adults-cardinality(q.children_ages) WHERE id=a.id;
UPDATE public.responses SET status='accepted',answered_at=now() WHERE id=r.id;
UPDATE public.requests SET status='closed' WHERE guest_id=r.guest_id AND shabbat_date=a.shabbat_date AND status='active';
UPDATE public.responses SET status='withdrawn',answered_at=now() WHERE guest_id=r.guest_id AND id<>r.id AND status='pending';
IF _save_default THEN UPDATE public.host_profiles SET preferred_contact=_contact WHERE person_id=auth.uid(); END IF;
RETURN result; END $$;
REVOKE ALL ON FUNCTION public.confirm_host_response(uuid,public.contact_method,boolean) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.confirm_host_response(uuid,public.contact_method,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.decline_host_response(_response uuid,_reason text,_note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.responses; BEGIN
SELECT * INTO r FROM public.responses WHERE id=_response AND host_id=auth.uid(); IF r.id IS NULL THEN RAISE EXCEPTION 'response_unavailable'; END IF;
PERFORM 1 FROM public.persons WHERE id=r.guest_id FOR UPDATE;
SELECT * INTO r FROM public.responses WHERE id=_response FOR UPDATE;
IF r.status<>'pending' OR r.expires_at<=now() THEN RAISE EXCEPTION 'response_unavailable'; END IF;
IF _reason IS NULL OR _reason NOT IN ('no_space','composition','sensitivity','other') THEN RAISE EXCEPTION 'reason_required'; END IF;
UPDATE public.responses SET status='declined',decline_reason=_reason,decline_note=nullif(trim(_note),''),answered_at=now() WHERE id=r.id;
END $$;
REVOKE ALL ON FUNCTION public.decline_host_response(uuid,text,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.decline_host_response(uuid,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.my_hosting_summaries() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT COALESCE(jsonb_agg(jsonb_build_object('id',h.id,'date',h.shabbat_date,'status',h.status,'party_size',h.party_size,'side',CASE WHEN h.host_id=auth.uid() THEN 'host' ELSE 'guest' END,'first_name',p.first_name,'family_name',hp.family_name,'cancelled_on_friday',h.cancelled_on_friday) ORDER BY h.shabbat_date DESC),'[]'::jsonb) FROM public.hostings h JOIN public.persons p ON p.id=h.guest_id JOIN public.host_profiles hp ON hp.person_id=h.host_id WHERE auth.uid() IN (h.guest_id,h.host_id)
$$;
REVOKE ALL ON FUNCTION public.my_hosting_summaries() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.my_hosting_summaries() TO authenticated;
CREATE OR REPLACE FUNCTION public.hosting_details(_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE h public.hostings; BEGIN
SELECT * INTO h FROM public.hostings WHERE id=_id AND auth.uid() IN (guest_id,host_id); IF h.id IS NULL THEN RAISE EXCEPTION 'hosting_unavailable'; END IF;
RETURN (SELECT jsonb_build_object('id',h.id,'date',h.shabbat_date,'status',h.status,'side',CASE WHEN h.host_id=auth.uid() THEN 'host' ELSE 'guest' END,'party_size',h.party_size,'contact_method',h.contact_method,'first_name',gp.first_name,'family_name',hp.family_name,'city',hp.city,'lat',c.lat,'lng',c.lng,'parsha',s.parsha,'adults',q.adults,'minors',cardinality(q.children_ages),'cancelled_on_friday',h.cancelled_on_friday,'guest_phone',CASE WHEN h.status='confirmed' THEN gp.phone END,'host_phone',CASE WHEN h.status='confirmed' THEN pp.phone END,'address',CASE WHEN h.status='confirmed' THEN concat_ws(', ',hp.street_address,hp.neighborhood,hp.city) END) FROM public.host_profiles hp JOIN public.persons pp ON pp.id=hp.person_id JOIN public.persons gp ON gp.id=h.guest_id JOIN public.requests q ON q.id=(SELECT request_id FROM public.responses WHERE id=h.response_id) JOIN public.shabbatot s ON s.date=h.shabbat_date LEFT JOIN public.cities c ON c.name=hp.city WHERE hp.person_id=h.host_id);
END $$;
REVOKE ALL ON FUNCTION public.hosting_details(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.hosting_details(uuid) TO authenticated;
-- Only the authenticated app server can supply an astronomical candle time. Browser RPC callers cannot impersonate an actor or change this timing.
CREATE OR REPLACE FUNCTION public.cancel_confirmed_hosting(_id uuid,_actor uuid,_reason text,_note text,_candle timestamptz) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE h public.hostings; exceptional boolean; late boolean; host_cancel boolean; threshold numeric; late_threshold numeric; BEGIN
SELECT * INTO h FROM public.hostings WHERE id=_id AND _actor IN (guest_id,host_id); IF h.id IS NULL THEN RAISE EXCEPTION 'hosting_unavailable'; END IF;
PERFORM 1 FROM public.persons WHERE id=h.guest_id FOR UPDATE;
PERFORM 1 FROM public.availability WHERE id=h.availability_id FOR UPDATE;
SELECT * INTO h FROM public.hostings WHERE id=_id FOR UPDATE;
IF h.status<>'confirmed' OR _candle IS NULL THEN RAISE EXCEPTION 'hosting_unavailable'; END IF;
SELECT COALESCE((value#>>'{}')::numeric,24) INTO threshold FROM public.app_settings WHERE key='exceptional_cancellation_hours';
SELECT COALESCE((value#>>'{}')::numeric,72) INTO late_threshold FROM public.app_settings WHERE key='late_cancellation_hours';
host_cancel:=_actor=h.host_id;
exceptional:=host_cancel AND _candle-now()<make_interval(hours=>COALESCE(threshold,24)::int);
late:=_candle-now()<make_interval(hours=>COALESCE(late_threshold,72)::int);
IF exceptional THEN
IF _reason IS NULL OR _reason NOT IN ('illness','bereavement','other') OR COALESCE(length(trim(_note)),0)=0 THEN RAISE EXCEPTION 'exceptional_reason_required'; END IF;
ELSIF _reason IS NULL OR _reason NOT IN ('illness','bereavement','plans_changed','cannot_arrive','other') THEN RAISE EXCEPTION 'reason_required'; END IF;
IF COALESCE(length(_note),0)>2000 THEN RAISE EXCEPTION 'reason_required'; END IF;
UPDATE public.hostings SET status=CASE WHEN host_cancel THEN 'cancelled_host'::public.hosting_status ELSE 'cancelled_guest'::public.hosting_status END,cancelled_by=_actor,cancel_reason=_reason,cancel_note=nullif(trim(_note),''),cancelled_at=now(),candle_lighting_at=_candle,late_cancellation=late,exceptional_cancellation=exceptional,cancelled_on_friday=host_cancel AND extract(isodow FROM now() AT TIME ZONE 'Asia/Jerusalem')=5,attention_alert=CASE WHEN host_cancel THEN 'אורח נשאר בלי אירוח' WHEN late THEN 'ביטול מאוחר של אורח' END WHERE id=h.id;
UPDATE public.availability SET seats_left=LEAST(seats,seats_left+h.party_size) WHERE id=h.availability_id;
IF host_cancel THEN UPDATE public.requests SET status='active' WHERE id=(SELECT request_id FROM public.responses WHERE id=h.response_id); END IF;
INSERT INTO public.audit_log(actor_id,action,target_person_id,target_table,target_id,reason,details) VALUES(_actor,'hosting_cancelled',h.guest_id,'hostings',h.id::text,_reason,jsonb_build_object('late',late,'exceptional',exceptional,'urgent',host_cancel OR exceptional,'explanation',_note,'candle_lighting_at',_candle));
END $$;
REVOKE ALL ON FUNCTION public.cancel_confirmed_hosting(uuid,uuid,text,text,timestamptz) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.cancel_confirmed_hosting(uuid,uuid,text,text,timestamptz) TO service_role;