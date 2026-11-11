import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** The signed-in person's own records (RLS limits every read to their rows). */
export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return null;
    const [person, roles, guest, host] = await Promise.all([
      supabase.from("persons").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("guest_profiles").select("*").eq("person_id", uid).maybeSingle(),
      supabase.from("host_profiles").select("*").eq("person_id", uid).maybeSingle(),
    ]);
    return {
      uid,
      person: person.data,
      roles: (roles.data ?? []).map((r) => r.role),
      guest: guest.data,
      host: host.data,
    };
  },
});
