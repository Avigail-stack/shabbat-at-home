REVOKE EXECUTE ON FUNCTION public.feedback_pending(uuid) FROM authenticated;
COMMENT ON FUNCTION public.feedback_state() IS 'AUTHENTICATED EXECUTE INTENTIONAL: returns only the caller participant status, never answers; required for mandatory-feedback UI.';
COMMENT ON FUNCTION public.submit_hosting_feedback(uuid,public.took_place,text,text) IS 'AUTHENTICATED EXECUTE INTENTIONAL: validates caller participation, immutable uniqueness and server-owned havdalah deadline before writing.';
CREATE INDEX notification_events_person ON public.notification_events(person_id);