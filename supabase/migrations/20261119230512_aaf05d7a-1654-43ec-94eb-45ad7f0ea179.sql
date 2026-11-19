CREATE TABLE public.notification_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,template text NOT NULL,entity_id uuid,event_key text NOT NULL UNIQUE,processed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.notification_events TO service_role;
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service processes event log" ON public.notification_events TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER notification_events_updated BEFORE UPDATE ON public.notification_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.notifications ADD COLUMN send_after timestamptz,ADD COLUMN event_key text;
CREATE UNIQUE INDEX notifications_event_channel ON public.notifications(event_key,channel);
REVOKE UPDATE ON public.notifications FROM authenticated; GRANT UPDATE(read_at) ON public.notifications TO authenticated;
ALTER TABLE public.hostings ADD COLUMN feedback_opens_at timestamptz;
ALTER TABLE public.flags ADD COLUMN received_during_shabbat boolean NOT NULL DEFAULT false;
REVOKE INSERT,SELECT ON public.feedback FROM authenticated; GRANT SELECT ON public.feedback TO authenticated;
DROP POLICY "own feedback or staff read" ON public.feedback;
CREATE POLICY "organization reads feedback" ON public.feedback FOR SELECT TO authenticated USING(public.is_staff(auth.uid()));
CREATE OR REPLACE FUNCTION public.feedback_pending(_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.hostings h WHERE _uid IN(h.guest_id,h.host_id) AND h.status IN('confirmed','took_place','did_not_take_place') AND COALESCE(h.feedback_opens_at,(h.shabbat_date+2)::timestamptz)<=now() AND NOT EXISTS(SELECT 1 FROM public.feedback f WHERE f.hosting_id=h.id AND f.author_id=_uid)) $$;
REVOKE ALL ON FUNCTION public.feedback_pending(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.feedback_pending(uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.guard_feedback_actions() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE uid uuid; BEGIN
uid:=CASE WHEN TG_TABLE_NAME='responses' THEN NEW.guest_id ELSE NEW.host_id END;
IF (TG_OP='INSERT' OR (TG_TABLE_NAME='availability' AND NEW.status='open' AND OLD.status='cancelled')) THEN
PERFORM 1 FROM public.persons WHERE id=uid FOR UPDATE;
IF EXISTS(SELECT 1 FROM public.persons WHERE id=uid AND restriction_status<>'none') THEN RAISE EXCEPTION 'profile_frozen'; END IF;
IF public.feedback_pending(uid) THEN RAISE EXCEPTION 'feedback_required'; END IF;
END IF; RETURN NEW; END $$;
CREATE TRIGGER availability_feedback_guard BEFORE INSERT OR UPDATE ON public.availability FOR EACH ROW EXECUTE FUNCTION public.guard_feedback_actions();
CREATE TRIGGER response_feedback_guard BEFORE INSERT ON public.responses FOR EACH ROW EXECUTE FUNCTION public.guard_feedback_actions();
CREATE OR REPLACE FUNCTION public.capture_notification_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE uid uuid; template text; key text; BEGIN
IF TG_TABLE_NAME='responses' THEN
IF TG_OP='INSERT' THEN uid:=NEW.host_id; template:='new_response';
ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
IF NEW.status='accepted' THEN uid:=NEW.guest_id; template:='awaiting_you'; ELSIF NEW.status='declined' THEN uid:=NEW.guest_id; template:='response_declined'; ELSIF NEW.status='expired' THEN uid:=NEW.guest_id; template:='response_expired'; END IF; END IF;
ELSIF TG_TABLE_NAME='hostings' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN('cancelled_guest','cancelled_host') THEN uid:=CASE WHEN NEW.status='cancelled_guest' THEN NEW.host_id ELSE NEW.guest_id END;template:='hosting_cancelled';
ELSIF TG_TABLE_NAME='host_profiles' AND NEW.approval IS DISTINCT FROM OLD.approval AND NEW.approval IN('approved','rejected') THEN uid:=NEW.person_id;template:=CASE WHEN NEW.approval='approved' THEN 'host_approved' ELSE 'host_rejected' END;
END IF;
IF uid IS NOT NULL THEN key:=TG_TABLE_NAME||':'||COALESCE(to_jsonb(NEW)->>'id',to_jsonb(NEW)->>'person_id')||':'||template||':'||NEW.updated_at::text;
INSERT INTO public.notification_events(person_id,template,entity_id,event_key) VALUES(uid,template,COALESCE((to_jsonb(NEW)->>'id')::uuid,(to_jsonb(NEW)->>'person_id')::uuid),key) ON CONFLICT(event_key) DO NOTHING;
END IF; RETURN NEW; END $$;
CREATE TRIGGER responses_notify AFTER INSERT OR UPDATE ON public.responses FOR EACH ROW EXECUTE FUNCTION public.capture_notification_event();
CREATE TRIGGER hostings_notify AFTER UPDATE ON public.hostings FOR EACH ROW EXECUTE FUNCTION public.capture_notification_event();
CREATE TRIGGER approval_notify AFTER UPDATE ON public.host_profiles FOR EACH ROW EXECUTE FUNCTION public.capture_notification_event();
CREATE OR REPLACE FUNCTION public.feedback_state() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT COALESCE(jsonb_agg(jsonb_build_object('id',h.id,'date',h.shabbat_date,'side',CASE WHEN h.guest_id=auth.uid() THEN 'guest' ELSE 'host' END,'due',COALESCE(h.feedback_opens_at,(h.shabbat_date+2)::timestamptz)<=now(),'answered',EXISTS(SELECT 1 FROM public.feedback f WHERE f.hosting_id=h.id AND f.author_id=auth.uid()))),'[]'::jsonb) FROM public.hostings h WHERE auth.uid() IN(h.guest_id,h.host_id) AND h.status IN('confirmed','took_place','did_not_take_place') $$;
REVOKE ALL ON FUNCTION public.feedback_state() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.feedback_state() TO authenticated;
CREATE OR REPLACE FUNCTION public.submit_hosting_feedback(_id uuid,_took public.took_place,_overall text,_details text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE h public.hostings; role public.app_role; bad_count int; BEGIN
SELECT * INTO h FROM public.hostings WHERE id=_id AND auth.uid() IN(guest_id,host_id) FOR UPDATE;
IF h.id IS NULL OR h.status NOT IN('confirmed','took_place','did_not_take_place') OR h.feedback_opens_at IS NULL OR h.feedback_opens_at>now() THEN RAISE EXCEPTION 'feedback_not_open'; END IF;
IF _took IS NULL OR (_took<>'no' AND (_overall IS NULL OR _overall NOT IN('מעולה','נחמד','לא טוב','אחר') OR (_overall IN('לא טוב','אחר') AND COALESCE(length(trim(_details)),0)=0))) OR COALESCE(length(_details),0)>2000 THEN RAISE EXCEPTION 'feedback_invalid'; END IF;
role:=CASE WHEN h.guest_id=auth.uid() THEN 'guest'::public.app_role ELSE 'host'::public.app_role END;
INSERT INTO public.feedback(hosting_id,author_id,author_role,took_place,answers,free_text) VALUES(h.id,auth.uid(),role,_took,CASE WHEN _took='no' THEN '{}'::jsonb ELSE jsonb_build_object('overall',_overall) END,CASE WHEN _took='no' THEN NULL ELSE nullif(trim(_details),'') END);
IF _took='partial' OR (_took<>'no' AND _overall='לא טוב') THEN
SELECT count(*) INTO bad_count FROM (SELECT f.answers->>'overall' AS answer FROM public.feedback f JOIN public.hostings x ON x.id=f.hosting_id WHERE x.host_id=h.host_id AND f.author_role='guest' AND f.took_place<>'no' ORDER BY x.shabbat_date DESC,f.created_at DESC LIMIT 2) last_two WHERE answer='לא טוב';
INSERT INTO public.audit_log(actor_id,action,target_person_id,target_table,target_id,details) VALUES(auth.uid(),'feedback_attention',CASE WHEN role='guest' THEN h.host_id ELSE h.guest_id END,'feedback',h.id::text,jsonb_build_object('partial',_took='partial','bad',_overall='לא טוב','strong',role='guest' AND bad_count=2));
END IF; END $$;
REVOKE ALL ON FUNCTION public.submit_hosting_feedback(uuid,public.took_place,text,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.submit_hosting_feedback(uuid,public.took_place,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.report_hosting_problem(_id uuid,_actor uuid,_description text,_shabbat boolean) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE h public.hostings; target uuid; result uuid; BEGIN
SELECT * INTO h FROM public.hostings WHERE id=_id AND _actor IN(guest_id,host_id); IF h.id IS NULL OR COALESCE(length(trim(_description)),0)=0 OR length(_description)>2000 THEN RAISE EXCEPTION 'flag_invalid'; END IF;
target:=CASE WHEN _actor=h.guest_id THEN h.host_id ELSE h.guest_id END;
PERFORM 1 FROM public.persons WHERE id=target FOR UPDATE;
INSERT INTO public.flags(reporter_id,reported_person_id,hosting_id,description,received_during_shabbat) VALUES(_actor,target,h.id,trim(_description),_shabbat) RETURNING id INTO result;
UPDATE public.persons SET restriction_status=CASE WHEN restriction_status='none' THEN 'frozen'::public.restriction_status ELSE restriction_status END WHERE id=target;
INSERT INTO public.restrictions(person_id,kind,reason,source_flag_id) VALUES(target,'freeze','דיווח על בעיה חמורה',result);
INSERT INTO public.audit_log(actor_id,action,target_person_id,target_table,target_id,details) VALUES(_actor,'urgent_flag',target,'flags',result::text,jsonb_build_object('urgent',true,'received_during_shabbat',_shabbat)); RETURN result; END $$;
REVOKE ALL ON FUNCTION public.report_hosting_problem(uuid,uuid,text,boolean) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.report_hosting_problem(uuid,uuid,text,boolean) TO service_role;
REVOKE ALL ON FUNCTION public.capture_notification_event(),public.guard_feedback_actions() FROM PUBLIC,anon,authenticated;
COMMENT ON FUNCTION public.feedback_state() IS 'Authenticated participant-only status projection; no organization-only answers.';
COMMENT ON FUNCTION public.submit_hosting_feedback(uuid,public.took_place,text,text) IS 'Authenticated participant action with server-set havdalah deadline and immutable feedback.';
COMMENT ON FUNCTION public.feedback_pending(uuid) IS 'Boolean action-eligibility helper; never exposes feedback answers.';