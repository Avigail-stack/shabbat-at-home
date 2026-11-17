DROP POLICY IF EXISTS "signed-in read cities" ON public.cities;
CREATE POLICY "signed-in read cities" ON public.cities FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "signed-in read shabbatot" ON public.shabbatot;
CREATE POLICY "signed-in read shabbatot" ON public.shabbatot FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "signed-in read app_settings" ON public.app_settings;
CREATE POLICY "signed-in read app_settings" ON public.app_settings FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE ALL ON public.cities, public.shabbatot, public.app_settings FROM anon;