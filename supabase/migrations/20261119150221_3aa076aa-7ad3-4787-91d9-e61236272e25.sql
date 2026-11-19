REVOKE ALL ON FUNCTION public.guard_registration_order() FROM PUBLIC,anon,authenticated;
CREATE POLICY "server only phone proofs" ON public.registration_phone_proofs FOR ALL TO service_role USING(auth.role()='service_role') WITH CHECK(auth.role()='service_role');
CREATE INDEX registration_phone_proofs_consumed_by_idx ON public.registration_phone_proofs(consumed_by);
COMMENT ON FUNCTION public.claim_registration_phone(text) IS 'Intentionally authenticated: validates auth.uid(), locks owner person and consumes a single-use expiring proof.';
COMMENT ON FUNCTION public.submit_mock_identity(boolean,boolean,boolean) IS 'Portfolio mock only. Intentionally authenticated: owner-only, phone prerequisite, locked row and authoritative three-attempt cap.';