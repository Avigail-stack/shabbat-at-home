
-- ===== Enums =====
CREATE TYPE public.app_role AS ENUM ('guest','host','rep','admin');
CREATE TYPE public.notification_channel AS ENUM ('whatsapp','sms','voice');
CREATE TYPE public.contact_method AS ENUM ('whatsapp','phone_call');
CREATE TYPE public.restriction_status AS ENUM ('none','frozen','suspended','blocked');
CREATE TYPE public.profile_status AS ENUM ('partial','pending','active','rejected');
CREATE TYPE public.host_approval AS ENUM ('pending','approved','rejected');
CREATE TYPE public.hosting_unit AS ENUM ('full_shabbat','friday_dinner','shabbat_lunch','seudah_shlishit');
CREATE TYPE public.availability_status AS ENUM ('open','full','cancelled');
CREATE TYPE public.request_status AS ENUM ('active','closed','cancelled','expired');
CREATE TYPE public.response_status AS ENUM ('pending','accepted','declined','expired','withdrawn');
CREATE TYPE public.hosting_status AS ENUM ('confirmed','under_review','cancelled_guest','cancelled_host','cancelled_staff','took_place','did_not_take_place');
CREATE TYPE public.verification_kind AS ENUM ('id','spouse_id','marriage_record','recommender','guest_provider','intro_call');
CREATE TYPE public.verification_status AS ENUM ('pending','passed','failed');
CREATE TYPE public.restriction_kind AS ENUM ('freeze','suspension','block');
CREATE TYPE public.party_type AS ENUM ('alone','couple','family','group');
CREATE TYPE public.shabbat_familiarity AS ENUM ('never','little','well');
CREATE TYPE public.gender AS ENUM ('male','female');
CREATE TYPE public.guest_gender_pref AS ENUM ('everyone','families_couples','women_only','men_only');
CREATE TYPE public.took_place AS ENUM ('yes','no','partial');

-- ===== Helpers =====
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Best-effort contact-info detector (phones, emails, links, WhatsApp, street addresses)
CREATE OR REPLACE FUNCTION public.contains_contact_info(t text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT t IS NOT NULL AND (
    t ~ '\d[\d\s\-\.]{7,}\d'
    OR t ~* '[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}'
    OR t ~* '(https?://|www\.|wa\.me|whatsapp|chat\.whatsapp|t\.me/)'
    OR t ~ '(רחוב|רח''|שדרות|שד''|סמטת|דרך)\s*[א-ת"''\-\s]{2,30}\s+\d{1,4}'
  ) $$;

-- Israeli ID checksum
CREATE OR REPLACE FUNCTION public.is_valid_il_id(id text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE s int := 0; d int; p text; i int;
BEGIN
  IF id IS NULL OR id !~ '^\d{5,9}$' THEN RETURN false; END IF;
  p := lpad(id, 9, '0');
  FOR i IN 1..9 LOOP
    d := substr(p, i, 1)::int * (CASE WHEN i % 2 = 1 THEN 1 ELSE 2 END);
    IF d > 9 THEN d := d - 9; END IF;
    s := s + d;
  END LOOP;
  RETURN s % 10 = 0;
END; $$;

-- ===== user_roles =====
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('rep','admin')) $$;

CREATE POLICY "own roles or staff read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "self-assign guest or host" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role IN ('guest','host'));

-- ===== persons =====
CREATE TABLE public.persons (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  id_number text UNIQUE,
  phone text UNIQUE,
  phone_verified_at timestamptz,
  email text,
  first_name text,
  last_name text,
  date_of_birth date,
  notification_channel public.notification_channel,
  restriction_status public.restriction_status NOT NULL DEFAULT 'none',
  restricted_until timestamptz,
  onboarding_step text NOT NULL DEFAULT 'phone',
  created_by_staff uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.persons TO authenticated;
GRANT ALL ON public.persons TO service_role;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own person or staff read" ON public.persons FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own person update" ON public.persons FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE TRIGGER persons_updated BEFORE UPDATE ON public.persons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- blocked re-registration attempts
CREATE TABLE public.blocked_identity_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  matched_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  id_number text,
  phone text,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.blocked_identity_attempts TO authenticated;
GRANT ALL ON public.blocked_identity_attempts TO service_role;
ALTER TABLE public.blocked_identity_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read attempts" ON public.blocked_identity_attempts FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff handle attempts" ON public.blocked_identity_attempts FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Protect person fields from self-edits
CREATE OR REPLACE FUNCTION public.protect_person_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE staff boolean := public.is_staff(auth.uid()) OR auth.uid() IS NULL;
DECLARE m uuid;
BEGIN
  IF NOT staff THEN
    IF OLD.id_number IS NOT NULL AND NEW.id_number IS DISTINCT FROM OLD.id_number THEN RAISE EXCEPTION 'id_number_locked'; END IF;
    IF OLD.date_of_birth IS NOT NULL AND NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth THEN RAISE EXCEPTION 'dob_locked'; END IF;
    IF NEW.phone IS DISTINCT FROM OLD.phone OR NEW.phone_verified_at IS DISTINCT FROM OLD.phone_verified_at THEN RAISE EXCEPTION 'phone_via_verification_only'; END IF;
    IF NEW.restriction_status IS DISTINCT FROM OLD.restriction_status OR NEW.restricted_until IS DISTINCT FROM OLD.restricted_until OR NEW.created_by_staff IS DISTINCT FROM OLD.created_by_staff THEN RAISE EXCEPTION 'staff_only_field'; END IF;
  END IF;
  IF NEW.id_number IS NOT NULL AND NEW.id_number IS DISTINCT FROM OLD.id_number THEN
    IF NOT public.is_valid_il_id(NEW.id_number) THEN RAISE EXCEPTION 'invalid_id_number'; END IF;
    SELECT id INTO m FROM public.persons WHERE id_number = NEW.id_number AND id <> NEW.id AND restriction_status = 'blocked' LIMIT 1;
    IF m IS NOT NULL THEN
      INSERT INTO public.blocked_identity_attempts(person_id, matched_person_id, id_number) VALUES (NEW.id, m, NEW.id_number);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER persons_protect BEFORE UPDATE ON public.persons FOR EACH ROW EXECUTE FUNCTION public.protect_person_fields();

-- ===== guest_profiles =====
CREATE TABLE public.guest_profiles (
  person_id uuid PRIMARY KEY REFERENCES public.persons(id) ON DELETE CASCADE,
  gender public.gender,
  marital_status text,
  party_type public.party_type NOT NULL DEFAULT 'alone',
  party_adults int NOT NULL DEFAULT 1,
  party_children_ages int[] NOT NULL DEFAULT '{}',
  escort_name text,
  escort_phone text,
  languages text[] NOT NULL DEFAULT '{he}',
  shabbat_familiarity public.shabbat_familiarity,
  area_all_israel boolean NOT NULL DEFAULT true,
  regions text[] NOT NULL DEFAULT '{}',
  city text,
  interests text[] NOT NULL DEFAULT '{}',
  interests_other text,
  food_sensitivities text,
  accessibility_needs text,
  about text,
  charter_accepted_at timestamptz,
  status public.profile_status NOT NULL DEFAULT 'partial',
  onboarding_step int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.guest_profiles TO authenticated;
GRANT ALL ON public.guest_profiles TO service_role;
ALTER TABLE public.guest_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own guest or staff read" ON public.guest_profiles FOR SELECT TO authenticated USING (person_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own guest insert" ON public.guest_profiles FOR INSERT TO authenticated WITH CHECK (person_id = auth.uid() AND status = 'partial');
CREATE POLICY "own guest update" ON public.guest_profiles FOR UPDATE TO authenticated USING (person_id = auth.uid() OR public.is_staff(auth.uid())) WITH CHECK (person_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE TRIGGER guest_profiles_updated BEFORE UPDATE ON public.guest_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_guest_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE staff boolean := public.is_staff(auth.uid()) OR auth.uid() IS NULL; dob date;
BEGIN
  IF public.contains_contact_info(NEW.about) OR public.contains_contact_info(NEW.interests_other)
     OR public.contains_contact_info(NEW.food_sensitivities) OR public.contains_contact_info(NEW.accessibility_needs) THEN
    RAISE EXCEPTION 'contact_info_not_allowed';
  END IF;
  IF array_length(NEW.languages, 1) IS NULL THEN RAISE EXCEPTION 'language_required'; END IF;
  IF NOT staff AND TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (OLD.status = 'partial' AND NEW.status = 'pending') THEN RAISE EXCEPTION 'staff_only_status'; END IF;
  END IF;
  IF NEW.status <> 'partial' AND (TG_OP = 'INSERT' OR OLD.status = 'partial') THEN
    IF NEW.charter_accepted_at IS NULL THEN RAISE EXCEPTION 'charter_required'; END IF;
    SELECT date_of_birth INTO dob FROM public.persons WHERE id = NEW.person_id;
    IF dob IS NULL OR dob > (current_date - interval '18 years') THEN RAISE EXCEPTION 'guest_must_be_18'; END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER guest_profiles_validate BEFORE INSERT OR UPDATE ON public.guest_profiles FOR EACH ROW EXECUTE FUNCTION public.validate_guest_profile();

-- ===== host_profiles =====
CREATE TABLE public.host_profiles (
  person_id uuid PRIMARY KEY REFERENCES public.persons(id) ON DELETE CASCADE,
  family_name text,
  spouse_first_name text,
  spouse_id_number text,
  street_address text,
  city text,
  neighborhood text,
  family_composition text,
  husband_age int,
  wife_age int,
  children_ages int[] NOT NULL DEFAULT '{}',
  lodging_description text,
  rule_separate_room boolean NOT NULL DEFAULT false,
  rule_lockable_door boolean NOT NULL DEFAULT false,
  rule_description_visible boolean NOT NULL DEFAULT false,
  rule_no_shared_room boolean NOT NULL DEFAULT false,
  languages text[] NOT NULL DEFAULT '{he}',
  guest_gender_pref public.guest_gender_pref NOT NULL DEFAULT 'everyone',
  recommender_name text,
  recommender_role text,
  recommender_phone text,
  interests text[] NOT NULL DEFAULT '{}',
  about text,
  house_character text,
  kashrut text,
  food_offer text,
  cannot_provide text,
  preferred_contact public.contact_method NOT NULL DEFAULT 'whatsapp',
  default_seats int NOT NULL DEFAULT 2,
  default_beds int NOT NULL DEFAULT 2,
  charter_accepted_at timestamptz,
  behavior_rules_accepted_at timestamptz,
  status public.profile_status NOT NULL DEFAULT 'partial',
  approval public.host_approval NOT NULL DEFAULT 'pending',
  approval_by uuid,
  approval_at timestamptz,
  approval_note text,
  onboarding_step int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.host_profiles TO authenticated;
GRANT ALL ON public.host_profiles TO service_role;
ALTER TABLE public.host_profiles ENABLE ROW LEVEL SECURITY;
-- Guests never read this table directly; public host data goes through dedicated functions (staged reveal).
CREATE POLICY "own host or staff read" ON public.host_profiles FOR SELECT TO authenticated USING (person_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own host insert" ON public.host_profiles FOR INSERT TO authenticated WITH CHECK (person_id = auth.uid() AND status = 'partial' AND approval = 'pending');
CREATE POLICY "own host update" ON public.host_profiles FOR UPDATE TO authenticated USING (person_id = auth.uid() OR public.is_staff(auth.uid())) WITH CHECK (person_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE TRIGGER host_profiles_updated BEFORE UPDATE ON public.host_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_host_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE staff boolean := public.is_staff(auth.uid()) OR auth.uid() IS NULL;
BEGIN
  IF public.contains_contact_info(NEW.about) OR public.contains_contact_info(NEW.lodging_description)
     OR public.contains_contact_info(NEW.house_character) OR public.contains_contact_info(NEW.food_offer)
     OR public.contains_contact_info(NEW.cannot_provide) OR public.contains_contact_info(NEW.family_composition) THEN
    RAISE EXCEPTION 'contact_info_not_allowed';
  END IF;
  IF NEW.spouse_id_number IS NOT NULL AND NOT public.is_valid_il_id(NEW.spouse_id_number) THEN RAISE EXCEPTION 'invalid_spouse_id'; END IF;
  IF NOT staff AND TG_OP = 'UPDATE' THEN
    IF NEW.approval IS DISTINCT FROM OLD.approval OR NEW.approval_by IS DISTINCT FROM OLD.approval_by
       OR NEW.approval_at IS DISTINCT FROM OLD.approval_at OR NEW.approval_note IS DISTINCT FROM OLD.approval_note THEN
      RAISE EXCEPTION 'staff_only_field';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (OLD.status = 'partial' AND NEW.status = 'pending') THEN RAISE EXCEPTION 'staff_only_status'; END IF;
  END IF;
  IF NEW.status <> 'partial' AND (TG_OP = 'INSERT' OR OLD.status = 'partial') THEN
    IF NEW.charter_accepted_at IS NULL OR NEW.behavior_rules_accepted_at IS NULL THEN RAISE EXCEPTION 'charter_required'; END IF;
    IF NOT (NEW.rule_separate_room AND NEW.rule_lockable_door AND NEW.rule_description_visible AND NEW.rule_no_shared_room) THEN RAISE EXCEPTION 'lodging_rules_required'; END IF;
    IF NEW.spouse_first_name IS NULL OR NEW.spouse_id_number IS NULL THEN RAISE EXCEPTION 'spouse_required'; END IF;
    IF NEW.street_address IS NULL OR NEW.city IS NULL THEN RAISE EXCEPTION 'address_required'; END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER host_profiles_validate BEFORE INSERT OR UPDATE ON public.host_profiles FOR EACH ROW EXECUTE FUNCTION public.validate_host_profile();

CREATE TABLE public.host_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES public.host_profiles(person_id) ON DELETE CASCADE,
  name text NOT NULL,
  beds int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.host_rooms TO authenticated;
GRANT ALL ON public.host_rooms TO service_role;
ALTER TABLE public.host_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rooms or staff read" ON public.host_rooms FOR SELECT TO authenticated USING (host_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own rooms insert" ON public.host_rooms FOR INSERT TO authenticated WITH CHECK (host_id = auth.uid());
CREATE POLICY "own rooms update" ON public.host_rooms FOR UPDATE TO authenticated USING (host_id = auth.uid()) WITH CHECK (host_id = auth.uid());
CREATE POLICY "own rooms delete" ON public.host_rooms FOR DELETE TO authenticated USING (host_id = auth.uid());

-- ===== verifications =====
CREATE TABLE public.verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  profile_role public.app_role NOT NULL,
  kind public.verification_kind NOT NULL,
  status public.verification_status NOT NULL DEFAULT 'pending',
  method text,
  attempts int NOT NULL DEFAULT 0,
  performed_by uuid,
  performed_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.verifications TO authenticated;
GRANT ALL ON public.verifications TO service_role;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own verifications or staff read" ON public.verifications FOR SELECT TO authenticated USING (person_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "staff write verifications" ON public.verifications FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff update verifications" ON public.verifications FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER verifications_updated BEFORE UPDATE ON public.verifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Derived verification level: 0 none, 1 ID verified, 2 ID + recommender/spouse, 3 + intro call
CREATE OR REPLACE FUNCTION public.verification_level(_person uuid, _role public.app_role)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM verifications WHERE person_id=_person AND profile_role=_role AND status='passed' AND kind IN ('id','guest_provider')) THEN 0
    WHEN EXISTS (SELECT 1 FROM verifications WHERE person_id=_person AND profile_role=_role AND status='passed' AND kind='intro_call') THEN 3
    WHEN EXISTS (SELECT 1 FROM verifications WHERE person_id=_person AND profile_role=_role AND status='passed' AND kind IN ('recommender','spouse_id','marriage_record')) THEN 2
    ELSE 1 END $$;

-- ===== Reference data =====
CREATE TABLE public.shabbatot (
  date date PRIMARY KEY,
  parsha text NOT NULL,
  special text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shabbatot TO authenticated;
GRANT ALL ON public.shabbatot TO service_role;
ALTER TABLE public.shabbatot ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed-in read shabbatot" ON public.shabbatot FOR SELECT TO authenticated USING (true);

CREATE TABLE public.cities (
  name text PRIMARY KEY,
  region text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL
);
GRANT SELECT ON public.cities TO authenticated;
GRANT ALL ON public.cities TO service_role;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed-in read cities" ON public.cities FOR SELECT TO authenticated USING (true);

CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed-in read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin update settings" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ===== availability (open invitations) =====
CREATE TABLE public.availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES public.host_profiles(person_id) ON DELETE CASCADE,
  shabbat_date date NOT NULL REFERENCES public.shabbatot(date),
  unit public.hosting_unit NOT NULL DEFAULT 'full_shabbat',
  with_lodging boolean NOT NULL DEFAULT true,
  seats int NOT NULL DEFAULT 2,
  seats_left int NOT NULL DEFAULT 2,
  beds int NOT NULL DEFAULT 0,
  restriction text,
  note text,
  recurrence_rule text,
  status public.availability_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (host_id, shabbat_date, unit)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability TO authenticated;
GRANT ALL ON public.availability TO service_role;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own availability or staff read" ON public.availability FOR SELECT TO authenticated USING (host_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own availability insert" ON public.availability FOR INSERT TO authenticated WITH CHECK (host_id = auth.uid());
CREATE POLICY "own availability update" ON public.availability FOR UPDATE TO authenticated USING (host_id = auth.uid()) WITH CHECK (host_id = auth.uid());
CREATE POLICY "own availability delete" ON public.availability FOR DELETE TO authenticated USING (host_id = auth.uid());
CREATE TRIGGER availability_updated BEFORE UPDATE ON public.availability FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_availability()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF public.contains_contact_info(NEW.note) OR public.contains_contact_info(NEW.restriction) THEN RAISE EXCEPTION 'contact_info_not_allowed'; END IF;
  IF NEW.seats < 0 OR NEW.seats_left < 0 OR NEW.seats_left > NEW.seats THEN RAISE EXCEPTION 'invalid_seats'; END IF;
  IF NEW.status <> 'cancelled' THEN NEW.status := CASE WHEN NEW.seats_left = 0 THEN 'full' ELSE 'open' END; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER availability_validate BEFORE INSERT OR UPDATE ON public.availability FOR EACH ROW EXECUTE FUNCTION public.validate_availability();

-- ===== requests / responses / hostings =====
-- Writes for these go through dedicated SECURITY DEFINER functions (pass 2), so users get read access only.
CREATE TABLE public.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES public.guest_profiles(person_id) ON DELETE CASCADE,
  shabbat_date date NOT NULL REFERENCES public.shabbatot(date),
  party_type public.party_type NOT NULL,
  adults int NOT NULL DEFAULT 1,
  children_ages int[] NOT NULL DEFAULT '{}',
  unit public.hosting_unit NOT NULL DEFAULT 'full_shabbat',
  with_lodging boolean NOT NULL DEFAULT true,
  status public.request_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guest_id, shabbat_date)
);
GRANT SELECT ON public.requests TO authenticated;
GRANT ALL ON public.requests TO service_role;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own requests or staff read" ON public.requests FOR SELECT TO authenticated USING (guest_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE TRIGGER requests_updated BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  availability_id uuid NOT NULL REFERENCES public.availability(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES public.guest_profiles(person_id) ON DELETE CASCADE,
  host_id uuid NOT NULL REFERENCES public.host_profiles(person_id) ON DELETE CASCADE,
  message text,
  status public.response_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  via_invite_link boolean NOT NULL DEFAULT false,
  decline_reason text,
  decline_note text,
  answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, availability_id)
);
GRANT SELECT ON public.responses TO authenticated;
GRANT ALL ON public.responses TO service_role;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
-- Hosts never see withdrawn responses; decline reasons are hidden from guests by the read functions (pass 2).
CREATE POLICY "guest, host or staff read responses" ON public.responses FOR SELECT TO authenticated
  USING (guest_id = auth.uid() OR (host_id = auth.uid() AND status <> 'withdrawn') OR public.is_staff(auth.uid()));
CREATE TRIGGER responses_updated BEFORE UPDATE ON public.responses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.hostings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL UNIQUE REFERENCES public.responses(id) ON DELETE CASCADE,
  availability_id uuid NOT NULL REFERENCES public.availability(id),
  guest_id uuid NOT NULL REFERENCES public.guest_profiles(person_id),
  host_id uuid NOT NULL REFERENCES public.host_profiles(person_id),
  shabbat_date date NOT NULL REFERENCES public.shabbatot(date),
  party_size int NOT NULL DEFAULT 1,
  status public.hosting_status NOT NULL DEFAULT 'confirmed',
  contact_method public.contact_method NOT NULL,
  cancelled_by uuid,
  cancel_reason text,
  cancel_note text,
  cancelled_at timestamptz,
  staff_notes text,
  attention_alert text,
  attention_handled_at timestamptz,
  attention_handled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.hostings TO authenticated;
GRANT ALL ON public.hostings TO service_role;
ALTER TABLE public.hostings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parties or staff read hostings" ON public.hostings FOR SELECT TO authenticated USING (guest_id = auth.uid() OR host_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "staff update hostings" ON public.hostings FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER hostings_updated BEFORE UPDATE ON public.hostings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== feedback / flags / restrictions =====
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hosting_id uuid NOT NULL REFERENCES public.hostings(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  author_role public.app_role NOT NULL,
  took_place public.took_place NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}',
  free_text text,
  would_return boolean,
  followup_consent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hosting_id, author_id)
);
GRANT SELECT, INSERT ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own feedback or staff read" ON public.feedback FOR SELECT TO authenticated USING (author_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "party writes own feedback" ON public.feedback FOR INSERT TO authenticated WITH CHECK (
  author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.hostings h WHERE h.id = hosting_id AND (h.guest_id = auth.uid() OR h.host_id = auth.uid()))
  AND (author_role = 'guest' OR followup_consent = false));

CREATE TABLE public.flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  reported_person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  hosting_id uuid REFERENCES public.hostings(id) ON DELETE SET NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  handled_by uuid,
  handled_at timestamptz,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.flags TO authenticated;
GRANT ALL ON public.flags TO service_role;
ALTER TABLE public.flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reporter or staff read flags" ON public.flags FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "staff update flags" ON public.flags FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  kind public.restriction_kind NOT NULL,
  reason text NOT NULL,
  ends_at timestamptz,
  source_flag_id uuid REFERENCES public.flags(id) ON DELETE SET NULL,
  decided_by uuid,
  lifted_at timestamptz,
  lifted_by uuid,
  reply_text text,
  appeal_text text,
  appeal_status text,
  appeal_decided_by uuid,
  appeal_decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.restrictions TO authenticated;
GRANT ALL ON public.restrictions TO service_role;
ALTER TABLE public.restrictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or staff read restrictions" ON public.restrictions FOR SELECT TO authenticated USING (person_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "staff create restrictions" ON public.restrictions FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND (kind <> 'block' OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "staff update restrictions" ON public.restrictions FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()) AND (kind <> 'block' OR public.has_role(auth.uid(),'admin')));
CREATE TRIGGER restrictions_updated BEFORE UPDATE ON public.restrictions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== notifications / audit / staff =====
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES public.persons(id) ON DELETE CASCADE,
  recipient text,
  channel text NOT NULL CHECK (channel IN ('whatsapp','sms','voice','email','inbox')),
  template text NOT NULL,
  variables jsonb NOT NULL DEFAULT '{}',
  body text,
  important boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'queued',
  provider text NOT NULL DEFAULT 'mock',
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own inbox or staff read" ON public.notifications FOR SELECT TO authenticated USING ((person_id = auth.uid() AND channel = 'inbox') OR public.is_staff(auth.uid()));
CREATE POLICY "mark own inbox read" ON public.notifications FOR UPDATE TO authenticated USING (person_id = auth.uid() AND channel = 'inbox') WITH CHECK (person_id = auth.uid() AND channel = 'inbox');

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  target_person_id uuid,
  target_table text,
  target_id text,
  reason text,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read audit" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "staff write own audit" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND actor_id = auth.uid());

CREATE TABLE public.staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role public.app_role NOT NULL CHECK (role IN ('rep','admin')),
  invited_by uuid,
  status text NOT NULL DEFAULT 'pending',
  accepted_at timestamptz,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.staff_invitations TO authenticated;
GRANT ALL ON public.staff_invitations TO service_role;
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read invitations" ON public.staff_invitations FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin create invitations" ON public.staff_invitations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update invitations" ON public.staff_invitations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES public.host_profiles(person_id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16),'hex'),
  expires_at timestamptz NOT NULL,
  max_uses int NOT NULL DEFAULT 1,
  uses int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.invite_links TO authenticated;
GRANT ALL ON public.invite_links TO service_role;
ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own links or staff read" ON public.invite_links FOR SELECT TO authenticated USING (host_id = auth.uid() OR public.is_staff(auth.uid()));

-- Placeholder only: an "event" entity next to "family". No UI.
CREATE TABLE public.community_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.community_events TO service_role;
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;

-- ===== Sign-up handling =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.staff_invitations WHERE lower(email) = lower(NEW.email) AND status = 'pending') THEN
    IF NEW.email_confirmed_at IS NOT NULL THEN PERFORM public.accept_staff_invitation(NEW.id, NEW.email); END IF;
    RETURN NEW; -- staff have no person record
  END IF;
  INSERT INTO public.persons (id, email, first_name, last_name)
  VALUES (NEW.id, NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'given_name', split_part(COALESCE(NEW.raw_user_meta_data->>'full_name',''),' ',1)),
          COALESCE(NEW.raw_user_meta_data->>'family_name', NULLIF(substr(COALESCE(NEW.raw_user_meta_data->>'full_name',''), length(split_part(COALESCE(NEW.raw_user_meta_data->>'full_name',''),' ',1))+2),'')))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.accept_staff_invitation(_user uuid, _email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv record;
BEGIN
  SELECT * INTO inv FROM public.staff_invitations WHERE lower(email) = lower(_email) AND status = 'pending';
  IF inv.id IS NULL THEN RETURN; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user, inv.role) ON CONFLICT DO NOTHING;
  UPDATE public.staff_invitations SET status = 'accepted', accepted_at = now(), user_id = _user WHERE id = inv.id;
  DELETE FROM public.persons WHERE id = _user AND id_number IS NULL AND phone IS NULL;
  INSERT INTO public.audit_log (actor_id, action, target_table, target_id, details)
  VALUES (inv.invited_by, 'staff_invitation_accepted', 'staff_invitations', inv.id::text, jsonb_build_object('role', inv.role));
END; $$;
REVOKE EXECUTE ON FUNCTION public.accept_staff_invitation(uuid, text) FROM PUBLIC, anon, authenticated;

-- Staff role is granted only once the invited email is confirmed (invite link clicked).
CREATE OR REPLACE FUNCTION public.handle_user_confirmed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    PERFORM public.accept_staff_invitation(NEW.id, NEW.email);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER on_auth_user_confirmed AFTER UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_user_confirmed();

-- ===== Phone verification (mock provider) =====
CREATE OR REPLACE FUNCTION public.request_phone_code(_phone text, _method text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _phone !~ '^05\d{8}$' THEN RAISE EXCEPTION 'invalid_phone'; END IF;
  IF _method NOT IN ('sms','voice') THEN RAISE EXCEPTION 'invalid_method'; END IF;
  INSERT INTO public.notifications (person_id, recipient, channel, template, variables, body, status, sent_at)
  VALUES (auth.uid(), _phone, _method, 'phone_verification_code', '{}'::jsonb,
          'קוד אימות (דמה): כל 6 ספרות יתקבלו', 'sent', now());
END; $$;
REVOKE EXECUTE ON FUNCTION public.request_phone_code(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_phone_code(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.verify_phone_code(_phone text, _code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m uuid; other uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _phone !~ '^05\d{8}$' THEN RAISE EXCEPTION 'invalid_phone'; END IF;
  IF _code !~ '^\d{6}$' THEN RAISE EXCEPTION 'invalid_code'; END IF; -- mock: any 6 digits
  SELECT id INTO other FROM public.persons WHERE phone = _phone AND id <> auth.uid();
  IF other IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.persons WHERE id = other AND restriction_status = 'blocked') THEN
      INSERT INTO public.blocked_identity_attempts(person_id, matched_person_id, phone) VALUES (auth.uid(), other, _phone);
    END IF;
    RAISE EXCEPTION 'phone_taken';
  END IF;
  UPDATE public.persons SET phone = _phone, phone_verified_at = now(),
    onboarding_step = CASE WHEN onboarding_step = 'phone' THEN 'details' ELSE onboarding_step END
  WHERE id = auth.uid();
  RETURN 'ok';
END; $$;
REVOKE EXECUTE ON FUNCTION public.verify_phone_code(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_phone_code(text, text) TO authenticated;

-- verify_phone_code updates phone as definer: allow it past protect trigger
CREATE OR REPLACE FUNCTION public.protect_person_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE staff boolean := public.is_staff(auth.uid()) OR auth.uid() IS NULL;
DECLARE m uuid;
BEGIN
  IF NOT staff THEN
    IF OLD.id_number IS NOT NULL AND NEW.id_number IS DISTINCT FROM OLD.id_number THEN RAISE EXCEPTION 'id_number_locked'; END IF;
    IF OLD.date_of_birth IS NOT NULL AND NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth THEN RAISE EXCEPTION 'dob_locked'; END IF;
    IF (NEW.phone IS DISTINCT FROM OLD.phone OR NEW.phone_verified_at IS DISTINCT FROM OLD.phone_verified_at)
       AND current_setting('app.phone_verify', true) IS DISTINCT FROM 'on' THEN RAISE EXCEPTION 'phone_via_verification_only'; END IF;
    IF NEW.restriction_status IS DISTINCT FROM OLD.restriction_status OR NEW.restricted_until IS DISTINCT FROM OLD.restricted_until OR NEW.created_by_staff IS DISTINCT FROM OLD.created_by_staff THEN RAISE EXCEPTION 'staff_only_field'; END IF;
  END IF;
  IF NEW.id_number IS NOT NULL AND NEW.id_number IS DISTINCT FROM OLD.id_number THEN
    IF NOT public.is_valid_il_id(NEW.id_number) THEN RAISE EXCEPTION 'invalid_id_number'; END IF;
    SELECT id INTO m FROM public.persons WHERE id_number = NEW.id_number AND id <> NEW.id AND restriction_status = 'blocked' LIMIT 1;
    IF m IS NOT NULL THEN
      INSERT INTO public.blocked_identity_attempts(person_id, matched_person_id, id_number) VALUES (NEW.id, m, NEW.id_number);
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.verify_phone_code(_phone text, _code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE other uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _phone !~ '^05\d{8}$' THEN RAISE EXCEPTION 'invalid_phone'; END IF;
  IF _code !~ '^\d{6}$' THEN RAISE EXCEPTION 'invalid_code'; END IF;
  SELECT id INTO other FROM public.persons WHERE phone = _phone AND id <> auth.uid();
  IF other IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.persons WHERE id = other AND restriction_status = 'blocked') THEN
      INSERT INTO public.blocked_identity_attempts(person_id, matched_person_id, phone) VALUES (auth.uid(), other, _phone);
    END IF;
    RAISE EXCEPTION 'phone_taken';
  END IF;
  PERFORM set_config('app.phone_verify', 'on', true);
  UPDATE public.persons SET phone = _phone, phone_verified_at = now(),
    onboarding_step = CASE WHEN onboarding_step = 'phone' THEN 'details' ELSE onboarding_step END
  WHERE id = auth.uid();
  PERFORM set_config('app.phone_verify', 'off', true);
  RETURN 'ok';
END; $$;

-- Lock down helper execution
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_user_confirmed() FROM PUBLIC, anon, authenticated;

-- ===== Seed reference data =====
INSERT INTO public.shabbatot (date, parsha, special) VALUES
('2026-11-07','חיי שרה',NULL),
('2026-11-14','תולדות',NULL),
('2026-11-21','ויצא',NULL),
('2026-11-28','וישלח',NULL),
('2026-12-05','וישב','שבת חנוכה'),
('2026-12-12','מקץ','שבת חנוכה'),
('2026-12-19','ויגש',NULL),
('2026-12-26','ויחי',NULL),
('2027-01-02','שמות',NULL),
('2027-01-09','וארא',NULL),
('2027-01-16','בא',NULL),
('2027-01-23','בשלח','שבת שירה'),
('2027-01-30','יתרו',NULL),
('2027-02-06','משפטים','שבת שקלים');

INSERT INTO public.cities (name, region, lat, lng) VALUES
('ירושלים','ירושלים',31.7683,35.2137),
('בני ברק','מרכז',32.0807,34.8338),
('תל אביב-יפו','מרכז',32.0853,34.7818),
('בית שמש','ירושלים',31.7470,34.9881),
('צפת','צפון',32.9646,35.4960),
('חיפה','חיפה',32.7940,34.9896),
('פתח תקווה','מרכז',32.0840,34.8878),
('רמת גן','מרכז',32.0684,34.8248),
('ראשון לציון','מרכז',31.9730,34.7925),
('רחובות','מרכז',31.8928,34.8113),
('אשדוד','דרום',31.8044,34.6553),
('באר שבע','דרום',31.2520,34.7915),
('נתניה','שרון',32.3215,34.8532),
('הרצליה','שרון',32.1663,34.8433),
('כפר סבא','שרון',32.1750,34.9069),
('רעננה','שרון',32.1848,34.8713),
('מודיעין','מרכז',31.8980,35.0104),
('מודיעין עילית','מרכז',31.9330,35.0418),
('ביתר עילית','ירושלים',31.6960,35.1150),
('אלעד','מרכז',32.0522,34.9512),
('טבריה','צפון',32.7940,35.5300),
('עפולה','צפון',32.6100,35.2890),
('כרמיאל','צפון',32.9190,35.2950),
('אילת','דרום',29.5577,34.9519),
('חולון','מרכז',32.0158,34.7874),
('בת ים','מרכז',32.0171,34.7454),
('גבעתיים','מרכז',32.0722,34.8125),
('אשקלון','דרום',31.6688,34.5743),
('קריית גת','דרום',31.6100,34.7642),
('נצרת עילית (נוף הגליל)','צפון',32.7077,35.3240);

INSERT INTO public.app_settings (key, value) VALUES
('meals_enabled', 'false'::jsonb),
('min_verification_level_to_confirm', '1'::jsonb),
('ranking_weights', '{"age":1,"interests":1.5,"familiarity":0.5,"distance":2,"food":1,"house_character":0.5,"feedback":1}'::jsonb),
('max_active_responses', '3'::jsonb),
('response_hours', '24'::jsonb);

INSERT INTO public.staff_invitations (email, role, status) VALUES
('6799027@gmail.com','admin','pending'),
('rep-placeholder@example.org','rep','pending');
