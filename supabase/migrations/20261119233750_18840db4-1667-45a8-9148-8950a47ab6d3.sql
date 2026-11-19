CREATE OR REPLACE FUNCTION public.capture_notification_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$ DECLARE uid uuid; template text; key text; n jsonb:=to_jsonb(NEW); o jsonb:=CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END; BEGIN
IF TG_TABLE_NAME='responses' THEN
IF TG_OP='INSERT' AND n->>'status'='pending' THEN uid:=(n->>'host_id')::uuid; template:='new_response';
ELSIF n->>'status' IS DISTINCT FROM o->>'status' THEN uid:=(n->>'guest_id')::uuid; template:=CASE n->>'status' WHEN 'accepted' THEN 'awaiting_you' WHEN 'declined' THEN 'response_declined' WHEN 'expired' THEN 'response_expired' END; END IF;
ELSIF TG_TABLE_NAME='hostings' THEN
IF n->>'status' IS DISTINCT FROM o->>'status' AND n->>'status' IN('cancelled_guest','cancelled_host') THEN uid:=(CASE WHEN n->>'status'='cancelled_guest' THEN n->>'host_id' ELSE n->>'guest_id' END)::uuid;template:='hosting_cancelled'; END IF;
ELSIF TG_TABLE_NAME='host_profiles' THEN
IF n->>'approval' IS DISTINCT FROM o->>'approval' AND n->>'approval' IN('approved','rejected') THEN uid:=(n->>'person_id')::uuid; template:=CASE WHEN n->>'approval'='approved' THEN 'host_approved' ELSE 'host_rejected' END; END IF;
END IF;
IF uid IS NOT NULL AND template IS NOT NULL THEN key:=TG_TABLE_NAME||':'||COALESCE(n->>'id',n->>'person_id')||':'||template||':'||n->>'updated_at'; INSERT INTO public.notification_events(person_id,template,entity_id,event_key) VALUES(uid,template,COALESCE((n->>'id')::uuid,(n->>'person_id')::uuid),key) ON CONFLICT(event_key) DO NOTHING; END IF; RETURN NEW; END $fn$;
DO $$ DECLARE demo uuid:='2f79a37c-468f-4bf5-90c4-c0adef2190cc'; guest uuid:='809f85d8-4640-4860-badc-45cba7b5fb4a'; host uuid:='ed5895e3-934e-4220-91a1-f70cc937103c'; w jsonb; BEGIN
w:=public.staff_workspace(demo); IF jsonb_array_length(w->'people')<>2 OR w->>'role'<>'rep' THEN RAISE EXCEPTION 'staff_scope_test'; END IF;
BEGIN PERFORM public.staff_workspace(demo,'cb1c9dd3-2c07-4d55-96b1-6b6cca38b73a'); RAISE EXCEPTION 'scope_test_failed'; EXCEPTION WHEN OTHERS THEN IF SQLERRM='scope_test_failed' THEN RAISE; END IF; END;
BEGIN PERFORM public.staff_review_action(demo,'freeze',guest,' '); RAISE EXCEPTION 'note_test_failed'; EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'reason_required' THEN RAISE; END IF; END;
BEGIN PERFORM public.staff_review_action(demo,'approve',host,'',NULL,NULL,true,false); RAISE EXCEPTION 'check_test_failed'; EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'checklist_required' THEN RAISE; END IF; END;
BEGIN PERFORM public.staff_review_action(demo,'suspend',guest,'test',now()-interval '1 day'); RAISE EXCEPTION 'date_test_failed'; EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'future_date_required' THEN RAISE; END IF; END;
BEGIN
PERFORM public.staff_review_action(demo,'freeze',guest,'Rollback-only staff test'); IF NOT EXISTS(SELECT 1 FROM public.persons WHERE id=guest AND restriction_status='frozen') THEN RAISE EXCEPTION 'freeze_test_failed'; END IF;
PERFORM public.staff_review_action(demo,'unfreeze',guest,'Rollback-only release'); IF NOT EXISTS(SELECT 1 FROM public.audit_log WHERE actor_id=demo AND action='staff_unfreeze' AND reason='Rollback-only release') THEN RAISE EXCEPTION 'audit_test_failed'; END IF;
UPDATE public.identity_checks SET attempts=3,status='manual_review' WHERE person_id=guest;
PERFORM public.staff_review_action(demo,'verify',guest,'Rollback-only video call'); IF NOT EXISTS(SELECT 1 FROM public.identity_checks WHERE person_id=guest AND status='passed') THEN RAISE EXCEPTION 'manual_test_failed'; END IF;
PERFORM public.staff_review_action(demo,'approve',host,'Rollback-only checklist',NULL,NULL,true,true);
RAISE EXCEPTION 'rollback_success'; EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'rollback_success' THEN RAISE; END IF; END;
END $$;