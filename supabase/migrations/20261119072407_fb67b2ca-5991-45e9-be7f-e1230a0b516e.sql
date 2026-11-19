ALTER TABLE public.staff_invitations DROP CONSTRAINT staff_invitations_role_check;
ALTER TABLE public.staff_invitations ADD CONSTRAINT staff_invitations_role_check CHECK (role IN ('rep','admin') OR (role='demo_staff' AND email='staff@demo.shabbat-babayit.example'));
UPDATE public.staff_invitations SET role='demo_staff' WHERE email='staff@demo.shabbat-babayit.example' AND status='pending';