INSERT INTO public.shabbatot(date,parsha,special) VALUES ('2027-02-13','תרומה',NULL),('2027-02-20','תצוה',NULL),('2027-02-27','כי תשא',NULL),('2027-03-06','ויקהל','שבת שקלים') ON CONFLICT(date) DO UPDATE SET parsha=excluded.parsha,special=excluded.special;
UPDATE public.shabbatot SET special=NULL WHERE date='2027-02-06';
INSERT INTO public.app_settings(key,value) VALUES ('guest_cutoff_hour','20'),('ranking_weights','{"distance":25,"food":20,"age":15,"interests":10,"familiarity":10,"house_character":10,"feedback":5,"extra_language":5}') ON CONFLICT(key) DO UPDATE SET value=excluded.value;
CREATE OR REPLACE FUNCTION public.guest_ready(_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.persons p JOIN public.identity_checks i ON i.person_id=p.id JOIN public.guest_profiles g ON g.person_id=p.id WHERE p.id=_uid AND p.onboarding_step='done' AND p.phone_verified_at IS NOT NULL AND i.status='passed' AND p.restriction_status='none' AND g.charter_accepted_at IS NOT NULL AND g.status IN ('active','pending')) $$;
REVOKE ALL ON FUNCTION public.guest_ready(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.guest_ready(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.invitation_before_cutoff(_date date) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT _date>(now() AT TIME ZONE 'Asia/Jerusalem')::date AND (now() AT TIME ZONE 'Asia/Jerusalem')<(_date-2)+make_interval(hours=>COALESCE((SELECT (value::text)::int FROM public.app_settings WHERE key='guest_cutoff_hour'),20)) $$;
REVOKE ALL ON FUNCTION public.invitation_before_cutoff(date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.invitation_before_cutoff(date) TO authenticated;
CREATE OR REPLACE FUNCTION public.invitation_eligible(_uid uuid,_availability uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.guest_ready(_uid) AND EXISTS(SELECT 1 FROM public.availability a JOIN public.host_profiles h ON h.person_id=a.host_id JOIN public.persons hp ON hp.id=h.person_id JOIN public.guest_profiles g ON g.person_id=_uid LEFT JOIN public.cities c ON c.name=h.city WHERE a.id=_availability AND a.status='open' AND a.seats_left>=g.party_adults+g.minor_children_count AND (NOT a.with_lodging OR a.beds>=g.party_adults+g.minor_children_count) AND h.approval='approved' AND h.status='active' AND hp.restriction_status='none' AND public.invitation_before_cutoff(a.shabbat_date) AND a.unit=g.default_unit AND a.with_lodging=g.default_with_lodging AND (NOT a.with_lodging OR (h.rule_separate_room AND h.rule_lockable_door)) AND h.languages && g.languages AND (g.area_all_israel OR c.region=ANY(g.regions)) AND (h.guest_gender_pref='everyone' OR (h.guest_gender_pref='women_only' AND g.gender='female' AND g.party_adults=1 AND g.minor_children_count=0) OR (h.guest_gender_pref='men_only' AND g.gender='male' AND g.party_adults=1 AND g.minor_children_count=0) OR (h.guest_gender_pref='families_couples' AND g.party_adults+g.minor_children_count>1))) $$;
REVOKE ALL ON FUNCTION public.invitation_eligible(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.invitation_eligible(uuid,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.expire_my_responses() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
 UPDATE public.responses SET status='expired',answered_at=now() WHERE status='pending' AND expires_at<=now() AND (guest_id=auth.uid() OR host_id=auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.expire_my_responses() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.expire_my_responses() TO authenticated;
CREATE OR REPLACE FUNCTION public.list_guest_invitations() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT public.guest_ready(auth.uid()) THEN RAISE EXCEPTION 'registration_required'; END IF;
 RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id,'host_id',h.person_id,'date',a.shabbat_date,'parsha',s.parsha,'unit',a.unit,'with_lodging',a.with_lodging,'seats_left',a.seats_left,'beds',a.beds,'family_name',h.family_name,'city',h.city,'region',c.region,'neighborhood',h.neighborhood,'about',h.about,'food_offer',h.food_offer,'cannot_provide',h.cannot_provide,'house_character',h.house_character,'interests',h.interests,'languages',h.languages,'husband_age',h.husband_age,'wife_age',h.wife_age,'lat',c.lat,'lng',c.lng,'feedback_count',(SELECT count(*) FROM public.feedback f WHERE f.hosting_id IN(SELECT id FROM public.hostings WHERE host_id=h.person_id) AND f.author_role='guest' AND f.took_place IN ('yes','partial') AND f.answers->>'overall' IS NOT NULL),'feedback_excellent',(SELECT count(*) FROM public.feedback f WHERE f.hosting_id IN(SELECT id FROM public.hostings WHERE host_id=h.person_id) AND f.author_role='guest' AND f.took_place IN ('yes','partial') AND f.answers->>'overall'='מעולה'))) FROM public.availability a JOIN public.host_profiles h ON h.person_id=a.host_id JOIN public.shabbatot s ON s.date=a.shabbat_date LEFT JOIN public.cities c ON c.name=h.city WHERE public.invitation_eligible(auth.uid(),a.id)), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.list_guest_invitations() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_guest_invitations() TO authenticated;
CREATE OR REPLACE FUNCTION public.add_host_shabbat(_date date,_unit public.hosting_unit,_lodging boolean,_seats int,_beds int) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE result uuid; BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.host_profiles h JOIN public.persons p ON p.id=h.person_id WHERE h.person_id=auth.uid() AND p.onboarding_step='done' AND p.restriction_status='none') THEN RAISE EXCEPTION 'host_required'; END IF;
 IF _date<(now() AT TIME ZONE 'Asia/Jerusalem')::date OR _date>((now() AT TIME ZONE 'Asia/Jerusalem')::date+interval '3 months')::date OR extract(dow FROM _date)<>6 THEN RAISE EXCEPTION 'invalid_shabbat'; END IF;
 IF _seats<1 OR _beds<0 OR (_unit='full_shabbat' AND NOT _lodging) OR (_lodging AND (_beds<1 OR NOT EXISTS(SELECT 1 FROM public.host_profiles WHERE person_id=auth.uid() AND rule_separate_room AND rule_lockable_door))) THEN RAISE EXCEPTION 'invalid_capacity'; END IF;
 INSERT INTO public.availability(host_id,shabbat_date,unit,with_lodging,seats,seats_left,beds) VALUES(auth.uid(),_date,_unit,_lodging,_seats,_seats,CASE WHEN _lodging THEN _beds ELSE 0 END) RETURNING id INTO result;
 UPDATE public.host_profiles SET default_unit=_unit,default_with_lodging=_lodging,default_seats=_seats,default_beds=_beds WHERE person_id=auth.uid();
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.add_host_shabbat(date,public.hosting_unit,boolean,int,int) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.add_host_shabbat(date,public.hosting_unit,boolean,int,int) TO authenticated;
CREATE OR REPLACE FUNCTION public.change_host_shabbat(_id uuid,_action text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE a public.availability; BEGIN
 SELECT * INTO a FROM public.availability WHERE id=_id AND host_id=auth.uid() FOR UPDATE;
 IF a.id IS NULL THEN RAISE EXCEPTION 'host_required'; END IF;
 IF EXISTS(SELECT 1 FROM public.hostings WHERE availability_id=_id AND status IN ('confirmed','under_review')) THEN RAISE EXCEPTION 'hosting_exists'; END IF;
 IF _action='delete' THEN
 IF EXISTS(SELECT 1 FROM public.responses WHERE availability_id=_id) THEN RAISE EXCEPTION 'responses_exist'; END IF;
 DELETE FROM public.availability WHERE id=_id AND host_id=auth.uid();
 ELSIF _action='cancel' THEN
 UPDATE public.availability SET status='cancelled' WHERE id=_id;
 UPDATE public.responses SET status='expired',answered_at=now() WHERE availability_id=_id AND status='pending';
 ELSIF _action='reopen' THEN UPDATE public.availability SET status=CASE WHEN seats_left=0 THEN 'full'::public.availability_status ELSE 'open'::public.availability_status END WHERE id=_id;
 ELSE RAISE EXCEPTION 'invalid_action'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.change_host_shabbat(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.change_host_shabbat(uuid,text) TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.availability FROM authenticated;
CREATE OR REPLACE FUNCTION public.respond_to_invitation(_availability uuid,_message text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE a public.availability; g public.guest_profiles; r uuid; result uuid; BEGIN
 PERFORM 1 FROM public.persons WHERE id=auth.uid() FOR UPDATE;
 PERFORM public.expire_my_responses();
 IF NOT public.invitation_eligible(auth.uid(),_availability) THEN RAISE EXCEPTION 'invitation_unavailable'; END IF;
 IF length(_message)>1000 OR public.contains_contact_info(_message) THEN RAISE EXCEPTION 'contact_info_not_allowed'; END IF;
 SELECT * INTO a FROM public.availability WHERE id=_availability FOR UPDATE;
 IF (SELECT count(*) FROM public.responses WHERE guest_id=auth.uid() AND status='pending')>=3 THEN RAISE EXCEPTION 'response_limit'; END IF;
 IF EXISTS(SELECT 1 FROM public.responses WHERE guest_id=auth.uid() AND availability_id=_availability AND status IN ('pending','accepted')) THEN RAISE EXCEPTION 'already_responded'; END IF;
 SELECT * INTO g FROM public.guest_profiles WHERE person_id=auth.uid();
 INSERT INTO public.requests(guest_id,shabbat_date,party_type,adults,children_ages,unit,with_lodging) VALUES(auth.uid(),a.shabbat_date,g.party_type,g.party_adults,array_fill(0,ARRAY[g.minor_children_count]),a.unit,a.with_lodging) RETURNING id INTO r;
 INSERT INTO public.responses(request_id,availability_id,guest_id,host_id,message,expires_at) VALUES(r,a.id,auth.uid(),a.host_id,trim(_message),now()+interval '24 hours') RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.respond_to_invitation(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.respond_to_invitation(uuid,text) TO authenticated;
INSERT INTO public.availability(id,host_id,shabbat_date,unit,with_lodging,seats,seats_left,beds) VALUES ('cccccccc-0000-4000-8000-000000000001','ed5895e3-934e-4220-91a1-f70cc937103c','2026-11-21','full_shabbat',true,6,6,6),('cccccccc-0000-4000-8000-000000000002','ed5895e3-934e-4220-91a1-f70cc937103c','2026-11-28','full_shabbat',true,4,4,4),('cccccccc-0000-4000-8000-000000000003','ed5895e3-934e-4220-91a1-f70cc937103c','2026-12-05','full_shabbat',true,5,5,5),('cccccccc-0000-4000-8000-000000000004','ed5895e3-934e-4220-91a1-f70cc937103c','2026-12-12','full_shabbat',true,3,3,3) ON CONFLICT(id) DO NOTHING;
UPDATE public.host_profiles SET interests=ARRAY['מוזיקה','טבע וטיולים'],food_offer='ארוחות ביתיות, אפשרות לצמחונות בתיאום',house_character='בית משפחתי ושקט',about='משפחה בדיונית מירושלים, נשמח לשבת נעימה ולשיחה סביב השולחן.' WHERE person_id='ed5895e3-934e-4220-91a1-f70cc937103c';