CREATE TEMP TABLE obsolete_demo_visits AS SELECT id,response_id FROM public.hostings WHERE guest_id='809f85d8-4640-4860-badc-45cba7b5fb4a' AND host_id='ed5895e3-934e-4220-91a1-f70cc937103c' AND status IN('cancelled_guest','cancelled_host') AND id::text NOT LIKE 'a450%' AND NOT EXISTS(SELECT 1 FROM public.feedback WHERE hosting_id=hostings.id) AND NOT EXISTS(SELECT 1 FROM public.flags WHERE hosting_id=hostings.id);
CREATE TEMP TABLE obsolete_demo_responses AS SELECT id,request_id FROM public.responses WHERE id IN(SELECT response_id FROM obsolete_demo_visits);
DELETE FROM public.staff_attention WHERE hosting_id IN(SELECT id FROM obsolete_demo_visits);
DELETE FROM public.staff_alert_handling WHERE source='hosting' AND source_id IN(SELECT id FROM obsolete_demo_visits);
DELETE FROM public.hostings WHERE id IN(SELECT id FROM obsolete_demo_visits);
DELETE FROM public.responses WHERE id IN(SELECT id FROM obsolete_demo_responses) AND NOT EXISTS(SELECT 1 FROM public.hostings WHERE response_id=responses.id);
DELETE FROM public.requests WHERE id IN(SELECT request_id FROM obsolete_demo_responses) AND NOT EXISTS(SELECT 1 FROM public.responses WHERE request_id=requests.id);
-- Seed proof: an out-of-scope person page is still refused.
DO $test$ BEGIN BEGIN PERFORM public.staff_workspace('2f79a37c-468f-4bf5-90c4-c0adef2190cc','cb1c9dd3-2c07-4d55-96b1-6b6cca38b73a'); RAISE EXCEPTION 'isolation test failed'; EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'Forbidden' THEN RAISE; END IF; END; END $test$;