CREATE OR REPLACE FUNCTION public.is_app_member(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND _uid = auth.uid() AND (
    EXISTS (SELECT 1 FROM public.persons WHERE id = _uid)
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid)
  )
$$;