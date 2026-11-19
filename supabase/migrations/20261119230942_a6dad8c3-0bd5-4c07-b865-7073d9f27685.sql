CREATE OR REPLACE FUNCTION public.guard_feedback_actions() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE uid uuid; BEGIN
uid:=COALESCE((to_jsonb(NEW)->>'guest_id')::uuid,(to_jsonb(NEW)->>'host_id')::uuid);
IF TG_OP='INSERT' OR (TG_TABLE_NAME='availability' AND to_jsonb(NEW)->>'status'='open' AND to_jsonb(OLD)->>'status'='cancelled') THEN
PERFORM 1 FROM public.persons WHERE id=uid FOR UPDATE;
IF EXISTS(SELECT 1 FROM public.persons WHERE id=uid AND restriction_status<>'none') THEN RAISE EXCEPTION 'profile_frozen'; END IF;
IF public.feedback_pending(uid) THEN RAISE EXCEPTION 'feedback_required'; END IF;
END IF; RETURN NEW; END $$;
DO $$ DECLARE def text; BEGIN
SELECT pg_get_functiondef('public.guest_ready(uuid)'::regprocedure) INTO def;
def:=replace(def,'AND p.restriction_status=''none''', 'AND p.restriction_status=''none'' AND NOT public.feedback_pending(_uid)'); EXECUTE def;
END $$;
CREATE OR REPLACE FUNCTION public.guard_confirm_restriction() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF TG_OP='INSERT' AND EXISTS(SELECT 1 FROM public.persons WHERE id IN(NEW.guest_id,NEW.host_id) AND restriction_status<>'none') THEN RAISE EXCEPTION 'profile_frozen'; END IF; RETURN NEW; END $$;
CREATE TRIGGER hostings_restriction_guard BEFORE INSERT ON public.hostings FOR EACH ROW EXECUTE FUNCTION public.guard_confirm_restriction();
REVOKE ALL ON FUNCTION public.guard_confirm_restriction() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.scrub_cancelled_notifications() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF NEW.status IN('cancelled_guest','cancelled_host','cancelled_staff') AND NEW.status IS DISTINCT FROM OLD.status THEN
UPDATE public.notifications SET body='האירוח בוטל. פרטי הקשר אינם זמינים עוד.',variables='{}'::jsonb,status=CASE WHEN channel='inbox' THEN status ELSE 'cancelled' END WHERE template='awaiting_you' AND event_key IN(SELECT event_key FROM public.notification_events WHERE entity_id=NEW.response_id AND template='awaiting_you');
END IF; RETURN NEW; END $$;
CREATE TRIGGER cancelled_message_privacy AFTER UPDATE ON public.hostings FOR EACH ROW EXECUTE FUNCTION public.scrub_cancelled_notifications();
REVOKE ALL ON FUNCTION public.scrub_cancelled_notifications() FROM PUBLIC,anon,authenticated;
INSERT INTO public.shabbatot(date,parsha) VALUES('2026-11-14','תולדות') ON CONFLICT(date) DO NOTHING;
INSERT INTO public.availability(id,host_id,shabbat_date,unit,with_lodging,seats,seats_left,beds) VALUES('dddddddd-0000-4000-8000-000000000001','ed5895e3-934e-4220-91a1-f70cc937103c','2026-11-14','full_shabbat',true,4,0,4);
INSERT INTO public.requests(id,guest_id,shabbat_date,party_type,adults,children_ages,unit,with_lodging,status) VALUES('dddddddd-0000-4000-8000-000000000002','809f85d8-4640-4860-badc-45cba7b5fb4a','2026-11-14','family',2,ARRAY[0,0],'full_shabbat',true,'closed');
INSERT INTO public.responses(id,request_id,availability_id,guest_id,host_id,status) VALUES('dddddddd-0000-4000-8000-000000000003','dddddddd-0000-4000-8000-000000000002','dddddddd-0000-4000-8000-000000000001','809f85d8-4640-4860-badc-45cba7b5fb4a','ed5895e3-934e-4220-91a1-f70cc937103c','accepted');
INSERT INTO public.hostings(id,response_id,availability_id,guest_id,host_id,shabbat_date,party_size,status,contact_method) VALUES('dddddddd-0000-4000-8000-000000000004','dddddddd-0000-4000-8000-000000000003','dddddddd-0000-4000-8000-000000000001','809f85d8-4640-4860-badc-45cba7b5fb4a','ed5895e3-934e-4220-91a1-f70cc937103c','2026-11-14',4,'took_place','whatsapp');