ALTER TABLE public.guest_profiles ADD COLUMN food_preferences text, ADD COLUMN weekly_prompt_week date;
CREATE OR REPLACE FUNCTION public.validate_guest_food() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF public.contains_contact_info(NEW.food_preferences) THEN RAISE EXCEPTION 'contact_info_not_allowed'; END IF; RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION public.validate_guest_food() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guest_food BEFORE INSERT OR UPDATE ON public.guest_profiles FOR EACH ROW EXECUTE FUNCTION public.validate_guest_food();
CREATE OR REPLACE FUNCTION public.acknowledge_guest_week(_unit public.hosting_unit,_lodging boolean,_food text,_sensitivities text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE today date := (now() AT TIME ZONE 'Asia/Jerusalem')::date; week_start date;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authorized'; END IF;
 week_start:=today-extract(dow FROM today)::integer;
 PERFORM 1 FROM public.guest_profiles WHERE person_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'guest_not_found'; END IF;
 IF EXISTS(SELECT 1 FROM public.guest_profiles WHERE person_id=auth.uid() AND weekly_prompt_week=week_start) THEN RETURN; END IF;
 UPDATE public.guest_profiles SET default_unit=_unit,default_with_lodging=_lodging,food_preferences=_food,food_sensitivities=_sensitivities,weekly_prompt_week=week_start WHERE person_id=auth.uid();
END; $$;
REVOKE ALL ON FUNCTION public.acknowledge_guest_week(public.hosting_unit,boolean,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.acknowledge_guest_week(public.hosting_unit,boolean,text,text) TO authenticated;