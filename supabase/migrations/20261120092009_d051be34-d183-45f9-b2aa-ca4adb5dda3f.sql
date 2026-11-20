CREATE TABLE public.demo_participants(person_id uuid PRIMARY KEY REFERENCES public.persons(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.demo_participants TO service_role;
ALTER TABLE public.demo_participants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER demo_participants_updated BEFORE UPDATE ON public.demo_participants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.demo_participants(person_id) VALUES('809f85d8-4640-4860-badc-45cba7b5fb4a'),('ed5895e3-934e-4220-91a1-f70cc937103c');
-- Replace every sibling scope check, not roles or staff access.
DO $scope$ DECLARE f record; definition text; BEGIN
 FOR f IN SELECT oid FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN('staff_workspace_base','staff_workspace','staff_review_action','refresh_staff_attention','staff_operations','staff_hosting_action','staff_attention_action','staff_timed_rules') LOOP
 definition:=pg_get_functiondef(f.oid);
 definition:=replace(definition,$s$id IN('809f85d8-4640-4860-badc-45cba7b5fb4a','ed5895e3-934e-4220-91a1-f70cc937103c')$s$,'id IN(SELECT person_id FROM public.demo_participants)');
 definition:=replace(definition,$s$host_id='ed5895e3-934e-4220-91a1-f70cc937103c'$s$,'host_id IN(SELECT person_id FROM public.demo_participants)');
 definition:=replace(definition,$s$guest_id='809f85d8-4640-4860-badc-45cba7b5fb4a'$s$,'guest_id IN(SELECT person_id FROM public.demo_participants)');
 definition:=replace(definition,$s$target_person NOT IN('809f85d8-4640-4860-badc-45cba7b5fb4a','ed5895e3-934e-4220-91a1-f70cc937103c')$s$,'target_person NOT IN(SELECT person_id FROM public.demo_participants)');
 definition:=replace(definition,$s$a.person_id NOT IN('809f85d8-4640-4860-badc-45cba7b5fb4a','ed5895e3-934e-4220-91a1-f70cc937103c')$s$,'a.person_id NOT IN(SELECT person_id FROM public.demo_participants)');
 definition:=replace(definition,$s$h.guest_id<>'809f85d8-4640-4860-badc-45cba7b5fb4a' OR h.host_id<>'ed5895e3-934e-4220-91a1-f70cc937103c'$s$,'h.guest_id NOT IN(SELECT person_id FROM public.demo_participants) OR h.host_id NOT IN(SELECT person_id FROM public.demo_participants)');
 EXECUTE definition;
 END LOOP;
END $scope$;