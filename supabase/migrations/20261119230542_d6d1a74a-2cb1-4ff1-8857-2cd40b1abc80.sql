DO $$ DECLARE def text; BEGIN
SELECT pg_get_functiondef('public.feedback_state()'::regprocedure) INTO def; def:=replace(replace(def,'public.feedback_state()','public.feedback_state(_actor uuid)'),'auth.uid()','_actor'); EXECUTE def;
SELECT pg_get_functiondef('public.submit_hosting_feedback(uuid,public.took_place,text,text)'::regprocedure) INTO def; def:=replace(replace(def,'_details text)','_details text, _actor uuid)'),'auth.uid()','_actor'); EXECUTE def;
END $$;
REVOKE ALL ON FUNCTION public.feedback_state(),public.feedback_state(uuid),public.submit_hosting_feedback(uuid,public.took_place,text,text),public.submit_hosting_feedback(uuid,public.took_place,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.feedback_state(uuid),public.submit_hosting_feedback(uuid,public.took_place,text,text,uuid) TO service_role;