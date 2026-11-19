DO $$ DECLARE def text; BEGIN SELECT pg_get_functiondef('public.capture_notification_event()'::regprocedure) INTO def;def:=replace(def,'IF TG_OP=''INSERT'' THEN uid:=', 'IF TG_OP=''INSERT'' AND NEW.status=''pending'' THEN uid:='); EXECUTE def; END $$;
DO $$ DECLARE result uuid; frozen public.restriction_status; BEGIN
BEGIN
result:=public.report_hosting_problem('dddddddd-0000-4000-8000-000000000004','809f85d8-4640-4860-badc-45cba7b5fb4a','Database regression test: mock report',true);
SELECT restriction_status INTO frozen FROM public.persons WHERE id='ed5895e3-934e-4220-91a1-f70cc937103c';
IF frozen<>'frozen' OR NOT EXISTS(SELECT 1 FROM public.flags WHERE id=result AND received_during_shabbat) THEN RAISE EXCEPTION 'flag regression failed'; END IF;
RAISE EXCEPTION 'test rollback' USING ERRCODE='P0002';
EXCEPTION WHEN SQLSTATE 'P0002' THEN NULL; END;
IF EXISTS(SELECT 1 FROM information_schema.role_table_grants WHERE grantee='authenticated' AND table_name='feedback' AND privilege_type='INSERT') THEN RAISE EXCEPTION 'feedback write grant regression'; END IF;
END $$;