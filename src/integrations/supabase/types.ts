export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          reason: string | null
          target_id: string | null
          target_person_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          reason?: string | null
          target_id?: string | null
          target_person_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          reason?: string | null
          target_id?: string | null
          target_person_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      availability: {
        Row: {
          beds: number
          created_at: string
          host_id: string
          id: string
          note: string | null
          recurrence_rule: string | null
          restriction: string | null
          seats: number
          seats_left: number
          shabbat_date: string
          status: Database["public"]["Enums"]["availability_status"]
          unit: Database["public"]["Enums"]["hosting_unit"]
          updated_at: string
          with_lodging: boolean
        }
        Insert: {
          beds?: number
          created_at?: string
          host_id: string
          id?: string
          note?: string | null
          recurrence_rule?: string | null
          restriction?: string | null
          seats?: number
          seats_left?: number
          shabbat_date: string
          status?: Database["public"]["Enums"]["availability_status"]
          unit?: Database["public"]["Enums"]["hosting_unit"]
          updated_at?: string
          with_lodging?: boolean
        }
        Update: {
          beds?: number
          created_at?: string
          host_id?: string
          id?: string
          note?: string | null
          recurrence_rule?: string | null
          restriction?: string | null
          seats?: number
          seats_left?: number
          shabbat_date?: string
          status?: Database["public"]["Enums"]["availability_status"]
          unit?: Database["public"]["Enums"]["hosting_unit"]
          updated_at?: string
          with_lodging?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "availability_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "host_profiles"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "availability_shabbat_date_fkey"
            columns: ["shabbat_date"]
            isOneToOne: false
            referencedRelation: "shabbatot"
            referencedColumns: ["date"]
          },
        ]
      }
      blocked_identity_attempts: {
        Row: {
          created_at: string
          handled_at: string | null
          id: string
          id_number: string | null
          matched_person_id: string | null
          person_id: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string
          handled_at?: string | null
          id?: string
          id_number?: string | null
          matched_person_id?: string | null
          person_id?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string
          handled_at?: string | null
          id?: string
          id_number?: string | null
          matched_person_id?: string | null
          person_id?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_identity_attempts_matched_person_id_fkey"
            columns: ["matched_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_identity_attempts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          lat: number
          lng: number
          name: string
          region: string
        }
        Insert: {
          lat: number
          lng: number
          name: string
          region: string
        }
        Update: {
          lat?: number
          lng?: number
          name?: string
          region?: string
        }
        Relationships: []
      }
      community_events: {
        Row: {
          city: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      companions: {
        Row: {
          created_at: string
          guest_id: string
          id: string
          id_number: string
          relation: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          guest_id: string
          id?: string
          id_number: string
          relation: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          guest_id?: string
          id?: string
          id_number?: string
          relation?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companions_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guest_profiles"
            referencedColumns: ["person_id"]
          },
        ]
      }
      feedback: {
        Row: {
          answers: Json
          author_id: string
          author_role: Database["public"]["Enums"]["app_role"]
          created_at: string
          followup_consent: boolean
          free_text: string | null
          hosting_id: string
          id: string
          took_place: Database["public"]["Enums"]["took_place"]
          would_return: boolean | null
        }
        Insert: {
          answers?: Json
          author_id: string
          author_role: Database["public"]["Enums"]["app_role"]
          created_at?: string
          followup_consent?: boolean
          free_text?: string | null
          hosting_id: string
          id?: string
          took_place: Database["public"]["Enums"]["took_place"]
          would_return?: boolean | null
        }
        Update: {
          answers?: Json
          author_id?: string
          author_role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          followup_consent?: boolean
          free_text?: string | null
          hosting_id?: string
          id?: string
          took_place?: Database["public"]["Enums"]["took_place"]
          would_return?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_hosting_id_fkey"
            columns: ["hosting_id"]
            isOneToOne: false
            referencedRelation: "hostings"
            referencedColumns: ["id"]
          },
        ]
      }
      flags: {
        Row: {
          created_at: string
          description: string
          handled_at: string | null
          handled_by: string | null
          hosting_id: string | null
          id: string
          reported_person_id: string
          reporter_id: string
          resolution: string | null
          status: string
        }
        Insert: {
          created_at?: string
          description: string
          handled_at?: string | null
          handled_by?: string | null
          hosting_id?: string | null
          id?: string
          reported_person_id: string
          reporter_id: string
          resolution?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          description?: string
          handled_at?: string | null
          handled_by?: string | null
          hosting_id?: string | null
          id?: string
          reported_person_id?: string
          reporter_id?: string
          resolution?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "flags_hosting_id_fkey"
            columns: ["hosting_id"]
            isOneToOne: false
            referencedRelation: "hostings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flags_reported_person_id_fkey"
            columns: ["reported_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flags_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_profiles: {
        Row: {
          about: string | null
          accessibility_needs: string | null
          area_all_israel: boolean
          charter_accepted_at: string | null
          city: string | null
          created_at: string
          default_unit: Database["public"]["Enums"]["hosting_unit"]
          default_with_lodging: boolean
          escort_name: string | null
          escort_phone: string | null
          food_preferences: string | null
          food_sensitivities: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          interests: string[]
          interests_other: string | null
          languages: string[]
          marital_status: string | null
          minor_children_count: number
          onboarding_step: number
          party_adults: number
          party_children_ages: number[]
          party_type: Database["public"]["Enums"]["party_type"]
          person_id: string
          regions: string[]
          shabbat_familiarity:
            | Database["public"]["Enums"]["shabbat_familiarity"]
            | null
          status: Database["public"]["Enums"]["profile_status"]
          updated_at: string
          weekly_prompt_week: string | null
        }
        Insert: {
          about?: string | null
          accessibility_needs?: string | null
          area_all_israel?: boolean
          charter_accepted_at?: string | null
          city?: string | null
          created_at?: string
          default_unit?: Database["public"]["Enums"]["hosting_unit"]
          default_with_lodging?: boolean
          escort_name?: string | null
          escort_phone?: string | null
          food_preferences?: string | null
          food_sensitivities?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          interests?: string[]
          interests_other?: string | null
          languages?: string[]
          marital_status?: string | null
          minor_children_count?: number
          onboarding_step?: number
          party_adults?: number
          party_children_ages?: number[]
          party_type?: Database["public"]["Enums"]["party_type"]
          person_id: string
          regions?: string[]
          shabbat_familiarity?:
            | Database["public"]["Enums"]["shabbat_familiarity"]
            | null
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
          weekly_prompt_week?: string | null
        }
        Update: {
          about?: string | null
          accessibility_needs?: string | null
          area_all_israel?: boolean
          charter_accepted_at?: string | null
          city?: string | null
          created_at?: string
          default_unit?: Database["public"]["Enums"]["hosting_unit"]
          default_with_lodging?: boolean
          escort_name?: string | null
          escort_phone?: string | null
          food_preferences?: string | null
          food_sensitivities?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          interests?: string[]
          interests_other?: string | null
          languages?: string[]
          marital_status?: string | null
          minor_children_count?: number
          onboarding_step?: number
          party_adults?: number
          party_children_ages?: number[]
          party_type?: Database["public"]["Enums"]["party_type"]
          person_id?: string
          regions?: string[]
          shabbat_familiarity?:
            | Database["public"]["Enums"]["shabbat_familiarity"]
            | null
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
          weekly_prompt_week?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_profiles_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      host_profiles: {
        Row: {
          about: string | null
          approval: Database["public"]["Enums"]["host_approval"]
          approval_at: string | null
          approval_by: string | null
          approval_note: string | null
          behavior_rules_accepted_at: string | null
          building_number: string | null
          cannot_provide: string | null
          charter_accepted_at: string | null
          children_ages: number[]
          city: string | null
          created_at: string
          default_beds: number
          default_seats: number
          default_unit: Database["public"]["Enums"]["hosting_unit"]
          default_with_lodging: boolean
          family_composition: string | null
          family_name: string | null
          food_offer: string | null
          guest_gender_pref: Database["public"]["Enums"]["guest_gender_pref"]
          house_character: string | null
          house_number: string | null
          husband_age: number | null
          interests: string[]
          kashrut: string | null
          languages: string[]
          lodging_description: string | null
          neighborhood: string | null
          onboarding_step: number
          person_id: string
          preferred_contact: Database["public"]["Enums"]["contact_method"]
          recommendation_mode: string
          recommender_name: string | null
          recommender_phone: string | null
          recommender_role: string | null
          recommender2_name: string | null
          recommender2_phone: string | null
          rule_description_visible: boolean
          rule_lockable_door: boolean
          rule_no_shared_room: boolean
          rule_separate_room: boolean
          spouse_first_name: string | null
          spouse_id_number: string | null
          staff_call_method: string | null
          status: Database["public"]["Enums"]["profile_status"]
          street: string | null
          street_address: string | null
          updated_at: string
          wife_age: number | null
        }
        Insert: {
          about?: string | null
          approval?: Database["public"]["Enums"]["host_approval"]
          approval_at?: string | null
          approval_by?: string | null
          approval_note?: string | null
          behavior_rules_accepted_at?: string | null
          building_number?: string | null
          cannot_provide?: string | null
          charter_accepted_at?: string | null
          children_ages?: number[]
          city?: string | null
          created_at?: string
          default_beds?: number
          default_seats?: number
          default_unit?: Database["public"]["Enums"]["hosting_unit"]
          default_with_lodging?: boolean
          family_composition?: string | null
          family_name?: string | null
          food_offer?: string | null
          guest_gender_pref?: Database["public"]["Enums"]["guest_gender_pref"]
          house_character?: string | null
          house_number?: string | null
          husband_age?: number | null
          interests?: string[]
          kashrut?: string | null
          languages?: string[]
          lodging_description?: string | null
          neighborhood?: string | null
          onboarding_step?: number
          person_id: string
          preferred_contact?: Database["public"]["Enums"]["contact_method"]
          recommendation_mode?: string
          recommender_name?: string | null
          recommender_phone?: string | null
          recommender_role?: string | null
          recommender2_name?: string | null
          recommender2_phone?: string | null
          rule_description_visible?: boolean
          rule_lockable_door?: boolean
          rule_no_shared_room?: boolean
          rule_separate_room?: boolean
          spouse_first_name?: string | null
          spouse_id_number?: string | null
          staff_call_method?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
          street?: string | null
          street_address?: string | null
          updated_at?: string
          wife_age?: number | null
        }
        Update: {
          about?: string | null
          approval?: Database["public"]["Enums"]["host_approval"]
          approval_at?: string | null
          approval_by?: string | null
          approval_note?: string | null
          behavior_rules_accepted_at?: string | null
          building_number?: string | null
          cannot_provide?: string | null
          charter_accepted_at?: string | null
          children_ages?: number[]
          city?: string | null
          created_at?: string
          default_beds?: number
          default_seats?: number
          default_unit?: Database["public"]["Enums"]["hosting_unit"]
          default_with_lodging?: boolean
          family_composition?: string | null
          family_name?: string | null
          food_offer?: string | null
          guest_gender_pref?: Database["public"]["Enums"]["guest_gender_pref"]
          house_character?: string | null
          house_number?: string | null
          husband_age?: number | null
          interests?: string[]
          kashrut?: string | null
          languages?: string[]
          lodging_description?: string | null
          neighborhood?: string | null
          onboarding_step?: number
          person_id?: string
          preferred_contact?: Database["public"]["Enums"]["contact_method"]
          recommendation_mode?: string
          recommender_name?: string | null
          recommender_phone?: string | null
          recommender_role?: string | null
          recommender2_name?: string | null
          recommender2_phone?: string | null
          rule_description_visible?: boolean
          rule_lockable_door?: boolean
          rule_no_shared_room?: boolean
          rule_separate_room?: boolean
          spouse_first_name?: string | null
          spouse_id_number?: string | null
          staff_call_method?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
          street?: string | null
          street_address?: string | null
          updated_at?: string
          wife_age?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "host_profiles_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      host_rooms: {
        Row: {
          beds: number
          created_at: string
          host_id: string
          id: string
          name: string
        }
        Insert: {
          beds?: number
          created_at?: string
          host_id: string
          id?: string
          name: string
        }
        Update: {
          beds?: number
          created_at?: string
          host_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "host_rooms_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "host_profiles"
            referencedColumns: ["person_id"]
          },
        ]
      }
      hostings: {
        Row: {
          attention_alert: string | null
          attention_handled_at: string | null
          attention_handled_by: string | null
          availability_id: string
          cancel_note: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          contact_method: Database["public"]["Enums"]["contact_method"]
          created_at: string
          guest_id: string
          host_id: string
          id: string
          party_size: number
          response_id: string
          shabbat_date: string
          staff_notes: string | null
          status: Database["public"]["Enums"]["hosting_status"]
          updated_at: string
        }
        Insert: {
          attention_alert?: string | null
          attention_handled_at?: string | null
          attention_handled_by?: string | null
          availability_id: string
          cancel_note?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          contact_method: Database["public"]["Enums"]["contact_method"]
          created_at?: string
          guest_id: string
          host_id: string
          id?: string
          party_size?: number
          response_id: string
          shabbat_date: string
          staff_notes?: string | null
          status?: Database["public"]["Enums"]["hosting_status"]
          updated_at?: string
        }
        Update: {
          attention_alert?: string | null
          attention_handled_at?: string | null
          attention_handled_by?: string | null
          availability_id?: string
          cancel_note?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          contact_method?: Database["public"]["Enums"]["contact_method"]
          created_at?: string
          guest_id?: string
          host_id?: string
          id?: string
          party_size?: number
          response_id?: string
          shabbat_date?: string
          staff_notes?: string | null
          status?: Database["public"]["Enums"]["hosting_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hostings_availability_id_fkey"
            columns: ["availability_id"]
            isOneToOne: false
            referencedRelation: "availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guest_profiles"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "hostings_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "host_profiles"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "hostings_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: true
            referencedRelation: "responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostings_shabbat_date_fkey"
            columns: ["shabbat_date"]
            isOneToOne: false
            referencedRelation: "shabbatot"
            referencedColumns: ["date"]
          },
        ]
      }
      identity_checks: {
        Row: {
          attempts: number
          created_at: string
          person_id: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          person_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          person_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "identity_checks_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_links: {
        Row: {
          created_at: string
          expires_at: string
          host_id: string
          id: string
          max_uses: number
          token: string
          uses: number
        }
        Insert: {
          created_at?: string
          expires_at: string
          host_id: string
          id?: string
          max_uses?: number
          token?: string
          uses?: number
        }
        Update: {
          created_at?: string
          expires_at?: string
          host_id?: string
          id?: string
          max_uses?: number
          token?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "invite_links_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "host_profiles"
            referencedColumns: ["person_id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          channel: string
          created_at: string
          id: string
          important: boolean
          person_id: string | null
          provider: string
          read_at: string | null
          recipient: string | null
          sent_at: string | null
          status: string
          template: string
          variables: Json
        }
        Insert: {
          body?: string | null
          channel: string
          created_at?: string
          id?: string
          important?: boolean
          person_id?: string | null
          provider?: string
          read_at?: string | null
          recipient?: string | null
          sent_at?: string | null
          status?: string
          template: string
          variables?: Json
        }
        Update: {
          body?: string | null
          channel?: string
          created_at?: string
          id?: string
          important?: boolean
          person_id?: string | null
          provider?: string
          read_at?: string | null
          recipient?: string | null
          sent_at?: string | null
          status?: string
          template?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "notifications_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      persons: {
        Row: {
          created_at: string
          created_by_staff: string | null
          date_of_birth: string | null
          email: string | null
          first_name: string | null
          id: string
          id_number: string | null
          last_name: string | null
          notification_channel:
            | Database["public"]["Enums"]["notification_channel"]
            | null
          onboarding_step: string
          phone: string | null
          phone_verified_at: string | null
          restricted_until: string | null
          restriction_status: Database["public"]["Enums"]["restriction_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_staff?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          id_number?: string | null
          last_name?: string | null
          notification_channel?:
            | Database["public"]["Enums"]["notification_channel"]
            | null
          onboarding_step?: string
          phone?: string | null
          phone_verified_at?: string | null
          restricted_until?: string | null
          restriction_status?: Database["public"]["Enums"]["restriction_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_staff?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          id_number?: string | null
          last_name?: string | null
          notification_channel?:
            | Database["public"]["Enums"]["notification_channel"]
            | null
          onboarding_step?: string
          phone?: string | null
          phone_verified_at?: string | null
          restricted_until?: string | null
          restriction_status?: Database["public"]["Enums"]["restriction_status"]
          updated_at?: string
        }
        Relationships: []
      }
      registration_phone_proofs: {
        Row: {
          consumed_by: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          consumed_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          consumed_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      requests: {
        Row: {
          adults: number
          children_ages: number[]
          created_at: string
          guest_id: string
          id: string
          party_type: Database["public"]["Enums"]["party_type"]
          shabbat_date: string
          status: Database["public"]["Enums"]["request_status"]
          unit: Database["public"]["Enums"]["hosting_unit"]
          updated_at: string
          with_lodging: boolean
        }
        Insert: {
          adults?: number
          children_ages?: number[]
          created_at?: string
          guest_id: string
          id?: string
          party_type: Database["public"]["Enums"]["party_type"]
          shabbat_date: string
          status?: Database["public"]["Enums"]["request_status"]
          unit?: Database["public"]["Enums"]["hosting_unit"]
          updated_at?: string
          with_lodging?: boolean
        }
        Update: {
          adults?: number
          children_ages?: number[]
          created_at?: string
          guest_id?: string
          id?: string
          party_type?: Database["public"]["Enums"]["party_type"]
          shabbat_date?: string
          status?: Database["public"]["Enums"]["request_status"]
          unit?: Database["public"]["Enums"]["hosting_unit"]
          updated_at?: string
          with_lodging?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "requests_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guest_profiles"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "requests_shabbat_date_fkey"
            columns: ["shabbat_date"]
            isOneToOne: false
            referencedRelation: "shabbatot"
            referencedColumns: ["date"]
          },
        ]
      }
      responses: {
        Row: {
          answered_at: string | null
          availability_id: string
          created_at: string
          decline_note: string | null
          decline_reason: string | null
          expires_at: string
          guest_id: string
          host_id: string
          id: string
          message: string | null
          request_id: string
          status: Database["public"]["Enums"]["response_status"]
          updated_at: string
          via_invite_link: boolean
        }
        Insert: {
          answered_at?: string | null
          availability_id: string
          created_at?: string
          decline_note?: string | null
          decline_reason?: string | null
          expires_at?: string
          guest_id: string
          host_id: string
          id?: string
          message?: string | null
          request_id: string
          status?: Database["public"]["Enums"]["response_status"]
          updated_at?: string
          via_invite_link?: boolean
        }
        Update: {
          answered_at?: string | null
          availability_id?: string
          created_at?: string
          decline_note?: string | null
          decline_reason?: string | null
          expires_at?: string
          guest_id?: string
          host_id?: string
          id?: string
          message?: string | null
          request_id?: string
          status?: Database["public"]["Enums"]["response_status"]
          updated_at?: string
          via_invite_link?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "responses_availability_id_fkey"
            columns: ["availability_id"]
            isOneToOne: false
            referencedRelation: "availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guest_profiles"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "responses_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "host_profiles"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      restrictions: {
        Row: {
          appeal_decided_at: string | null
          appeal_decided_by: string | null
          appeal_status: string | null
          appeal_text: string | null
          created_at: string
          decided_by: string | null
          ends_at: string | null
          id: string
          kind: Database["public"]["Enums"]["restriction_kind"]
          lifted_at: string | null
          lifted_by: string | null
          person_id: string
          reason: string
          reply_text: string | null
          source_flag_id: string | null
          updated_at: string
        }
        Insert: {
          appeal_decided_at?: string | null
          appeal_decided_by?: string | null
          appeal_status?: string | null
          appeal_text?: string | null
          created_at?: string
          decided_by?: string | null
          ends_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["restriction_kind"]
          lifted_at?: string | null
          lifted_by?: string | null
          person_id: string
          reason: string
          reply_text?: string | null
          source_flag_id?: string | null
          updated_at?: string
        }
        Update: {
          appeal_decided_at?: string | null
          appeal_decided_by?: string | null
          appeal_status?: string | null
          appeal_text?: string | null
          created_at?: string
          decided_by?: string | null
          ends_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["restriction_kind"]
          lifted_at?: string | null
          lifted_by?: string | null
          person_id?: string
          reason?: string
          reply_text?: string | null
          source_flag_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restrictions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restrictions_source_flag_id_fkey"
            columns: ["source_flag_id"]
            isOneToOne: false
            referencedRelation: "flags"
            referencedColumns: ["id"]
          },
        ]
      }
      shabbatot: {
        Row: {
          created_at: string
          date: string
          parsha: string
          special: string | null
        }
        Insert: {
          created_at?: string
          date: string
          parsha: string
          special?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          parsha?: string
          special?: string | null
        }
        Relationships: []
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verifications: {
        Row: {
          attempts: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["verification_kind"]
          method: string | null
          note: string | null
          performed_at: string | null
          performed_by: string | null
          person_id: string
          profile_role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["verification_status"]
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["verification_kind"]
          method?: string | null
          note?: string | null
          performed_at?: string | null
          performed_by?: string | null
          person_id: string
          profile_role: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["verification_kind"]
          method?: string | null
          note?: string | null
          performed_at?: string | null
          performed_by?: string | null
          person_id?: string
          profile_role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verifications_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_staff_invitation: {
        Args: { _email: string; _user: string }
        Returns: undefined
      }
      acknowledge_guest_week: {
        Args: {
          _food: string
          _lodging: boolean
          _sensitivities: string
          _unit: Database["public"]["Enums"]["hosting_unit"]
        }
        Returns: undefined
      }
      add_host_shabbat: {
        Args: {
          _beds: number
          _date: string
          _lodging: boolean
          _seats: number
          _unit: Database["public"]["Enums"]["hosting_unit"]
        }
        Returns: string
      }
      change_host_shabbat: {
        Args: { _action: string; _id: string }
        Returns: undefined
      }
      claim_registration_phone: {
        Args: { _token_hash: string }
        Returns: undefined
      }
      contains_contact_info: { Args: { t: string }; Returns: boolean }
      expire_my_responses: { Args: never; Returns: undefined }
      guest_ready: { Args: { _uid: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      host_response_summaries: { Args: never; Returns: Json }
      invitation_before_cutoff: { Args: { _date: string }; Returns: boolean }
      invitation_eligible: {
        Args: { _availability: string; _uid: string }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_valid_il_id: { Args: { id: string }; Returns: boolean }
      list_guest_invitations: { Args: never; Returns: Json }
      request_phone_code: {
        Args: { _method: string; _phone: string }
        Returns: undefined
      }
      respond_to_invitation: {
        Args: { _availability: string; _message: string }
        Returns: string
      }
      save_guest_companions: {
        Args: { _companions: Json; _guest: string; _minors: number }
        Returns: undefined
      }
      submit_mock_identity: {
        Args: { _fail: boolean; _has_id_photo: boolean; _has_selfie: boolean }
        Returns: {
          attempts: number
          created_at: string
          person_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "identity_checks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verification_level: {
        Args: {
          _person: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: number
      }
      verify_phone_code: {
        Args: { _code: string; _phone: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "guest" | "host" | "rep" | "admin" | "demo_staff"
      availability_status: "open" | "full" | "cancelled"
      contact_method: "whatsapp" | "phone_call"
      gender: "male" | "female"
      guest_gender_pref:
        | "everyone"
        | "families_couples"
        | "women_only"
        | "men_only"
      host_approval: "pending" | "approved" | "rejected"
      hosting_status:
        | "confirmed"
        | "under_review"
        | "cancelled_guest"
        | "cancelled_host"
        | "cancelled_staff"
        | "took_place"
        | "did_not_take_place"
      hosting_unit:
        | "full_shabbat"
        | "friday_dinner"
        | "shabbat_lunch"
        | "seudah_shlishit"
      notification_channel: "whatsapp" | "sms" | "voice"
      party_type: "alone" | "couple" | "family" | "group"
      profile_status: "partial" | "pending" | "active" | "rejected"
      request_status: "active" | "closed" | "cancelled" | "expired"
      response_status:
        | "pending"
        | "accepted"
        | "declined"
        | "expired"
        | "withdrawn"
      restriction_kind: "freeze" | "suspension" | "block"
      restriction_status: "none" | "frozen" | "suspended" | "blocked"
      shabbat_familiarity: "never" | "little" | "well"
      took_place: "yes" | "no" | "partial"
      verification_kind:
        | "id"
        | "spouse_id"
        | "marriage_record"
        | "recommender"
        | "guest_provider"
        | "intro_call"
      verification_status: "pending" | "passed" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["guest", "host", "rep", "admin", "demo_staff"],
      availability_status: ["open", "full", "cancelled"],
      contact_method: ["whatsapp", "phone_call"],
      gender: ["male", "female"],
      guest_gender_pref: [
        "everyone",
        "families_couples",
        "women_only",
        "men_only",
      ],
      host_approval: ["pending", "approved", "rejected"],
      hosting_status: [
        "confirmed",
        "under_review",
        "cancelled_guest",
        "cancelled_host",
        "cancelled_staff",
        "took_place",
        "did_not_take_place",
      ],
      hosting_unit: [
        "full_shabbat",
        "friday_dinner",
        "shabbat_lunch",
        "seudah_shlishit",
      ],
      notification_channel: ["whatsapp", "sms", "voice"],
      party_type: ["alone", "couple", "family", "group"],
      profile_status: ["partial", "pending", "active", "rejected"],
      request_status: ["active", "closed", "cancelled", "expired"],
      response_status: [
        "pending",
        "accepted",
        "declined",
        "expired",
        "withdrawn",
      ],
      restriction_kind: ["freeze", "suspension", "block"],
      restriction_status: ["none", "frozen", "suspended", "blocked"],
      shabbat_familiarity: ["never", "little", "well"],
      took_place: ["yes", "no", "partial"],
      verification_kind: [
        "id",
        "spouse_id",
        "marriage_record",
        "recommender",
        "guest_provider",
        "intro_call",
      ],
      verification_status: ["pending", "passed", "failed"],
    },
  },
} as const
