CREATE OR REPLACE FUNCTION public.is_app_member(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.persons WHERE id = _uid)
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid)
  )
$$;
REVOKE ALL ON FUNCTION public.is_app_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_app_member(uuid) TO authenticated;

DROP POLICY IF EXISTS "signed-in read cities" ON public.cities;
CREATE POLICY "members read cities" ON public.cities FOR SELECT TO authenticated USING (public.is_app_member(auth.uid()));
DROP POLICY IF EXISTS "signed-in read shabbatot" ON public.shabbatot;
CREATE POLICY "members read shabbatot" ON public.shabbatot FOR SELECT TO authenticated USING (public.is_app_member(auth.uid()));
DROP POLICY IF EXISTS "signed-in read app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "signed-in read settings" ON public.app_settings;
CREATE POLICY "members read app_settings" ON public.app_settings FOR SELECT TO authenticated USING (public.is_app_member(auth.uid()));